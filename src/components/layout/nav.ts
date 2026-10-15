import {
  Activity,
  Bell,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  FlaskConical,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  description: string
  icon: LucideIcon
  role: string
  portals?: string[]
}

export const navItems: NavItem[] = [
  {
    to: '/patient',
    label: 'Patient',
    description: 'Self-service care hub',
    icon: UserRound,
    role: 'Patient',
    portals: ['patient'],
  },
  {
    to: '/doctor',
    label: 'Doctor',
    description: 'Cases, reports, task delegation',
    icon: Stethoscope,
    role: 'Clinician',
    portals: ['doctor'],
  },
  {
    to: '/staff',
    label: 'Staff',
    description: 'Assigned duties and vitals',
    icon: ClipboardList,
    role: 'Nursing',
    portals: ['staff'],
  },
  {
    to: '/laboratory',
    label: 'Laboratory',
    description: 'Test analytics and reports',
    icon: FlaskConical,
    role: 'Diagnostics',
    portals: ['laboratory'],
  },
  {
    to: '/pharmacy',
    label: 'Pharmacy',
    description: 'Inventory, orders, refills',
    icon: Pill,
    role: 'Pharmacy',
    portals: ['pharmacy'],
  },
  {
    to: '/reception',
    label: 'Reception',
    description: 'Front desk and billing',
    icon: Bell,
    role: 'Front desk',
    portals: ['reception'],
  },
  {
    to: '/admin',
    label: 'Admin',
    description: 'Users, oversight, audit',
    icon: ShieldCheck,
    role: 'Administration',
    portals: ['admin'],
  },
]

export interface PortalNavigation {
  id: string
  label: string
  eyebrow: string
  description: string
  icon: LucideIcon
  accent: 'patient' | 'clinical' | 'operations' | 'diagnostics' | 'pharmacy' | 'admin'
  items: NavItem[]
}

const portalItems: Record<string, NavItem[]> = {
  patient: [
    { to: '/patient?view=health', label: 'My health', description: 'Your care overview', icon: UserRound, role: 'Patient' },
    { to: '/patient?view=appointments', label: 'Appointments', description: 'Visits and bookings', icon: Bell, role: 'Patient' },
    { to: '/patient?view=reports', label: 'Reports', description: 'Results and documents', icon: ClipboardList, role: 'Patient' },
    { to: '/patient?view=medicines', label: 'Medicines', description: 'Prescriptions and refills', icon: Pill, role: 'Patient' },
  ],
  doctor: [
    { to: '/doctor?view=overview', label: 'Clinical overview', description: 'Today at a glance', icon: Stethoscope, role: 'Clinician' },
    { to: '/doctor?view=patients', label: 'My patients', description: 'Cases and history', icon: UserRound, role: 'Clinician' },
    { to: '/doctor?view=reports', label: 'Reports to review', description: 'New diagnostic results', icon: ClipboardList, role: 'Clinician' },
    { to: '/doctor?view=tasks', label: 'Task delegation', description: 'Coordinate your team', icon: Bell, role: 'Clinician' },
  ],
  staff: [
    { to: '/staff?view=workspace', label: 'My workspace', description: 'Your ward overview', icon: ClipboardList, role: 'Nursing' },
    { to: '/staff?view=tasks', label: 'Task queue', description: 'Assigned duties', icon: Bell, role: 'Nursing' },
    { to: '/staff?view=vitals', label: 'Vital updates', description: 'Record patient readings', icon: Activity, role: 'Nursing' },
    { to: '/staff?view=discharges', label: 'Discharges', description: 'Summaries to verify', icon: FileCheck2, role: 'Nursing' },
  ],
  laboratory: [
    { to: '/laboratory?view=overview', label: 'Lab overview', description: 'Throughput and status', icon: FlaskConical, role: 'Diagnostics' },
    { to: '/laboratory?view=queue', label: 'Test queue', description: 'Samples in progress', icon: ClipboardList, role: 'Diagnostics' },
    { to: '/laboratory?view=reports', label: 'Report uploads', description: 'Release results', icon: FileCheck2, role: 'Diagnostics' },
    { to: '/laboratory?view=catalogue', label: 'Test catalogue', description: 'Bookable services', icon: Bell, role: 'Diagnostics' },
  ],
  pharmacy: [
    { to: '/pharmacy?view=overview', label: 'Pharmacy overview', description: 'Stock and orders', icon: Pill, role: 'Pharmacy' },
    { to: '/pharmacy?view=inventory', label: 'Inventory', description: 'Stock and expiry', icon: ClipboardList, role: 'Pharmacy' },
    { to: '/pharmacy?view=prescriptions', label: 'Prescription queue', description: 'Fulfil doctor orders', icon: FileCheck2, role: 'Pharmacy' },
    { to: '/pharmacy?view=refills', label: 'Refill reminders', description: 'Keep care continuous', icon: Bell, role: 'Pharmacy' },
  ],
  reception: [
    { to: '/reception?view=overview', label: 'Front desk overview', description: 'Live patient flow', icon: Bell, role: 'Front desk' },
    { to: '/reception?view=appointments', label: 'Appointments', description: 'Confirm and check in', icon: CalendarClock, role: 'Front desk' },
    { to: '/reception?view=billing', label: 'Billing', description: 'Payments and invoices', icon: ClipboardList, role: 'Front desk' },
    { to: '/reception?view=discharges', label: 'Discharges', description: 'Coordinate departures', icon: FileCheck2, role: 'Front desk' },
  ],
  admin: [
    { to: '/admin?view=overview', label: 'Admin overview', description: 'System at a glance', icon: ShieldCheck, role: 'Administration' },
    { to: '/admin?view=access', label: 'User access', description: 'Roles and permissions', icon: UserRound, role: 'Administration' },
    { to: '/admin?view=oversight', label: 'Data oversight', description: 'Operational analytics', icon: ClipboardList, role: 'Administration' },
    { to: '/admin?view=audit', label: 'Audit logs', description: 'Security activity', icon: Bell, role: 'Administration' },
  ],
}

