export type Severity = 'normal' | 'abnormal' | 'critical'
export type Sex = 'female' | 'male' | 'other'
export type Department =
  | 'Cardiology'
  | 'Dermatology'
  | 'Endocrinology'
  | 'General Medicine'
  | 'Neurology'
  | 'Orthopaedics'
  | 'Paediatrics'
  | 'Pulmonology'

export interface Patient {
  id: string
  mrn: string
  name: string
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
  assignedTo: string
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
}

export interface Medicine {
  id: string
  name: string
  dosage: string
  frequency: string
  durationDays: number
  ordered: boolean
}

export interface Prescription {
  id: string
  patientId: string
  doctor: string
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
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid'

export interface Invoice {
  id: string
  patientId: string
  amount: number
  status: InvoiceStatus
  issuedAt: string
  method: string | null
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
}

export type Role = 'admin' | 'doctor' | 'lab' | 'pharmacy' | 'receptionist' | 'staff'

export interface User {
  id: string
  name: string
  role: Role
  email: string
  status: 'active' | 'invited' | 'suspended'
  lastActive: string
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
