import {
  appointments,
  auditEvents,
  bookableTests,
  CURRENT_PATIENT_ID,
  dietPlan,
  dischargeSummaries,
  glucoseReadings,
  inventory,
  invoices,
  labTests,
  notifications,
  patients,
  prescriptions,
  problemSummaries,
  systemConfig,
  tasks,
  users,
  vitals,
  DEMO_NOW,
} from './mock'
import type { LabStatus, Patient, Severity } from './types'

export function getPatient(id: string): Patient | undefined {
  return patients.find((p) => p.id === id)
}

export function getPatientName(id: string): string {
  return getPatient(id)?.name ?? 'Unknown patient'
}

export function patientInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayKey(): string {
  return localDateKey(new Date(DEMO_NOW))
}

function toLocalKey(value: string): string {
  return value.length === 10 ? value : localDateKey(new Date(value))
}

export function appointmentsFor(date?: string): typeof appointments {
  const key = date ?? todayKey()
  return appointments.filter((a) => a.date === key)
}

export function dailyVolume<T>(
  items: T[],
  getDate: (item: T) => string,
  days = 7,
): { label: string; value: number }[] {
  const label = new Intl.DateTimeFormat('en', { weekday: 'short' })
  const today = new Date(DEMO_NOW)
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (days - 1 - index))
    const key = localDateKey(day)
    const value = items.filter((item) => toLocalKey(getDate(item)) === key).length
    return { label: label.format(day), value }
  })
}

export function latestVitals(patientId: string) {
  return vitals
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
}

export function vitalsFor(patientId: string) {
  return vitals.filter((v) => v.patientId === patientId)
}

export function labsFor(patientId: string) {
  return labTests.filter((l) => l.patientId === patientId)
}

export function prescriptionsFor(patientId: string) {
  return prescriptions.filter((p) => p.patientId === patientId)
}

export function problemSummaryFor(patientId: string) {
  return problemSummaries.find((p) => p.patientId === patientId)
}

export function tasksForPatient(patientId: string) {
  return tasks.filter((t) => t.patientId === patientId)
}

export function invoicesFor(patientId: string) {
  return invoices.filter((i) => i.patientId === patientId)
}

export const currentPatient = patients.find((p) => p.id === CURRENT_PATIENT_ID) ?? patients[0]

export const currentPatientAppointments = appointments
  .filter((a) => a.patientId === CURRENT_PATIENT_ID)
  .sort((a, b) => b.date.localeCompare(a.date))

export const currentPatientPrescriptions = prescriptionsFor(CURRENT_PATIENT_ID)
export const currentPatientLabs = labsFor(CURRENT_PATIENT_ID)
export const currentPatientDiet = dietPlan

export function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
}

export const labStatusCounts = countBy(labTests, (l) => l.status as LabStatus)
export const labCategoryCounts = countBy(labTests, (l) => l.category)
export const userRoleCounts = countBy(users, (u) => u.role)

export const newLabReports = labTests.filter((l) => l.isNew && l.reportUploaded)
export const unpaidInvoices = invoices.filter((i) => i.status !== 'paid')
export const pendingAppointments = appointments.filter((a) => a.status === 'pending')
export const openTasks = tasks.filter((t) => t.status !== 'done')
export const draftDischarges = dischargeSummaries.filter((d) => d.status !== 'doctor-approved')

export const revenueCollected = invoices
  .filter((i) => i.status === 'paid')
  .reduce((sum, i) => sum + i.amount, 0)

export const revenueOutstanding = unpaidInvoices.reduce((sum, i) => sum + i.amount, 0)

export function severityRank(s: Severity): number {
  return s === 'critical' ? 0 : s === 'abnormal' ? 1 : 2
}

export const consultationVolume = dailyVolume(
  appointments.filter((a) => a.status === 'completed'),
  (a) => a.date,
)

export const recordVolume = dailyVolume(
  [
    ...appointments.map((a) => a.date),
    ...labTests.map((l) => l.orderedAt),
    ...prescriptions.map((p) => p.issuedAt),
    ...invoices.map((i) => i.issuedAt),
    ...vitals.map((v) => v.recordedAt),
  ],
  (d) => d,
)

export const currentPatientGlucose = glucoseReadings

export const testsForBooking = bookableTests
export {
  appointments,
  auditEvents,
  dischargeSummaries,
  glucoseReadings,
  inventory,
  invoices,
  labTests,
  notifications,
  patients,
  prescriptions,
  systemConfig,
  tasks,
  users,
  vitals,
}
export type { LabStatus }
