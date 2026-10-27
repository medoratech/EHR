// Pure helpers over API collections. Records themselves come from the EHR store
// (src/state/ehrStore.tsx), which loads them from the Medora API.
import { clinicLocale } from '../lib/clinic'
import { addDays, clinicDateKey, todayKey } from '../lib/clock'
import type { Patient, ProblemSummary, Severity, Vitals } from './types'

export function patientName(patients: Patient[], id: string): string {
  return patients.find((p) => p.id === id)?.name ?? 'Unknown patient'
}

export function patientInitials(name: string): string {
  return name
    .replace(/^(Dr|Nurse)\.?\s+/, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Most recent vitals for a patient, or undefined when none are recorded. */
export function latestVitals(vitals: Vitals[], patientId: string): Vitals | undefined {
  let latest: Vitals | undefined
  for (const entry of vitals) {
    if (entry.patientId === patientId && (!latest || entry.recordedAt > latest.recordedAt)) latest = entry
  }
  return latest
}

export function problemSummaryFor(summaries: ProblemSummary[], patientId: string) {
  return summaries.find((summary) => summary.patientId === patientId)
}

export function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
}

export function severityRank(s: Severity): number {
  return s === 'critical' ? 0 : s === 'abnormal' ? 1 : 2
}

/**
 * Counts items per clinic day over the last `days` days, oldest first. Accepts
 * date-only values (YYYY-MM-DD) or instants, which are placed in the clinic's day.
 */
export function dailyVolume<T>(
  items: T[],
  getDate: (item: T) => string,
  days = 7,
): { label: string; value: number }[] {
  const label = new Intl.DateTimeFormat(clinicLocale(), { weekday: 'short', timeZone: 'UTC' })
  const toDay = (value: string) => (value.length === 10 ? value : clinicDateKey(new Date(value)))
  const counts = countBy(items, (item) => toDay(getDate(item)))
  const today = todayKey()
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(today, index - (days - 1))
    return { label: label.format(new Date(`${day}T00:00:00Z`)), value: counts[day] ?? 0 }
  })
}
