import type { ClinicConfig } from '../data/types'

// The active clinic settings, read synchronously by the clock and formatters. The EHR
// store loads them from the API and calls setClinicConfig whenever they change.
// Until then, formatting stays neutral: browser locale, UTC, no currency symbol.

let current: ClinicConfig | null = null

export function setClinicConfig(config: ClinicConfig) {
  current = config
}

export function clinicConfig(): ClinicConfig | null {
  return current
}

export function clinicTimeZone(): string {
  return current?.timeZone ?? 'UTC'
}

export function clinicLocale(): string | undefined {
  return current?.locale
}
