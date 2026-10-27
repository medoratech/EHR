import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { patientName, severityRank } from '../data/api'
import type { ClinicConfig, Role } from '../data/types'
import { setClinicConfig } from '../lib/clinic'
import { ApiError, api, refreshSession, streamEvents } from '../lib/http'
import { toast } from '../lib/toast'
import {
  EhrContext,
  type Collections,
  type EhrActions,
  type EhrValue,
  type Resource,
} from './ehrStoreContext'
import { useAuth } from './useAuth'

const ENDPOINTS: Record<Exclude<Resource, 'clinic'>, string> = {
  patients: '/patients',
  appointments: '/appointments',
  vitals: '/vitals',
  tasks: '/tasks',
  labTests: '/lab-tests',
  labCatalogue: '/lab-catalogue',
  prescriptions: '/prescriptions',
  inventory: '/inventory',
  invoices: '/invoices',
  dischargeSummaries: '/discharge-summaries',
  problemSummaries: '/problem-summaries',
  clinicalNotes: '/clinical-notes',
  dietPlans: '/diet-plans',
  glucoseReadings: '/glucose-readings',
  users: '/users',
  auditEvents: '/audit-events',
  notifications: '/notifications',
  systemSettings: '/system/settings',
  healthTips: '/health-tips',
  triageAssessments: '/triage-assessments',
}

const STAFF: Role[] = ['admin', 'doctor', 'lab', 'pharmacy', 'receptionist', 'staff']

/** Collections a role may read. Mirrors the API's checks so we never request a 403. */
const READERS: Partial<Record<Resource, Role[]>> = {
  tasks: STAFF,
  inventory: STAFF,
  users: STAFF,
  systemSettings: STAFF,
  clinicalNotes: ['doctor', 'staff', 'admin'],
  auditEvents: ['admin'],
  healthTips: ['patient'],
  triageAssessments: ['patient', 'doctor', 'staff', 'admin'],
}

const COLLECTIONS = Object.keys(ENDPOINTS) as Exclude<Resource, 'clinic'>[]
const RESOURCES: Resource[] = [...COLLECTIONS, 'clinic']

function emptyCollections(): Collections {
  return Object.fromEntries(COLLECTIONS.map((resource) => [resource, []])) as unknown as Collections
}

function readable(role: Role): Resource[] {
  return RESOURCES.filter((resource) => READERS[resource]?.includes(role) ?? true)
}

const EMPTY = emptyCollections()

const FOCUS_KEY = 'medora:focused-patient'

function readFocus(): string | null {
  try {
    return sessionStorage.getItem(FOCUS_KEY)
  } catch {
    return null
  }
}

