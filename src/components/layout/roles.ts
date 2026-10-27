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
  { label: 'Patient', description: 'Self-service care hub', to: '/patient', role: 'patient', icon: UserRound },
  { label: 'Doctor', description: 'Cases, reports, tasks', to: '/doctor', role: 'doctor', icon: Stethoscope },
  { label: 'Staff', description: 'Duties and vitals', to: '/staff', role: 'staff', icon: ClipboardList },
  { label: 'Laboratory', description: 'Tests and reports', to: '/laboratory', role: 'lab', icon: FlaskConical },
  { label: 'Pharmacy', description: 'Inventory and orders', to: '/pharmacy', role: 'pharmacy', icon: Pill },
  { label: 'Reception', description: 'Front desk and billing', to: '/reception', role: 'receptionist', icon: Bell },
  { label: 'Admin', description: 'Users and oversight', to: '/admin', role: 'admin', icon: ShieldCheck },
]