export const portalNavigation: Record<string, PortalNavigation> = {
  patient: {
    id: 'patient',
    label: 'Patient portal',
    eyebrow: 'Your care, clearly organised',
    description: 'Appointments, health records and next steps in one calm workspace.',
    icon: UserRound,
    accent: 'patient',
    items: portalItems.patient,
  },
  doctor: {
    id: 'doctor',
    label: 'Clinician portal',
    eyebrow: 'Focus on the care that needs you',
    description: 'Prioritised cases, reports and team coordination for today.',
    icon: Stethoscope,
    accent: 'clinical',
    items: portalItems.doctor,
  },
  staff: {
    id: 'staff',
    label: 'Staff portal',
    eyebrow: 'Your ward workspace',
    description: 'Assigned duties, patient updates and discharge coordination.',
    icon: ClipboardList,
    accent: 'operations',
    items: portalItems.staff,
  },
  laboratory: {
    id: 'laboratory',
    label: 'Laboratory portal',
    eyebrow: 'Diagnostics, without the delays',
    description: 'Track test throughput, release reports and manage your catalogue.',
    icon: FlaskConical,
    accent: 'diagnostics',
    items: portalItems.laboratory,
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy portal',
    eyebrow: 'Every prescription, accounted for',
    description: 'Keep stock healthy and fulfil medicines with confidence.',
    icon: Pill,
    accent: 'pharmacy',
    items: portalItems.pharmacy,
  },
  reception: {
    id: 'reception',
    label: 'Reception portal',
    eyebrow: 'Keep the day moving',
    description: 'Appointments, patient flow and billing at front desk speed.',
    icon: Bell,
    accent: 'operations',
    items: portalItems.reception,
  },
  admin: {
    id: 'admin',
    label: 'Admin portal',
    eyebrow: 'One view of your organisation',
    description: 'Manage access, configuration, oversight and audit activity.',
    icon: ShieldCheck,
    accent: 'admin',
    items: portalItems.admin,
  },
}
