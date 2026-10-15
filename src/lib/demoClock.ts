import { DEMO_NOW } from '../data/mock'

export function demoNow(): Date {
  return new Date(DEMO_NOW)
}

export function demoNowIso(): string {
  return demoNow().toISOString()
}

export function demoDateKey(offsetDays = 0): string {
  const value = demoNow()
  value.setDate(value.getDate() + offsetDays)
  return value.toISOString().slice(0, 10)
}
