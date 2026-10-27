import type { Prisma } from '@prisma/client'
import { ageOn, dateKey } from './clock.js'

// Maps database rows to the JSON shapes in src/data/types.ts on the frontend.
// Money leaves the API as numbers in major units; dates-only as YYYY-MM-DD;
// instants as ISO-8601 strings.

const money = (value: Prisma.Decimal) => Number(value.toFixed(2))
const iso = (value: Date) => value.toISOString()
const isoOrNull = (value: Date | null) => (value ? value.toISOString() : null)

export function patient(row: Prisma.PatientGetPayload<object>) {
  return {
    id: row.id,
    mrn: row.mrn,
    name: row.name,
    dateOfBirth: dateKey(row.dateOfBirth),
    age: ageOn(row.dateOfBirth),
    sex: row.sex,
    phone: row.phone,
    bloodGroup: row.bloodGroup,
    conditions: row.conditions,
    allergies: row.allergies,
    lastVisit: iso(row.lastVisitAt),
    risk: row.risk,
    department: row.department,
  }
}

export function appointment(row: Prisma.AppointmentGetPayload<object>) {
  return {
    id: row.id,
    patientId: row.patientId,
    doctor: row.doctor,
    doctorId: row.doctorId,
    department: row.department,
    date: dateKey(row.date),
    time: row.time,
    type: row.type,
    status: row.status,
    source: row.source,
    reason: row.reason,
  }
}

export function vitals(row: Prisma.VitalsGetPayload<object>) {
  return {
    id: row.id,
    patientId: row.patientId,
    recordedAt: iso(row.recordedAt),
    recordedBy: row.recordedBy,
    bloodPressure: `${row.systolic}/${row.diastolic}`,
    heartRate: row.heartRate,
    temperatureF: row.temperatureF,
    spo2: row.spo2,
    weightKg: row.weightKg,
    severity: row.severity,
  }
}

export const taskInclude = {
  assignedBy: { select: { name: true } },
  assignedTo: { select: { name: true } },
} satisfies Prisma.TaskInclude

export function task(row: Prisma.TaskGetPayload<{ include: typeof taskInclude }>) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    patientId: row.patientId,
    assignedBy: row.assignedBy.name,
    assignedById: row.assignedById,
    assignedTo: row.assignedTo.name,
    assignedToId: row.assignedToId,
    due: iso(row.due),
    status: row.status,
    severity: row.severity,
  }
}

export function labTest(row: Prisma.LabTestGetPayload<object>) {
  return {
    id: row.id,
    patientId: row.patientId,
    testName: row.testName,
    category: row.category,
    price: money(row.price),
    status: row.status,
    result: row.result,
    orderedAt: iso(row.orderedAt),
    reportUploaded: row.reportUploaded,
    isNew: row.isNew,
    releasedAt: isoOrNull(row.releasedAt),
  }
}

export function labCatalogueItem(row: Prisma.LabCatalogueItemGetPayload<object>) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: money(row.price),
    turnaround: row.turnaround,
    active: row.active,
  }
}

export const prescriptionInclude = {
  doctor: { select: { name: true } },
  medicines: { orderBy: { position: 'asc' } },
} satisfies Prisma.PrescriptionInclude

export function prescription(
  row: Prisma.PrescriptionGetPayload<{ include: typeof prescriptionInclude }>,
) {
  return {
    id: row.id,
    patientId: row.patientId,
    doctor: row.doctor.name,
    doctorId: row.doctorId,
    issuedAt: iso(row.issuedAt),
    refillsLeft: row.refillsLeft,
    refillsTotal: row.refillsTotal,
    notes: row.notes,
    medicines: row.medicines.map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      durationDays: medicine.durationDays,
      ordered: medicine.ordered,
      dispensed: medicine.dispensedAt !== null,
    })),
  }
}

export function inventoryItem(row: Prisma.InventoryItemGetPayload<object>) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    stock: row.stock,
    reorderLevel: row.reorderLevel,
    expiry: dateKey(row.expiry),
    price: money(row.price),
    reorderRequestedAt: isoOrNull(row.reorderRequestedAt),
  }
}

