import {
  Activity,
  Bell,
  BellRing,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  CheckCircle2,
  Droplet,
  FileText,
  FileUp,
  FlaskConical,
  Gauge,
  HeartPulse,
  IdCard,
  Lightbulb,
  Phone,
  Pill,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Thermometer,
  TriangleAlert,
  Upload,
  UserRound,
  Utensils,
  Wallet,
  Weight,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  MetricTile,
  ProgressBar,
  StatusPill,
} from '../components/ui/primitives'
import { LineChart } from '../components/ui/Chart'

import { latestVitals, patientInitials } from '../data/api'
import type { Department, DietPlan, Severity } from '../data/types'
import { clinicHour, dateKey, now, todayKey } from '../lib/clock'
import { formatCurrency, formatDateTime, formatDay, formatLongDate, formatTime } from '../lib/format'
import { useEhr } from '../state/useEhr'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'
import { SymptomCheck } from '../components/ui/SymptomCheck'
import { URGENCY_LABELS } from '../data/labels'

const vitalsLabels: Record<Severity, string> = {
  normal: 'Within range',
  abnormal: 'Borderline',
  critical: 'Needs attention',
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function dayLabel(value: string): string {
  if (value === todayKey()) return 'Today'
  if (value === dateKey(1)) return 'Tomorrow'
  return formatDay(value)
}


const quickActions: { icon: LucideIcon; label: string }[] = [
  { icon: CalendarPlus, label: 'Book appointment' },
  { icon: FileUp, label: 'Upload report' },
  { icon: FlaskConical, label: 'Book lab test' },
  { icon: ShoppingCart, label: 'Order medicine' },
  { icon: ClipboardList, label: 'View records' },
  { icon: Wallet, label: 'Pay bill' },
  { icon: Utensils, label: 'Diet plan' },
  { icon: Stethoscope, label: 'Check symptoms' },
]

export function PatientDashboard() {
  const [searchParams] = useSearchParams()
  const {
    focusedPatient: currentPatient,
    status,
    appointments,
    invoices,
    labTests,
    labCatalogue,
    vitals: allVitals,
    dietPlans,
    glucoseReadings,
    notifications: liveNotifications,
    prescriptions,
    bookAppointment,
    setAppointmentStatus,
    bookLabTest,
    uploadReport,
    orderMedicine,
    payInvoice,
    clinic,
    activeDepartments,
    healthTips,
    triageAssessments,
    submitSymptomCheck,
  } = useEhr()
  const [symptomCheckOpen, setSymptomCheckOpen] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [actionComplete, setActionComplete] = useState(false)
  const [preferredDepartment, setPreferredDepartment] = useState<Department | null>(null)

  function openAction(action: string, department?: Department) {
    if (action === 'Check symptoms') {
      setSymptomCheckOpen(true)
      return
    }
    setPreferredDepartment(department ?? null)
    setActiveAction(action)
    setActionComplete(false)
  }

  if (!currentPatient) {
    return (
      <p className="rounded-2xl border border-cyan-100 bg-white px-5 py-6 text-sm text-cyan-700" role="status">
        {status === 'loading' ? 'Loading your record…' : 'Your patient record could not be found.'}
      </p>
    )
  }

  const patientId = currentPatient.id
  const vitals = latestVitals(allVitals, patientId)
  const diet: DietPlan | undefined = dietPlans.find((plan) => plan.patientId === patientId)
  const glucose = glucoseReadings.filter((reading) => reading.patientId === patientId)
  const lastCheck = triageAssessments.find((check) => check.patientId === patientId)
  const visibleNotifications = unreadOnly
    ? liveNotifications.filter((n) => !n.read)
    : liveNotifications

  const currentPatientAppointments = appointments.filter((a) => a.patientId === patientId)
  const currentPatientLabs = labTests.filter((l) => l.patientId === patientId)
  const currentPatientPrescriptions = prescriptions.filter((p) => p.patientId === patientId)
  const upcoming = currentPatientAppointments
    .filter((a) => a.status === 'confirmed' || a.status === 'pending')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  const completed = currentPatientAppointments.filter((a) => a.status === 'completed')

  const patientMedicines = currentPatientPrescriptions.flatMap((p) => p.medicines)
  const orderable = currentPatientPrescriptions.flatMap((p) =>
    p.medicines.filter((m) => !m.ordered).map((m) => ({ prescriptionId: p.id, medicine: m })),
  )
  const orderableMedicines = orderable.length
  const outstandingInvoices = invoices.filter((i) => i.patientId === patientId && i.status !== 'paid')
  const latestHbA1c = currentPatientLabs.find((l) => l.testName === 'HbA1c' && l.result)
  const hba1cValue = latestHbA1c ? Number.parseFloat(latestHbA1c.result ?? '') : Number.NaN

  async function completeAction(action: string, values: Record<string, string> = {}): Promise<boolean> {
    let saved: unknown = true
    if (action === 'Book appointment') {
      const department = (values.department as Department) || currentPatient!.department
      const previous = currentPatientAppointments.find((a) => a.department === department && a.doctorId)
      saved = await bookAppointment({
        department,
        doctor: previous?.doctor,
        doctorId: previous?.doctorId ?? undefined,
        date: values.date || dateKey(1),
        time: values.time,
        type: previous ? 'Follow-up' : 'OPD',
        reason: values.reason || `Patient-requested ${department} appointment`,
      })
    } else if (action === 'Book lab test') {
      const item = labCatalogue.find((test) => test.id === values.test) ?? labCatalogue[0]
      saved = item ? await bookLabTest({ catalogueItemId: item.id }) : null
    } else if (action === 'Upload report') {
      saved = await uploadReport({ fileName: values.file || 'Uploaded report', note: values.note || undefined })
    } else if (action === 'Order medicine') {
      const [prescriptionId, medicineId] = (values.medicine || '').split(':')
      saved = prescriptionId && medicineId ? await orderMedicine(prescriptionId, medicineId) : null
    } else if (action === 'Pay bill') {
      saved = values.invoice && values.method ? await payInvoice(values.invoice, 'paid', values.method) : null
    }
    if (saved === null) return false
    setActionComplete(true)
    return true
  }

  const vitalRows: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Gauge, label: 'Blood pressure', value: vitals ? vitals.bloodPressure : '—' },
    { icon: HeartPulse, label: 'Heart rate', value: vitals ? `${vitals.heartRate} bpm` : '—' },
    { icon: Activity, label: 'SpO₂', value: vitals ? `${vitals.spo2}%` : '—' },
    { icon: Thermometer, label: 'Temperature', value: vitals ? `${vitals.temperatureF} °F` : '—' },
    { icon: Weight, label: 'Weight', value: vitals ? `${vitals.weightKg} kg` : '—' },
  ]

  const profileTiles: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Droplet, label: 'Blood group', value: currentPatient.bloodGroup },
    { icon: IdCard, label: 'Age', value: `${currentPatient.age} yrs` },
    { icon: UserRound, label: 'Sex', value: currentPatient.sex },
    {
      icon: CalendarClock,
      label: 'Last visit',
      value: formatDay(currentPatient.lastVisit),
    },
  ]

  const requestedView = searchParams.get('view') ?? 'health'
  if (requestedView !== 'health') {
    const viewContent = {
      appointments: {
        title: 'Appointments',
        description: 'Review visits, booking requests and upcoming care without the rest of the dashboard competing for attention.',
        icon: CalendarClock,
        metrics: [
          { label: 'Upcoming visits', value: upcoming.length, hint: 'Confirmed or pending' },
          { label: 'Completed visits', value: completed.length, hint: 'Recent care history' },
        ],
        rows: upcoming.slice(0, 6).map((item) => ({ label: item.doctor, value: `${dayLabel(item.date)} · ${formatTime(item.time)}`, detail: `${item.department} · ${item.type}`, status: item.status })),
        actionLabel: 'Book appointment',
      },
      reports: {
        title: 'Reports',
        description: 'Keep diagnostic results and uploaded documents together for a clearer care conversation.',
        icon: FileText,
        metrics: [
          { label: 'Available reports', value: currentPatientLabs.length, hint: 'Stored in your record' },
          { label: 'New results', value: currentPatientLabs.filter((item) => item.isNew).length, hint: 'Ready to review' },
        ],
        rows: currentPatientLabs.slice(0, 6).map((item) => ({ label: item.testName, value: item.result ?? 'Processing', detail: item.category, status: item.status })),
        actionLabel: 'Upload report',
      },
      medicines: {
        title: 'Medicines',
        description: 'See active prescriptions, order status and refill needs in one calm workspace.',
        icon: Pill,
        metrics: [
          { label: 'Active medicines', value: patientMedicines.length, hint: 'Across prescriptions' },
          { label: 'Ready to order', value: orderableMedicines, hint: 'Can be sent to pharmacy' },
        ],
        rows: patientMedicines.slice(0, 6).map((item) => ({ label: item.name, value: item.ordered ? 'Ordered' : 'Ready to order', detail: item.dosage, status: item.ordered ? 'Fulfilment started' : 'Action needed' })),
        actionLabel: 'Order medicine',
      },
    }[requestedView as 'appointments' | 'reports' | 'medicines']

    if (viewContent) {
      return (
        <>
          <FocusedPortalView {...viewContent} onAction={() => openAction(viewContent.actionLabel)} />
          {activeAction ? (
            <ActionModal
              action={activeAction}
              complete={actionComplete}
              options={modalOptions()}
              onClose={() => setActiveAction(null)}
              onComplete={(values) => completeAction(activeAction, values)}
            />
          ) : null}
        </>
      )
    }
  }

  return (
    <>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="card-shadow relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b5044] text-white">
          <span
            className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-between gap-6 px-6 py-7 sm:px-8 sm:py-8">
            <div className="min-w-0">
              <p className="tabular text-sm font-medium text-cyan-200">
                {formatLongDate(now())}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {greetingFor(clinicHour(now()))}, {currentPatient.name.split(' ')[0]}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-cyan-100 sm:text-base">
                Here is your health at a glance — appointments, reports, medicines and your care
                plan in one place.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openAction('Book appointment')}>
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Book appointment
                </Button>
                <Button variant="secondary" onClick={() => openAction('Upload report')}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Upload report
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Next appointment"
            value={upcoming[0] ? formatTime(upcoming[0].time) : '—'}
            hint={
              upcoming[0]
                ? `${upcoming[0].doctor} · ${upcoming[0].department}`
                : 'Book to get started'
            }
            icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
          />
          <MetricTile
            label="Active prescriptions"
            value={currentPatientPrescriptions.length}
            hint={`${patientMedicines.length} medicines · ${orderableMedicines} to order`}
            icon={<Pill className="h-5 w-5" aria-hidden="true" />}
          />
          <MetricTile
            label="New reports"
            value={currentPatientLabs.filter((l) => l.isNew).length}
            hint="Awaiting your review"
            severity={currentPatientLabs.some((l) => l.isNew) ? 'abnormal' : 'normal'}
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          />
          <MetricTile
            label="Unread reminders"
            value={liveNotifications.filter((n) => !n.read).length}
            hint="Appointments, refills, results"
            severity={liveNotifications.some((n) => !n.read) ? 'abnormal' : 'normal'}
            icon={<Bell className="h-5 w-5" aria-hidden="true" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader
              title="Upcoming appointments"
              description="Your next confirmed visits"
              icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
            />
            <div className="flex-1">
              {upcoming.length === 0 ? (
                <p className="px-5 py-6 text-sm text-cyan-700">
                  No upcoming appointments. Book one to get started.
                </p>
              ) : (
                <ul className="divide-y divide-cyan-100">
                  {upcoming.slice(0, 3).map((a) => {
                    return (
                      <li
                        key={a.id}
                        className="flex items-start justify-between gap-3 px-5 py-4 transition-colors duration-200 hover:bg-cyan-50/60"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                            <CalendarClock className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-cyan-950">{a.doctor}</p>
                            <p className="text-sm text-cyan-700">
                              {a.department} · {a.type}
                            </p>
                            <p className="text-xs text-cyan-700">{a.reason}</p>
                            <p className="tabular mt-0.5 text-xs text-cyan-600">
                              {dayLabel(a.date)} · {formatTime(a.time)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge>{a.status}</Badge>
                          <button
                            type="button"
                            onClick={() => void setAppointmentStatus(a.id, 'cancelled')}
                            className="cursor-pointer text-xs font-semibold text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {completed.length > 0 ? (
                <div className="border-t border-cyan-100 px-5 py-4">
                  <p className="text-xs font-semibold tracking-wide text-cyan-700 uppercase">
                    Recent visits
                  </p>
                  <ul className="mt-2 space-y-2">
                    {completed.slice(0, 3).map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-cyan-100 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                            <CalendarClock className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-cyan-950">
                              {a.doctor}
                            </p>
                            <p className="truncate text-xs text-cyan-700">
                              {a.department} · {a.reason}
                            </p>
                          </div>
                        </div>
                        <span className="tabular shrink-0 text-xs text-cyan-600">
                          {formatDay(a.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <p className="mt-auto border-t border-cyan-100 px-5 py-3 text-xs text-cyan-700">
              {upcoming.length} upcoming · {completed.length} completed
            </p>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader
              title="Quick actions"
              description="Everyday tasks in one tap"
              icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
            />
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => openAction(label)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-cyan-200/70 bg-cyan-50/40 px-3 py-3 text-left text-sm font-semibold text-cyan-800 transition-colors duration-200 hover:border-cyan-400 hover:bg-cyan-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-700 ring-1 ring-cyan-100">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 leading-snug">{label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 border-t border-cyan-100 pt-4">
                <p className="text-sm font-semibold text-cyan-900">Symptom check</p>
                <p className="mt-1 text-xs text-cyan-700">
                  Answer a few questions about what you are feeling and get advice on how soon to be seen.
                </p>
                <Button variant="primary" className="mt-3" onClick={() => setSymptomCheckOpen(true)}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Start symptom check
                </Button>
                {lastCheck ? (
                  <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-cyan-600">Last check · {formatDateTime(lastCheck.createdAt)}</p>
                      <StatusPill tone={URGENCY_LABELS[lastCheck.urgency].tone}>
                        {URGENCY_LABELS[lastCheck.urgency].label}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-cyan-950">{lastCheck.answers.chiefComplaint}</p>
                    <p className="mt-1 text-xs text-cyan-700">{lastCheck.patientAdvice}</p>
                    {lastCheck.reviewedBy ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">Reviewed by {lastCheck.reviewedBy}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader
              title="Health summary"
              description={diet?.goal ?? 'Your care plan at a glance'}
              icon={<Activity className="h-5 w-5" aria-hidden="true" />}
            />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill severity={vitals?.severity ?? 'normal'}>
                  {vitalsLabels[vitals?.severity ?? 'normal']}
                </StatusPill>
                <span className="text-xs text-cyan-700">
                  Latest vitals by {vitals?.recordedBy ?? '—'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {vitalRows.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-3 py-2.5"
                  >
                    <p className="flex items-center gap-1.5 text-xs font-medium text-cyan-600">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {label}
                    </p>
                    <p className="tabular mt-1 font-semibold text-cyan-950">{value}</p>
                  </div>
                ))}
              </div>

              {Number.isFinite(hba1cValue) ? (
                <div className="mt-5">
                  <ProgressBar
                    value={hba1cValue}
                    max={10}
                    label={`HbA1c ${hba1cValue}% against the 10% ceiling`}
                    severity={hba1cValue >= 6.5 ? 'abnormal' : 'normal'}
                  />
                </div>
              ) : null}
            </div>

            {glucose.length > 0 ? (
              <>
                <div className="border-t border-cyan-100 px-5 pt-4">
                  <p className="text-sm font-semibold text-cyan-900">Fasting glucose trend</p>
                  <p className="text-xs text-cyan-700">Across your last {glucose.length} readings</p>
                </div>
                <LineChart
                  title={`Fasting glucose in mg/dL over the last ${glucose.length} readings`}
                  unit=" mg/dL"
                  data={glucose.map((reading) => ({
                    label: formatDay(reading.date),
                    value: reading.value,
                  }))}
                />
              </>
            ) : null}
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader
              title="Recent records"
              description="Latest reports and prescriptions"
              icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
            />
            <div className="flex-1 space-y-5 p-5">
              <div>
                <p className="text-xs font-semibold tracking-wide text-cyan-700 uppercase">
                  Reports
                </p>
                <ul className="mt-2 space-y-2">
                  {currentPatientLabs.slice(0, 3).map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-cyan-100 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-cyan-950">
                          {l.testName}
                        </p>
                        <p className="text-xs text-cyan-700">{l.category}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {l.isNew ? <Badge tone="brand">New</Badge> : null}
                        {l.result ? (
                          <span className="max-w-40 truncate text-xs text-cyan-800">
                            {l.result}
                          </span>
                        ) : (
                          <StatusPill severity="abnormal">{l.status}</StatusPill>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-cyan-700 uppercase">
                  Prescriptions
                </p>
                <ul className="mt-2 space-y-2">
                  {currentPatientPrescriptions
                    .flatMap((p) => p.medicines.map((m) => ({ ...m, doctor: p.doctor })))
                    .slice(0, 3)
                    .map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-cyan-100 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                            <Pill className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-cyan-950">
                              {m.name}
                            </p>
                            <p className="text-xs text-cyan-700">
                              {m.dosage} · {m.frequency}
                            </p>
                          </div>
                        </div>
                        {m.ordered ? (
                          <StatusPill severity="normal">Ordered</StatusPill>
                        ) : (
                          <Badge>Pending</Badge>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAction('View records')}
              className="mt-auto flex cursor-pointer items-center justify-center gap-2 border-t border-cyan-100 px-5 py-3 text-sm font-semibold text-cyan-700 transition-colors duration-200 hover:bg-cyan-50"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              View full record history
            </button>
          </Card>
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        <Card>
          <div className="relative overflow-hidden bg-[#0b5044] px-5 py-6 text-white">
            <span
              className="pointer-events-none absolute -top-14 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-4">
              <span className="shrink-0 rounded-full ring-4 ring-white/20">
                <Avatar
                  initials={patientInitials(currentPatient.name)}
                  name={currentPatient.name}
                  size="lg"
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{currentPatient.name}</p>
                <p className="tabular text-xs text-cyan-200">{currentPatient.mrn}</p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-200">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {currentPatient.age} yrs · {currentPatient.sex}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <dl className="grid grid-cols-2 gap-3">
              {profileTiles.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl bg-cyan-50 px-3 py-2.5 ring-1 ring-cyan-100"
                >
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-cyan-600">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="tabular mt-1 font-semibold text-cyan-950 capitalize">{value}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-xl bg-cyan-50 px-3 py-2.5 ring-1 ring-cyan-100">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-cyan-600">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  Phone
                </dt>
                <dd className="tabular mt-1 font-semibold text-cyan-950">
                  {currentPatient.phone}
                </dd>
              </div>
            </dl>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-cyan-700 uppercase">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                Conditions
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentPatient.conditions.map((c) => (
                  <Badge key={c}>{c}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-cyan-700 uppercase">
                <TriangleAlert className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                Allergies
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentPatient.allergies.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-600/25 ring-inset"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming reminders"
            icon={<BellRing className="h-5 w-5" aria-hidden="true" />}
            action={
              <label className="flex cursor-pointer items-center gap-2 text-xs text-cyan-800">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-cyan-400 accent-cyan-700"
                />
                Unread
              </label>
            }
          />
          {visibleNotifications.length === 0 ? (
            <p className="px-5 py-6 text-sm text-cyan-700">You are all caught up.</p>
          ) : (
            <ul className="divide-y divide-cyan-100">
              {visibleNotifications.slice(0, 4).map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-cyan-950">{n.title}</p>
                    <p className="text-xs text-cyan-700">{n.body}</p>
                    <p className="tabular mt-1 text-[11px] text-cyan-600">
                      {formatDateTime(n.at)}
                    </p>
                  </div>
                  {n.read ? null : (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                      aria-label="Unread"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {healthTips.length ? (
          <Card className="flex flex-1 flex-col bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader
              title="Health tips for you"
              description={
                healthTips.some((tip) => tip.matchedCondition)
                  ? 'Chosen for the conditions on your record'
                  : 'General advice for staying well'
              }
              icon={<Lightbulb className="h-5 w-5" aria-hidden="true" />}
              action={
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  {healthTips[0].category}
                </span>
              }
            />
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-100">
                <p className="font-semibold text-cyan-950">{healthTips[0].title}</p>
                <p className="mt-1 text-sm text-cyan-700">{healthTips[0].body}</p>
                {healthTips[0].matchedCondition ? (
                  <p className="mt-2 text-xs font-medium text-emerald-700">For your {healthTips[0].matchedCondition}</p>
                ) : null}
              </div>
              <ul className="mt-auto space-y-1.5">
                {healthTips.slice(1).map((tip) => (
                  <li key={tip.id} className="flex items-start gap-2.5 rounded-lg px-1 py-1.5">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cyan-900">{tip.title}</p>
                      <p className="text-xs text-cyan-700">{tip.body}</p>
                      {tip.matchedCondition ? (
                        <p className="mt-0.5 text-[11px] font-medium text-emerald-700">For your {tip.matchedCondition}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ) : null}
      </aside>
    </div>
    {activeAction ? (
      <ActionModal
        action={activeAction}
        complete={actionComplete}
        options={modalOptions()}
        onClose={() => setActiveAction(null)}
        onComplete={(values) => completeAction(activeAction, values)}
      />
    ) : null}
    {symptomCheckOpen ? (
      <SymptomCheck
        emergencyNumber={clinic?.emergencyNumber ?? ''}
        onSubmit={(answers) => submitSymptomCheck(answers)}
        onBook={(department) => {
          setSymptomCheckOpen(false)
          openAction('Book appointment', department)
        }}
        onClose={() => setSymptomCheckOpen(false)}
      />
    ) : null}
    </>
  )

  function modalOptions(): ModalOptions {
    return {
      departments: activeDepartments,
      defaultDepartment: preferredDepartment ?? currentPatient!.department,
      appointmentSlots: clinic?.appointmentSlots ?? [],
      paymentMethods: clinic?.paymentMethods ?? [],
      tests: labCatalogue
        .filter((test) => test.active)
        .map((test) => ({ value: test.id, label: `${test.name} · ${formatCurrency(test.price)}` })),
      medicines: orderable.map(({ prescriptionId, medicine }) => ({
        value: `${prescriptionId}:${medicine.id}`,
        label: `${medicine.name} ${medicine.dosage}`,
      })),
      invoices: outstandingInvoices.map((invoice) => ({
        value: invoice.id,
        label: `${invoice.description ?? invoice.id} · ${formatCurrency(invoice.amount)}`,
      })),
      diet,
      records: [
        currentPatientLabs[0] ? `${currentPatientLabs[0].testName}: ${currentPatientLabs[0].result ?? 'in progress'}` : null,
        currentPatientPrescriptions[0]
          ? `Prescription from ${currentPatientPrescriptions[0].doctor}: ${currentPatientPrescriptions[0].medicines.map((m) => m.name).join(', ')}`
          : null,
        completed[0] ? `Visit with ${completed[0].doctor} on ${formatDay(completed[0].date)}` : null,
      ].filter((record): record is string => Boolean(record)),
    }
  }
}

interface ModalOptions {
  departments: Department[]
  defaultDepartment: Department
  appointmentSlots: string[]
  paymentMethods: string[]
  tests: { value: string; label: string }[]
  medicines: { value: string; label: string }[]
  invoices: { value: string; label: string }[]
  diet: DietPlan | undefined
  records: string[]
}

const selectClass =
  'mt-2 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 text-sm font-normal text-cyan-900'

function ActionModal({
  action,
  complete,
  options,
  onClose,
  onComplete,
}: {
  action: string
  complete: boolean
  options: ModalOptions
  onClose: () => void
  onComplete: (values: Record<string, string>) => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)
  const isUpload = action === 'Upload report'
  const isRecords = action === 'View records'
  const isDiet = action === 'Diet plan'
  const isAppointment = action === 'Book appointment'
  const isLab = action === 'Book lab test'
  const isMedicine = action === 'Order medicine'
  const isBill = action === 'Pay bill'
  const nothingToDo =
    (isMedicine && options.medicines.length === 0) ||
    (isBill && options.invoices.length === 0) ||
    (isLab && options.tests.length === 0)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values: Record<string, string> = {}
    new FormData(event.currentTarget).forEach((value, key) => {
      values[key] = typeof value === 'string' ? value.trim() : value.name
    })
    setBusy(true)
    try {
      await onComplete(values)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-cyan-950/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-title"
        className="w-full max-w-lg rounded-3xl border border-white bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-cyan-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-500 uppercase">Patient workspace</p>
            <h2 id="action-title" className="mt-1 text-xl font-bold text-cyan-950">{complete ? 'Request saved' : action}</h2>
            <p className="mt-1 text-sm text-cyan-700">
              {isRecords || isDiet ? 'From your Medora record.' : 'Your request is saved and shared with the care team.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-semibold text-cyan-600 hover:bg-cyan-50">Close</button>
        </div>
        <div className="p-5">
          {complete ? (
            <div className="rounded-2xl bg-emerald-50 p-6 text-center text-emerald-800" role="status">
              <CheckCircle2 className="mx-auto h-8 w-8" aria-hidden="true" />
              <p className="mt-2 font-semibold">Request completed</p>
              <p className="mt-1 text-sm">Your update is now visible to the care team.</p>
            </div>
          ) : isRecords ? (
            <div className="space-y-2">
              {options.records.length === 0 ? (
                <p className="text-sm text-cyan-700">No records yet.</p>
              ) : (
                options.records.map((record) => (
                  <div key={record} className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-3 text-sm font-semibold text-cyan-900">
                    {record}
                  </div>
                ))
              )}
            </div>
          ) : isDiet ? (
            options.diet ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-900">{options.diet.goal}</p>
                  <p className="mt-1 text-sm text-emerald-700">{options.diet.dailyCalories} kcal daily target</p>
                </div>
                {options.diet.entries.map((entry) => (
                  <div key={entry.meal} className="flex items-center justify-between rounded-xl border border-cyan-100 px-4 py-3">
                    <span className="font-semibold text-cyan-900">{entry.meal}</span>
                    <span className="max-w-[65%] text-right text-sm text-cyan-700">{entry.items}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-cyan-700">Your care team has not set a diet plan yet.</p>
            )
          ) : nothingToDo ? (
            <p className="rounded-xl bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
              {isMedicine ? 'Every prescribed medicine has already been ordered.' : isBill ? 'You have no outstanding invoices.' : 'No tests are bookable right now.'}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {isAppointment ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-cyan-900">
                      Department
                      <select
                        name="department"
                        defaultValue={options.departments.includes(options.defaultDepartment) ? options.defaultDepartment : undefined}
                        className={selectClass}
                      >
                        {options.departments.map((department) => (
                          <option key={department}>{department}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-cyan-900">
                      Date
                      <input name="date" type="date" required min={todayKey()} defaultValue={dateKey(1)} className={selectClass} />
                    </label>
                  </div>
                  <label className="block text-sm font-semibold text-cyan-900">
                    Preferred time
                    <select name="time" required className={selectClass}>
                      {options.appointmentSlots.map((slot) => (
                        <option key={slot} value={slot}>{formatTime(slot)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-cyan-900">
                    Reason for visit
                    <input name="reason" required maxLength={300} placeholder="e.g. Review my glucose readings" className={selectClass} />
                  </label>
                </>
              ) : isLab ? (
                <label className="block text-sm font-semibold text-cyan-900">
                  Test
                  <select name="test" className={selectClass}>
                    {options.tests.map((test) => (
                      <option key={test.value} value={test.value}>{test.label}</option>
                    ))}
                  </select>
                </label>
              ) : isMedicine ? (
                <label className="block text-sm font-semibold text-cyan-900">
                  Medicine
                  <select name="medicine" className={selectClass}>
                    {options.medicines.map((medicine) => (
                      <option key={medicine.value} value={medicine.value}>{medicine.label}</option>
                    ))}
                  </select>
                </label>
              ) : isBill ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-cyan-900">
                    Invoice
                    <select name="invoice" className={selectClass}>
                      {options.invoices.map((invoice) => (
                        <option key={invoice.value} value={invoice.value}>{invoice.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-cyan-900">
                    Payment method
                    <select name="method" required className={selectClass}>
                      {options.paymentMethods.map((method) => (
                        <option key={method}>{method}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <label className="block text-sm font-semibold text-cyan-900">
                  {isUpload ? 'Choose a report file' : 'Details'}
                  {isUpload ? (
                    <>
                      <input
                        name="file"
                        type="file"
                        required
                        className="mt-2 block w-full rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 text-sm text-cyan-700"
                      />
                      <textarea name="note" maxLength={500} placeholder="Optional note for your care team" className="mt-3 min-h-20 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 text-sm font-normal text-cyan-900 outline-none focus:border-cyan-500" />
                    </>
                  ) : (
                    <textarea name="message" required placeholder="Add a note for your request" className="mt-2 min-h-24 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 text-sm font-normal text-cyan-900 outline-none focus:border-cyan-500" />
                  )}
                </label>
              )}
              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy ? 'Saving…' : `Confirm ${action.toLowerCase()}`}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
