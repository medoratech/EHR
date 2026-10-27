import type { Clinic, PrismaClient } from '@prisma/client'
import type { Tx } from '../db.js'
import { badRequest } from './errors.js'

// Clinic-wide reference settings, cached in memory because the clock and validators
// need them synchronously. The database row is the only source: it is loaded at
// start-up, after an admin edits it, and after a demo reset. Running several API
// instances would need a shared invalidation signal.

export interface ClinicConfig {
  name: string
  currency: string
  locale: string
  timeZone: string
  appointmentSlots: string[]
  paymentMethods: string[]
  defaultClinician: string
  emergencyNumber: string
}

let current: ClinicConfig | null = null

/** The loaded settings. Throws if read before loadClinic(), which buildApp() runs first. */
export function clinic(): ClinicConfig {
  if (!current) throw new Error('Clinic settings have not been loaded yet.')
  return current
}

export function toConfig(row: Clinic): ClinicConfig {
  return {
    name: row.name,
    currency: row.currency,
    locale: row.locale,
    timeZone: row.timeZone,
    appointmentSlots: row.appointmentSlots,
    paymentMethods: row.paymentMethods,
    defaultClinician: row.defaultClinician,
    emergencyNumber: row.emergencyNumber,
  }
}

export async function loadClinic(db: PrismaClient | Tx): Promise<ClinicConfig> {
  const row = await db.clinic.findUnique({ where: { id: 1 } })
  if (!row) {
    throw new Error('The Clinic settings row is missing. Run `npm run db:deploy` to apply migrations.')
  }
  current = toConfig(row)
  return current
}

/** Throws 400 unless the department exists and accepts new records. */
export async function assertActiveDepartment(db: PrismaClient | Tx, name: string): Promise<void> {
  const department = await db.department.findUnique({ where: { name } })
  if (!department) throw badRequest(`“${name}” is not a department of this clinic.`)
  if (!department.active) throw badRequest(`${name} is not taking new patients or bookings.`)
}

/** Throws 400 unless the method is one the clinic accepts. */
export function assertPaymentMethod(method: string | null | undefined): void {
  const { paymentMethods } = clinic()
  if (method && !paymentMethods.includes(method)) {
    throw badRequest(`Choose a payment method the clinic accepts: ${paymentMethods.join(', ')}.`)
  }
}
