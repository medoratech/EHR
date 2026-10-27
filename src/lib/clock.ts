import { clinicTimeZone } from './clinic'

// The clinical clock, synchronised with the API on start-up. Demo deployments pin the
// server clock to a fixed starting instant; this keeps the browser on the same time
// so "today", greetings and expiry countdowns match the records. Calendar days and
// wall times are reckoned in the clinic's configured time zone.

let offsetMs = 0

export function syncClock(serverNowIso: string) {
  offsetMs = Date.parse(serverNowIso) - Date.now()
}

export function now(): Date {
  return new Date(Date.now() + offsetMs)
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function wallClock(instant: Date, timeZone = clinicTimeZone()) {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, format)
  }
  const parts = Object.fromEntries(format.formatToParts(instant).map((part) => [part.type, part.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

/** YYYY-MM-DD of the clinic day containing `instant`. */
export function clinicDateKey(instant: Date): string {
  return wallClock(instant).date
}

/** Adds whole calendar days to a YYYY-MM-DD key. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** YYYY-MM-DD for the clinic day `offsetDays` from today. */
export function dateKey(offsetDays = 0): string {
  return addDays(clinicDateKey(now()), offsetDays)
}

export function todayKey(): string {
  return dateKey(0)
}

/** Clinic wall time as HH:mm. */
export function timeOfDay(): string {
  return wallClock(now()).time
}

/** Minutes since clinic midnight. */
export function minutesOfDay(): number {
  const [hours, minutes] = timeOfDay().split(':').map(Number)
  return hours * 60 + minutes
}

/** Clinic hour (0–23) at an instant. */
export function clinicHour(instant: Date | string): number {
  return Number(wallClock(new Date(instant)).time.slice(0, 2))
}

/** The instant at which the clinic's wall clock reads `time` on `day` (both clinic-local). */
export function clinicInstant(day: string, time: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wanted = Date.UTC(year, month - 1, date, hour, minute)
  const offsetAt = (instant: number) => {
    const wall = wallClock(new Date(instant))
    const [y, mo, d] = wall.date.split('-').map(Number)
    const [h, mi] = wall.time.split(':').map(Number)
    return Date.UTC(y, mo - 1, d, h, mi) - Math.floor(instant / 60_000) * 60_000
  }
  const first = wanted - offsetAt(wanted)
  return new Date(wanted - offsetAt(first))
}
