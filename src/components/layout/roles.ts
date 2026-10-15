import {
  Bell,
  ClipboardList,
  FlaskConical,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import type { RoleOption } from './AuthLayout'

export const roleOptions: RoleOption[] = [
  { label: 'Patient', description: 'Self-service care hub', to: '/patient', icon: UserRound },
  { label: 'Doctor', description: 'Cases, reports, tasks', to: '/doctor', icon: Stethoscope },
  { label: 'Staff', description: 'Duties and vitals', to: '/staff', icon: ClipboardList },
  { label: 'Laboratory', description: 'Tests and reports', to: '/laboratory', icon: FlaskConical },
  { label: 'Pharmacy', description: 'Inventory and orders', to: '/pharmacy', icon: Pill },
  { label: 'Reception', description: 'Front desk and billing', to: '/reception', icon: Bell },
  { label: 'Admin', description: 'Users and oversight', to: '/admin', icon: ShieldCheck },
]

export interface DemoAccount {
  name: string
  email: string
  role: string
  to: string
}

export const demoAccounts: DemoAccount[] = [
  { name: 'Dr. Adjoa Mensah', email: 'doctor@medora.health', role: 'Doctor', to: '/doctor' },
  { name: 'Nurse Grace Owusu', email: 'staff@medora.health', role: 'Staff', to: '/staff' },
  { name: 'Irene Quaye', email: 'lab@medora.health', role: 'Laboratory', to: '/laboratory' },
  { name: 'Kofi Boateng', email: 'pharmacy@medora.health', role: 'Pharmacy', to: '/pharmacy' },
  { name: 'Yaa Asantewaa', email: 'reception@medora.health', role: 'Reception', to: '/reception' },
  { name: 'Nana Adjei', email: 'admin@medora.health', role: 'Admin', to: '/admin' },
  { name: 'Amara Osei', email: 'patient@medora.health', role: 'Patient', to: '/patient' },
]

export function dashboardForEmail(email: string): string {
  const match = demoAccounts.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase(),
  )
  return match?.to ?? '/patient'
}
