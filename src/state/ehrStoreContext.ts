import { createContext } from 'react'
import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  AppointmentType,
  AuditEvent,
  ClinicConfig,
  ClinicalNote,
  Department,
  DietPlan,
  DischargeStatus,
  DischargeSummary,
  GlucoseReading,
  HealthTip,
  OldcartsAnswers,
  TriageAssessment,
  InventoryItem,
  Invoice,
  InvoiceStatus,
  LabCatalogueItem,
  LabStatus,
  LabTest,
  Notification,
  Patient,
  Prescription,
  ProblemSummary,
  Severity,
  Sex,
  StaffRole,
  SystemSetting,
  Task,
  TaskKind,
  TaskStatus,
  User,
  Vitals,
} from '../data/types'

/** Every collection the API serves, keyed by the name used in change events. */
export interface Collections {
  patients: Patient[]
  appointments: Appointment[]
  vitals: Vitals[]
  tasks: Task[]
  labTests: LabTest[]
  labCatalogue: LabCatalogueItem[]
  prescriptions: Prescription[]
  inventory: InventoryItem[]
  invoices: Invoice[]
  dischargeSummaries: DischargeSummary[]
  problemSummaries: ProblemSummary[]
  clinicalNotes: ClinicalNote[]
  dietPlans: DietPlan[]
  glucoseReadings: GlucoseReading[]
  users: User[]
  auditEvents: AuditEvent[]
  notifications: Notification[]
  systemSettings: SystemSetting[]
  /** For a patient: tips chosen for their own conditions. */
  healthTips: HealthTip[]
  triageAssessments: TriageAssessment[]
}

/** Change-feed names: every collection, plus the clinic settings object. */
export type Resource = keyof Collections | 'clinic'

export interface NewPatient {
  name: string
  age?: number
  dateOfBirth?: string
  sex: Sex
  phone?: string
  department: Department
  conditions?: string[]
  allergies?: string[]
}

/**
 * Mutations resolve to the saved record, or to null when the API refused the change
 * (the reason has already been shown to the user as a toast).
 */
export interface EhrActions {
  registerPatient: (input: NewPatient) => Promise<Patient | null>
  registerWalkIn: (input: NewPatient & { reason: string; doctor?: string }) => Promise<{ patient: Patient; appointment: Appointment } | null>
  bookAppointment: (input: {
    patientId?: string
    doctor?: string
    doctorId?: string
    department: Department
    date: string
    time: string
    type?: AppointmentType
    source?: AppointmentSource
    reason: string
  }) => Promise<Appointment | null>
  setAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<Appointment | null>
  recordVitals: (input: {
    patientId: string
    bloodPressure: string
    heartRate: number
    temperatureF: number
    spo2: number
    weightKg: number
  }) => Promise<Vitals | null>
  createTask: (input: {
    title: string
    kind: TaskKind
    patientId: string
    assignedToId: string
    due: string
    severity?: Severity
  }) => Promise<Task | null>
  updateTask: (id: string, patch: { status?: TaskStatus; assignedToId?: string }) => Promise<Task | null>
  bookLabTest: (input: { patientId?: string; catalogueItemId: string }) => Promise<LabTest | null>
  uploadReport: (input: { patientId?: string; fileName: string; note?: string }) => Promise<LabTest | null>
  setLabStatus: (id: string, status: LabStatus) => Promise<LabTest | null>
  releaseLabReport: (id: string, result: string) => Promise<LabTest | null>
  acknowledgeLabReport: (id: string) => Promise<LabTest | null>
  orderMedicine: (prescriptionId: string, medicineId: string) => Promise<Prescription | null>
  dispenseMedicine: (prescriptionId: string, medicineId: string) => Promise<Prescription | null>
  sendRefillReminder: (prescriptionId: string) => Promise<{ sent: boolean } | null>
  requestReorder: (itemId: string) => Promise<InventoryItem | null>
  createInvoice: (input: {
    patientId: string
    amount: number
    description?: string
    status?: InvoiceStatus
    method?: string
  }) => Promise<Invoice | null>
  payInvoice: (id: string, status: InvoiceStatus, method?: string) => Promise<Invoice | null>
  updateDischarge: (id: string, patch: { status?: DischargeStatus; diagnosis?: string }) => Promise<DischargeSummary | null>
  approveProblemSummary: (patientId: string) => Promise<ProblemSummary | null>
  editProblemSummary: (patientId: string, input: { headline: string; issues: string[] }) => Promise<ProblemSummary | null>
  addClinicalNote: (patientId: string, body: string) => Promise<ClinicalNote | null>
  inviteUser: (input: { name: string; email: string; role: StaffRole }) => Promise<{ user: User; setupPath: string } | null>
  updateUser: (id: string, patch: { status?: User['status']; role?: StaffRole }) => Promise<User | null>
  markNotificationRead: (id: string) => Promise<unknown>
  markAllNotificationsRead: () => Promise<unknown>
  resetDemo: () => Promise<unknown>
  submitSymptomCheck: (input: OldcartsAnswers & { patientId?: string }) => Promise<TriageAssessment | null>
  reviewSymptomCheck: (id: string) => Promise<TriageAssessment | null>
  updateClinic: (patch: Partial<Omit<ClinicConfig, 'departments'>>) => Promise<unknown>
  addDepartment: (name: string) => Promise<unknown>
  updateDepartment: (name: string, patch: { active?: boolean; rename?: string }) => Promise<unknown>
}

export interface EhrValue extends Collections, EhrActions {
  status: 'loading' | 'ready' | 'error'
  /** Clinic reference settings; null until the first load. */
  clinic: ClinicConfig | null
  /** Names of departments currently taking new patients and bookings. */
  activeDepartments: string[]
  /** Whether the live change feed is connected. */
  live: boolean
  /** The chart pinned in the patient context bar. */
  focusedPatient: Patient | undefined
  setFocusedPatientId: (id: string) => void
  patientName: (id: string) => string
  reload: () => Promise<void>
}

export const EhrContext = createContext<EhrValue | null>(null)
