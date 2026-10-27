// Allowed values for every enumerated column. These mirror the unions in
// src/data/types.ts on the frontend; the initial migration installs matching
// CHECK constraints (see prisma/migrations/*_init/migration.sql).

export const SEVERITIES = ['normal', 'abnormal', 'critical'] as const
export const SEXES = ['female', 'male', 'other'] as const
// Departments are clinic reference data (Department table), not a fixed list.

export const STAFF_ROLES = ['admin', 'doctor', 'lab', 'pharmacy', 'receptionist', 'staff'] as const
export const ROLES = [...STAFF_ROLES, 'patient'] as const
export const USER_STATUSES = ['active', 'invited', 'suspended'] as const

export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const
export const APPOINTMENT_TYPES = ['OPD', 'IPD', 'Follow-up'] as const
export const APPOINTMENT_SOURCES = ['app', 'whatsapp', 'walk-in'] as const

export const TASK_STATUSES = ['open', 'in-progress', 'reverted', 'done'] as const
export const TASK_KINDS = [
  'discharge-summary',
  'med-delivery',
  'report-collection',
  'room-prep',
  'vitals-check',
] as const

export const LAB_STATUSES = ['booked', 'sample-collected', 'processing', 'completed'] as const
export const INVOICE_STATUSES = ['unpaid', 'partial', 'paid'] as const
export const DISCHARGE_STATUSES = ['draft', 'staff-verified', 'doctor-approved'] as const

export type Severity = (typeof SEVERITIES)[number]
export type Role = (typeof ROLES)[number]
export type StaffRole = (typeof STAFF_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type LabStatus = (typeof LAB_STATUSES)[number]
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export type DischargeStatus = (typeof DISCHARGE_STATUSES)[number]

/** Allowed status transitions. A status missing from a map is terminal. */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ['in-progress', 'done'],
  'in-progress': ['done'],
  done: ['reverted'],
  reverted: ['in-progress'],
}

export const LAB_TRANSITIONS: Record<LabStatus, LabStatus[]> = {
  booked: ['sample-collected'],
  'sample-collected': ['processing'],
  processing: ['completed'],
  completed: [],
}

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  unpaid: ['partial', 'paid'],
  partial: ['paid'],
  paid: [],
}

export const DISCHARGE_TRANSITIONS: Record<DischargeStatus, DischargeStatus[]> = {
  draft: ['staff-verified'],
  'staff-verified': ['doctor-approved'],
  'doctor-approved': [],
}

/**
 * Flags a set of vitals. Thresholds follow common adult early-warning cut-offs;
 * the most severe matching reading wins.
 */
export function classifyVitals(v: {
  systolic: number
  diastolic: number
  heartRate: number
  temperatureF: number
  spo2: number
}): Severity {
  if (
    v.spo2 < 92 ||
    v.systolic >= 160 ||
    v.systolic < 90 ||
    v.diastolic >= 100 ||
    v.heartRate >= 120 ||
    v.heartRate < 45 ||
    v.temperatureF >= 103
  ) {
    return 'critical'
  }
  if (
    v.spo2 < 95 ||
    v.systolic >= 130 ||
    v.diastolic >= 85 ||
    v.heartRate >= 100 ||
    v.heartRate < 55 ||
    v.temperatureF >= 100.4 ||
    v.temperatureF < 96
  ) {
    return 'abnormal'
  }
  return 'normal'
}
