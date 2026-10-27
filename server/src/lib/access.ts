import { STAFF_ROLES, type Role, type StaffRole } from '../domain.js'
import { forbidden } from './errors.js'

/** The authenticated caller, loaded fresh from the database on every request. */
export interface Actor {
  id: string
  name: string
  email: string
  role: Role
  patientId: string | null
}

export function isStaff(actor: Actor): boolean {
  return (STAFF_ROLES as readonly string[]).includes(actor.role)
}

/** Throws 403 unless the caller holds one of the given roles. */
export function requireRole(actor: Actor, roles: readonly Role[]): void {
  if (!roles.includes(actor.role)) throw forbidden()
}

export function requireStaff(actor: Actor): void {
  if (!isStaff(actor)) throw forbidden()
}

/**
 * Prisma `where` fragment restricting a patient-owned collection to what the caller
 * may read: everything for staff, only their own chart for a patient.
 */
export function patientScope(actor: Actor): { patientId?: string } {
  if (isStaff(actor)) return {}
  return { patientId: actor.patientId ?? '__none__' }
}

/** Throws 403 when a patient reaches for another patient's chart. */
export function assertCanAccessPatient(actor: Actor, patientId: string): void {
  if (isStaff(actor)) return
  if (actor.patientId !== patientId) throw forbidden('You can only access your own record.')
}

export const ALL_STAFF: readonly StaffRole[] = STAFF_ROLES

/** Landing route for each role, mirrored by the frontend router. */
export const HOME_ROUTE: Record<Role, string> = {
  admin: '/admin',
  doctor: '/doctor',
  lab: '/laboratory',
  pharmacy: '/pharmacy',
  receptionist: '/reception',
  staff: '/staff',
  patient: '/patient',
}
