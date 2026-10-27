// JSON shapes returned by the Medora API (server/src/lib/serialize.ts).

export type Severity = 'normal' | 'abnormal' | 'critical'
export type Sex = 'female' | 'male' | 'other'
/** A department name; the list is clinic reference data served by GET /api/clinic. */
export type Department = string

export interface Patient {
  id: string
  mrn: string
  name: string
  dateOfBirth: string
  age: number
  sex: Sex
  phone: string
  bloodGroup: string
  conditions: string[]
  allergies: string[]
  lastVisit: string
  risk: Severity
  department: Department
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
export type AppointmentType = 'OPD' | 'IPD' | 'Follow-up'
export type AppointmentSource = 'app' | 'whatsapp' | 'walk-in'

export interface Appointment {
  id: string
  patientId: string
  doctor: string
  doctorId: string | null
  department: Department
  date: string
  time: string
  type: AppointmentType
  status: AppointmentStatus
  source: AppointmentSource
  reason: string
}

export interface Vitals {
  id: string
  patientId: string
  recordedAt: string
  recordedBy: string
  bloodPressure: string
  heartRate: number
  temperatureF: number
  spo2: number
  weightKg: number
  severity: Severity
}

export type TaskStatus = 'open' | 'in-progress' | 'reverted' | 'done'
export type TaskKind =
  | 'discharge-summary'
  | 'med-delivery'
  | 'report-collection'
  | 'room-prep'
  | 'vitals-check'

export interface Task {
  id: string
  title: string
  kind: TaskKind
  patientId: string
  assignedBy: string
  assignedById: string
  assignedTo: string
  assignedToId: string
  due: string
  status: TaskStatus
  severity: Severity
}

export type LabStatus =
  | 'booked'
  | 'sample-collected'
  | 'processing'
  | 'completed'

export interface LabTest {
  id: string
  patientId: string
  testName: string
  category: string
  price: number
  status: LabStatus
  result: string | null
  orderedAt: string
  reportUploaded: boolean
  isNew: boolean
  releasedAt: string | null
}

export interface LabCatalogueItem {
  id: string
  name: string
  category: string
  price: number
  turnaround: string
  active: boolean
}

export interface Medicine {
  id: string
  name: string
  dosage: string
  frequency: string
  durationDays: number
  ordered: boolean
  dispensed: boolean
}

export interface Prescription {
  id: string
  patientId: string
  doctor: string
  doctorId: string
  issuedAt: string
  refillsLeft: number
  refillsTotal: number
  notes: string
  medicines: Medicine[]
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  stock: number
  reorderLevel: number
  expiry: string
  price: number
  reorderRequestedAt: string | null
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid'

export interface Invoice {
  id: string
  patientId: string
  amount: number
  status: InvoiceStatus
  description: string | null
  issuedAt: string
  method: string | null
  paidAt: string | null
}

export type DischargeStatus = 'draft' | 'staff-verified' | 'doctor-approved'

export interface DischargeSummary {
  id: string
  patientId: string
  admissionDate: string
  dischargeDate: string
  diagnosis: string
  status: DischargeStatus
  completedBy: string
  approvedBy: string | null
}

export type StaffRole = 'admin' | 'doctor' | 'lab' | 'pharmacy' | 'receptionist' | 'staff'
export type Role = StaffRole | 'patient'

export interface User {
  id: string
  name: string
  role: StaffRole
  email: string
  status: 'active' | 'invited' | 'suspended'
  lastActive: string
  patientId: string | null
}

/** The signed-in account, as returned by /api/auth. */
export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  patientId: string | null
  home: string
}

export interface AuditEvent {
  id: string
  actor: string
  role: Role
  action: string
  target: string
  at: string
  severity: Severity
}

export interface Notification {
  id: string
  title: string
  body: string
  at: string
  severity: Severity
  read: boolean
}

export interface GlucoseReading {
  patientId: string
  date: string
  value: number
}

export interface DietEntry {
  meal: string
  items: string
  calories: number
}

export interface DietPlan {
  patientId: string
  goal: string
  dailyCalories: number
  restrictions: string[]
  entries: DietEntry[]
}

export interface ProblemSummary {
  patientId: string
  headline: string
  issues: string[]
  aiGenerated: boolean
  approvedBy: string | null
  updatedAt: string
}

export interface ClinicalNote {
  id: string
  patientId: string
  author: string
  authorId: string
  body: string
  createdAt: string
}

export interface SystemSetting {
  key: string
  label: string
  value: string
}

export interface DemoAccount {
  name: string
  email: string
  role: string
  password: string
}

/** Clinic-wide reference settings (GET /api/clinic). */
export interface ClinicConfig {
  name: string
  currency: string
  locale: string
  timeZone: string
  appointmentSlots: string[]
  paymentMethods: string[]
  defaultClinician: string
  emergencyNumber: string
  departments: { name: string; active: boolean }[]
}

export interface HealthTip {
  id: string
  patientId?: string
  category: string
  title: string
  body: string
  conditions: string[]
  active: boolean
  /** The patient's recorded condition this tip was chosen for; null for general advice. */
  matchedCondition: string | null
}

export type Urgency = 'emergency' | 'urgent' | 'soon' | 'routine' | 'self_care'

/** An OLDCARTS symptom history. */
export interface OldcartsAnswers {
  chiefComplaint: string
  onset: string
  location: string
  duration: string
  character: string
  aggravating: string
  relieving: string
  radiation: string
  timing: string
  severity: number
  associated: string
}

export interface TriageAssessment {
  id: string
  patientId: string
  answers: OldcartsAnswers
  urgency: Urgency
  department: string | null
  patientAdvice: string
  redFlags: string[]
  source: 'ai' | 'rules'
  createdAt: string
  submittedBy: string
  reviewedBy: string | null
  reviewedAt: string | null
  /** Care-team only. */
  clinicalSummary?: string
  considerations?: string[]
  model?: string | null
}

export interface SystemInfo {
  name: string
  demoMode: boolean
  clock: { now: string; pinned: boolean }
  demoAccounts: DemoAccount[]
}
