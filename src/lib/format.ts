import { clinicConfig, clinicLocale, clinicTimeZone } from './clinic'

// Display formatting in the clinic's locale, currency and time zone (GET /api/clinic).

const isDateOnly = (value: string | Date): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/** Date-only values are calendar days, so render them in UTC to avoid shifting the day. */
function formatIn(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  const timeZone = isDateOnly(value) ? 'UTC' : clinicTimeZone()
  const date = isDateOnly(value) ? new Date(`${value}T00:00:00Z`) : new Date(value)
  return new Intl.DateTimeFormat(clinicLocale(), { ...options, timeZone }).format(date)
}

export function formatCurrency(value: number, decimals: 0 | 2 = 2): string {
  const currency = clinicConfig()?.currency
  return new Intl.NumberFormat(clinicLocale(), {
    ...(currency ? { style: 'currency', currency } : {}),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(value: string | Date): string {
  return formatIn(value, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | Date): string {
  return formatIn(value, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDay(value: string | Date): string {
  return formatIn(value, { day: 'numeric', month: 'short' })
}

/** e.g. "Friday 16 October", for the clinic's current day. */
export function formatLongDate(value: string | Date): string {
  return formatIn(value, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const mm = String(minutes).padStart(2, '0')
  return `${hour12}:${mm} ${period}`
}

export function humanize(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
