import { config } from '../config.js'
import { clinic } from './clinic.js'

// The clinical clock. In demo deployments CLOCK_START_AT pins the starting instant
// and the clock advances in real time from process start; otherwise it is wall time.
// Calendar days and wall times are reckoned in the clinic's configured time zone.
const bootedAt = Date.now()
const startAt = config.CLOCK_START_AT ? Date.parse(config.CLOCK_START_AT) : null

export function now(): Date {
  return startAt === null ? new Date() : new Date(startAt + (Date.now() - bootedAt))
}

export const clockIsPinned = startAt !== null

const formatters = new Map<string, Intl.DateTimeFormat>()

function wallClock(instant: Date, timeZone: string) {
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

/** YYYY-MM-DD of the clinic calendar day containing `instant`. */
export function clinicDateKey(instant: Date, timeZone = clinic().timeZone): string {
  return wallClock(instant, timeZone).date
}

/** HH:mm clinic wall time at `instant`. */
export function clinicTime(instant: Date, timeZone = clinic().timeZone): string {
  return wallClock(instant, timeZone).time
}

/** The instant at which the clinic's wall clock reads `time` on `day`. */
export function clinicInstant(day: string, time: string, timeZone = clinic().timeZone): Date {
  const [year, month, date] = day.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wanted = Date.UTC(year, month - 1, date, hour, minute)
  const offsetAt = (instant: number) => {
    const wall = wallClock(new Date(instant), timeZone)
    const [y, mo, d] = wall.date.split('-').map(Number)
    const [h, mi] = wall.time.split(':').map(Number)
    return Date.UTC(y, mo - 1, d, h, mi) - Math.floor(instant / 60_000) * 60_000
  }
  const first = wanted - offsetAt(wanted)
  // Re-check once so instants near a DST change land on the right side.
  return new Date(wanted - offsetAt(first))
}

/** Adds whole calendar days to a YYYY-MM-DD key. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** YYYY-MM-DD of a value from a @db.Date column (stored as UTC midnight). */
export function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

/** Parses YYYY-MM-DD into the UTC-midnight Date Prisma expects for @db.Date. */
export function parseDateKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

/** Today in the clinic. */
export function todayKey(): string {
  return clinicDateKey(now())
}

export function ageOn(dateOfBirth: Date, today: string = todayKey()): number {
  const born = dateKey(dateOfBirth)
  let age = Number(today.slice(0, 4)) - Number(born.slice(0, 4))
  if (today.slice(5) < born.slice(5)) age -= 1
  return Math.max(age, 0)
}