export function EhrProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<Collections>(emptyCollections)
  const [loadState, setLoadState] = useState<{ userId: string; status: EhrValue['status'] } | null>(null)
  const [live, setLive] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(readFocus)
  const [clinic, setClinic] = useState<ClinicConfig | null>(null)

  const role = user?.role ?? null
  const allowed = useMemo(() => (role ? readable(role) : []), [role])
  const allowedRef = useRef(allowed)
  useEffect(() => {
    allowedRef.current = allowed
  }, [allowed])

  const load = useCallback(async (resources: Resource[], replace = false) => {
    const wanted = COLLECTIONS.filter((resource) => resources.includes(resource) && allowedRef.current.includes(resource))
    const [config, results] = await Promise.all([
      resources.includes('clinic') ? api.get<ClinicConfig>('/clinic').catch(() => null) : Promise.resolve(null),
      Promise.allSettled(
        wanted.map(async (resource) => [resource, await api.get<unknown[]>(ENDPOINTS[resource])] as const),
      ),
    ])
    if (config) {
      // Update the formatters and clock before React re-renders with the new settings.
      setClinicConfig(config)
      setClinic(config)
    }
    const loaded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
    if (loaded.length > 0 || replace) {
      setData((current) => ({ ...(replace ? emptyCollections() : current), ...Object.fromEntries(loaded) }))
    }
    return loaded.length === wanted.length
  }, [])

  // Initial load whenever a different user signs in.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void load(readable(user.role), true).then((ok) => {
      if (!cancelled) setLoadState({ userId: user.id, status: ok ? 'ready' : 'error' })
    })
    return () => {
      cancelled = true
    }
  }, [user, load])

  // Live change feed: coalesce bursts of events into one refetch.
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const pending = new Set<Resource>()
    let flushTimer: number | undefined
    let retryDelay = 1_000

    const schedule = (resources: Resource[]) => {
      for (const resource of resources) pending.add(resource)
      window.clearTimeout(flushTimer)
      flushTimer = window.setTimeout(() => {
        const batch = [...pending]
        pending.clear()
        void load(batch)
      }, 150)
    }

    void (async () => {
      while (!controller.signal.aborted) {
        try {
          await streamEvents((event, payload) => {
            if (event === 'ready') {
              setLive(true)
              retryDelay = 1_000
            }
            if (event === 'change') schedule((payload as { resources: Resource[] }).resources)
          }, controller.signal)
        } catch (error) {
          if (controller.signal.aborted) return
          if (error instanceof ApiError && error.status === 401 && !(await refreshSession())) return
        }
        setLive(false)
        if (controller.signal.aborted) return
        await new Promise((resolve) => window.setTimeout(resolve, retryDelay))
        retryDelay = Math.min(retryDelay * 2, 30_000)
        // Catch up on anything missed while disconnected.
        void load(allowedRef.current)
      }
    })()

    return () => {
      controller.abort()
      window.clearTimeout(flushTimer)
      setLive(false)
    }
  }, [user, load])

  const run = useCallback(
    async <T,>(work: () => Promise<T>, resources: Resource[], success?: string): Promise<T | null> => {
      try {
        const result = await work()
        void load([...resources, 'notifications', 'auditEvents'])
        if (success) toast(success, 'success')
        return result
      } catch (error) {
        toast(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.', 'error')
        return null
      }
    },
    [load],
  )

  const actions = useMemo<EhrActions>(
    () => ({
      registerPatient: (input) =>
        run(() => api.post('/patients', input), ['patients'], `${input.name} has been registered.`),
      registerWalkIn: (input) =>
        run(() => api.post('/walk-ins', input), ['patients', 'appointments'], `${input.name} is in today's queue.`),
      bookAppointment: (input) =>
        run(() => api.post('/appointments', input), ['appointments'], 'Appointment request saved.'),
      setAppointmentStatus: (id, next) =>
        run(() => api.patch(`/appointments/${id}`, { status: next }), ['appointments', 'patients'], `Appointment ${next}.`),
      recordVitals: (input) => run(() => api.post('/vitals', input), ['vitals'], 'Vitals saved to the record.'),
      createTask: (input) => run(() => api.post('/tasks', input), ['tasks'], 'Task assigned.'),
      updateTask: (id, patch) =>
        run(
          () => api.patch(`/tasks/${id}`, patch),
          ['tasks'],
          patch.assignedToId ? 'Task reassigned.' : `Task marked ${patch.status}.`,
        ),
      bookLabTest: (input) => run(() => api.post('/lab-tests', input), ['labTests'], 'Lab test booked.'),
      uploadReport: (input) =>
        run(() => api.post('/lab-tests/uploads', input), ['labTests'], 'Report shared with your care team.'),
      setLabStatus: (id, next) => run(() => api.patch(`/lab-tests/${id}`, { status: next }), ['labTests']),
      releaseLabReport: (id, result) =>
        run(() => api.post(`/lab-tests/${id}/release`, { result }), ['labTests'], 'Report released to the care team.'),
      acknowledgeLabReport: (id) =>
        run(() => api.post(`/lab-tests/${id}/acknowledge`), ['labTests'], 'Report marked as reviewed.'),
      orderMedicine: (prescriptionId, medicineId) =>
        run(
          () => api.post(`/prescriptions/${prescriptionId}/medicines/${medicineId}/order`),
          ['prescriptions'],
          'Medicine order sent to the pharmacy.',
        ),
      dispenseMedicine: (prescriptionId, medicineId) =>
        run(
          () => api.post(`/prescriptions/${prescriptionId}/medicines/${medicineId}/dispense`),
          ['prescriptions'],
          'Medicine dispensed.',
        ),
      sendRefillReminder: (prescriptionId) =>
        run(() => api.post(`/prescriptions/${prescriptionId}/refill-reminder`), [], 'Refill reminder sent.'),
      requestReorder: (itemId) =>
        run(() => api.post(`/inventory/${itemId}/reorder`), ['inventory'], 'Reorder raised.'),
      createInvoice: (input) => run(() => api.post('/invoices', input), ['invoices'], 'Invoice generated.'),
      payInvoice: (id, next, method) =>
        run(() => api.patch(`/invoices/${id}`, { status: next, method }), ['invoices'], 'Payment recorded.'),
      updateDischarge: (id, patch) =>
        run(() => api.patch(`/discharge-summaries/${id}`, patch), ['dischargeSummaries'], 'Discharge summary updated.'),
      approveProblemSummary: (patientId) =>
        run(() => api.post(`/problem-summaries/${patientId}/approve`), ['problemSummaries'], 'Summary approved.'),
      editProblemSummary: (patientId, input) =>
        run(() => api.put(`/problem-summaries/${patientId}`, input), ['problemSummaries'], 'Summary saved and signed.'),
      addClinicalNote: (patientId, body) =>
        run(() => api.post('/clinical-notes', { patientId, body }), ['clinicalNotes'], 'Note saved to the case.'),
      inviteUser: (input) => run(() => api.post('/users', input), ['users'], `${input.name} has been invited.`),
      updateUser: (id, patch) => run(() => api.patch(`/users/${id}`, patch), ['users'], 'Access updated.'),
      markNotificationRead: (id) => run(() => api.post(`/notifications/${id}/read`), ['notifications']),
      markAllNotificationsRead: () => run(() => api.post('/notifications/read-all'), ['notifications']),
      resetDemo: () => run(() => api.post('/demo/reset'), RESOURCES, 'Demo data restored.'),
      submitSymptomCheck: (input) => run(() => api.post('/triage-assessments', input), ['triageAssessments']),
      reviewSymptomCheck: (id) =>
        run(() => api.post(`/triage-assessments/${id}/review`), ['triageAssessments'], 'Symptom check marked as reviewed.'),
      updateClinic: (patch) => run(() => api.put('/clinic', patch), ['clinic'], 'Clinic settings saved.'),
      addDepartment: (name) => run(() => api.post('/departments', { name }), ['clinic'], `${name} added.`),
      updateDepartment: (name, patch) =>
        run(
          () => api.patch(`/departments/${encodeURIComponent(name)}`, patch),
          ['clinic', 'patients', 'appointments'],
          'Department updated.',
        ),
    }),
    [run],
  )

  // Until this user's first load lands, expose nothing from a previous session.
  const current = loadState?.userId === user?.id
  const visible = current ? data : EMPTY
  const status: EhrValue['status'] = current && loadState ? loadState.status : 'loading'

  const { patients } = visible
  const ownPatientId = user?.patientId ?? null
  const focusedPatient = useMemo(() => {
    if (ownPatientId) return patients.find((patient) => patient.id === ownPatientId)
    return (
      patients.find((patient) => patient.id === focusedId) ??
      [...patients].sort((a, b) => severityRank(a.risk) - severityRank(b.risk))[0]
    )
  }, [patients, focusedId, ownPatientId])

  const setFocusedPatientId = useCallback((id: string) => {
    setFocusedId(id)
    try {
      sessionStorage.setItem(FOCUS_KEY, id)
    } catch {
      // Storage may be unavailable; focus still works for this page view.
    }
  }, [])

  const activeDepartments = useMemo(
    () => (clinic?.departments ?? []).filter((department) => department.active).map((department) => department.name),
    [clinic],
  )

  const nameOf = useCallback((id: string) => patientName(patients, id), [patients])
  const reload = useCallback(async () => {
    await load(allowedRef.current)
  }, [load])

  const value = useMemo<EhrValue>(
    () => ({
      ...visible,
      ...actions,
      status,
      clinic,
      activeDepartments,
      live,
      focusedPatient,
      setFocusedPatientId,
      patientName: nameOf,
      reload,
    }),
    [visible, actions, status, clinic, activeDepartments, live, focusedPatient, setFocusedPatientId, nameOf, reload],
  )

  return <EhrContext.Provider value={value}>{children}</EhrContext.Provider>
}