export function invoice(row: Prisma.InvoiceGetPayload<object>) {
  return {
    id: row.id,
    patientId: row.patientId,
    amount: money(row.amount),
    status: row.status,
    description: row.description,
    issuedAt: iso(row.issuedAt),
    method: row.method,
    paidAt: isoOrNull(row.paidAt),
  }
}

export const dischargeInclude = {
  completedBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
} satisfies Prisma.DischargeSummaryInclude

export function dischargeSummary(
  row: Prisma.DischargeSummaryGetPayload<{ include: typeof dischargeInclude }>,
) {
  return {
    id: row.id,
    patientId: row.patientId,
    admissionDate: dateKey(row.admissionDate),
    dischargeDate: dateKey(row.dischargeDate),
    diagnosis: row.diagnosis,
    status: row.status,
    completedBy: row.completedBy.name,
    approvedBy: row.approvedBy?.name ?? null,
  }
}

export const problemSummaryInclude = {
  approvedBy: { select: { name: true } },
} satisfies Prisma.ProblemSummaryInclude

export function problemSummary(
  row: Prisma.ProblemSummaryGetPayload<{ include: typeof problemSummaryInclude }>,
) {
  return {
    patientId: row.patientId,
    headline: row.headline,
    issues: row.issues,
    aiGenerated: row.aiGenerated,
    approvedBy: row.approvedBy?.name ?? null,
    updatedAt: iso(row.updatedAt),
  }
}

export const noteInclude = { author: { select: { name: true } } } satisfies Prisma.ClinicalNoteInclude

export function clinicalNote(row: Prisma.ClinicalNoteGetPayload<{ include: typeof noteInclude }>) {
  return {
    id: row.id,
    patientId: row.patientId,
    author: row.author.name,
    authorId: row.authorId,
    body: row.body,
    createdAt: iso(row.createdAt),
  }
}

export function dietPlan(row: Prisma.DietPlanGetPayload<object>) {
  return {
    patientId: row.patientId,
    goal: row.goal,
    dailyCalories: row.dailyCalories,
    restrictions: row.restrictions,
    entries: row.entries as { meal: string; items: string; calories: number }[],
  }
}

export function glucoseReading(row: Prisma.GlucoseReadingGetPayload<object>) {
  return { patientId: row.patientId, date: dateKey(row.date), value: row.value }
}

export function user(row: Prisma.UserGetPayload<object>) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    status: row.status,
    lastActive: iso(row.lastActiveAt),
    patientId: row.patientId,
  }
}

export function auditEvent(row: Prisma.AuditEventGetPayload<object>) {
  return {
    id: row.id,
    actor: row.actor,
    role: row.role,
    action: row.action,
    target: row.target,
    at: iso(row.at),
    severity: row.severity,
  }
}

export function notification(row: Prisma.NotificationGetPayload<object>) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    at: iso(row.at),
    severity: row.severity,
    read: row.readAt !== null,
  }
}

export function systemSetting(row: Prisma.SystemSettingGetPayload<object>) {
  return { key: row.key, label: row.label, value: row.value }
}

export function healthTip(row: Prisma.HealthTipGetPayload<object>, matchedCondition: string | null) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    conditions: row.conditions,
    active: row.active,
    matchedCondition,
  }
}

export const triageInclude = {
  submittedBy: { select: { name: true } },
  reviewedBy: { select: { name: true } },
} satisfies Prisma.TriageAssessmentInclude

/** `clinical` adds the fields meant for the care team only. */
export function triageAssessment(
  row: Prisma.TriageAssessmentGetPayload<{ include: typeof triageInclude }>,
  clinical: boolean,
) {
  return {
    id: row.id,
    patientId: row.patientId,
    answers: row.answers as Record<string, string | number>,
    urgency: row.urgency,
    department: row.department,
    patientAdvice: row.patientAdvice,
    redFlags: row.redFlags,
    source: row.source,
    createdAt: iso(row.createdAt),
    submittedBy: row.submittedBy.name,
    reviewedBy: row.reviewedBy?.name ?? null,
    reviewedAt: isoOrNull(row.reviewedAt),
    ...(clinical
      ? { clinicalSummary: row.clinicalSummary, considerations: row.considerations, model: row.model }
      : {}),
  }
}
