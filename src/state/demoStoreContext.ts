import { createContext } from 'react'
import type {
  Appointment,
  AppointmentStatus,
  AuditEvent,
  Invoice,
  LabTest,
  Notification,
  Prescription,
  Task,
  TaskStatus,
  User,
  Vitals,
} from '../data/types'

export interface DemoStoreValue {
  appointments: Appointment[]
  invoices: Invoice[]
  labTests: LabTest[]
  prescriptions: Prescription[]
  tasks: Task[]
  users: User[]
  vitals: Vitals[]
  notifications: Notification[]
  auditEvents: AuditEvent[]
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Appointment
  updateAppointment: (id: string, status: AppointmentStatus) => void
  addLabTest: (test: Omit<LabTest, 'id'>) => LabTest
  releaseLabReport: (id: string, result?: string) => void
  orderMedicine: (prescriptionId: string, medicineId: string) => void
  updateInvoice: (id: string, status: Invoice['status'], method?: string) => void
  addVitals: (vitals: Omit<Vitals, 'id'>) => Vitals
  updateTask: (id: string, status: TaskStatus) => void
  addUser: (user: Omit<User, 'id' | 'lastActive'>) => User
  updateUserStatus: (id: string, status: User['status']) => void
  resetDemo: () => void
}

export const DemoStoreContext = createContext<DemoStoreValue | null>(null)
