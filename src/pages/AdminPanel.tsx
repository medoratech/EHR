import {
  Building2,
  Hospital,
  CalendarClock,
  ChartColumn,
  Database,
  ScrollText,
  Settings,
  ShieldAlert,
  UserCog,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  MetricTile,
  PageHeader,
  StatusPill,
  type Tone,
} from '../components/ui/primitives'
import { DataTable } from '../components/ui/Table'
import { LineChart, PieChart } from '../components/ui/Chart'
import { dailyVolume } from '../data/api'
import { formatCurrency, formatDateTime, humanize } from '../lib/format'
import type { StaffRole, User } from '../data/types'
import { useAuth } from '../state/useAuth'
import { useEhr } from '../state/useEhr'
import { Workspace, WorkspaceField, WorkspaceSelect } from '../components/ui/Workspace'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'

const statusTone: Record<User['status'], Tone> = {
  active: 'positive',
  invited: 'warning',
  suspended: 'danger',
}

const bookingSources = [
  { source: 'app', color: 'var(--color-cyan-500)' },
  { source: 'whatsapp', color: 'var(--color-emerald-500)' },
  { source: 'walk-in', color: 'var(--color-amber-500)' },
] as const

const roleColors: Record<string, string> = {
  admin: 'var(--color-cyan-700)',
  doctor: 'var(--color-cyan-500)',
  staff: 'var(--color-emerald-500)',
  lab: 'var(--color-amber-500)',
  pharmacy: 'var(--color-cyan-400)',
  receptionist: 'var(--color-cyan-300)',
}

export function AdminPanel() {
  const [searchParams] = useSearchParams()
  const { user: me } = useAuth()
  const {
    users,
    patients,
    systemSettings,
    auditEvents,
    appointments,
    labTests,
    prescriptions,
    invoices,
    vitals,
    updateUser,
    inviteUser,
    clinic,
    updateClinic,
    addDepartment,
    updateDepartment,
  } = useEhr()
  const [roleFilter, setRoleFilter] = useState<'all' | User['role']>('all')
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [setupLink, setSetupLink] = useState<string | null>(null)
  const [clinicOpen, setClinicOpen] = useState(false)
  /** Department being renamed, or '' when adding a new one. */
  const [departmentEdit, setDepartmentEdit] = useState<string | null>(null)

  const filteredUsers = users.filter((u) => roleFilter === 'all' || u.role === roleFilter)

  const revenueCollected = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
  const revenueOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
  const recordVolume = dailyVolume(
    [
      ...appointments.map((a) => a.date),
      ...labTests.map((l) => l.orderedAt),
      ...prescriptions.map((p) => p.issuedAt),
      ...invoices.map((i) => i.issuedAt),
      ...vitals.map((v) => v.recordedAt),
    ],
    (d) => d,
  )

  const requestedView = searchParams.get('view') ?? 'overview'
  if (requestedView !== 'overview') {
    const viewContent = {
      access: {
        title: 'User access',
        description: 'Manage roles and account status with a clear, auditable access view.',
        icon: UserCog,
        metrics: [
          { label: 'Platform users', value: users.length, hint: 'All roles' },
          { label: 'Active now', value: users.filter((user) => user.status === 'active').length, hint: 'Can access Medora' },
        ],
        rows: filteredUsers.slice(0, 8).map((user) => ({ label: user.name, value: user.role, detail: user.email, status: user.status })),
        actionLabel: 'Add user',
      },
      oversight: {
        title: 'Data oversight',
        description: 'See operational activity across appointments, diagnostics, prescriptions and billing.',
        icon: Database,
        metrics: [
          { label: 'Patients', value: patients.length, hint: 'On record' },
          { label: 'Appointments', value: appointments.length, hint: 'Across channels' },
          { label: 'Lab tests', value: labTests.length, hint: 'Tracked in EHR' },
          { label: 'Prescriptions', value: prescriptions.length, hint: 'Active records' },
        ],
        rows: [
          { label: 'Revenue collected', value: formatCurrency(revenueCollected), detail: 'Settled invoices', status: 'Healthy' },
          { label: 'Revenue outstanding', value: formatCurrency(revenueOutstanding), detail: 'Requires follow-up', status: 'Review' },
        ],
        actionLabel: 'Review oversight',
      },
      audit: {
        title: 'Audit logs',
        description: 'Review security activity and privileged actions with a presentation-ready audit trail.',
        icon: ScrollText,
        metrics: [
          { label: 'Total events', value: auditEvents.length, hint: 'Recorded activity' },
          { label: 'Requires review', value: auditEvents.filter((event) => event.severity !== 'normal').length, hint: 'Elevated severity' },
        ],
        rows: auditEvents.slice(0, 10).map((event) => ({ label: event.action, value: formatDateTime(event.at), detail: `${event.actor} · ${event.target}`, status: event.severity })),
        actionLabel: 'Review audit logs',
      },
    }[requestedView as 'access' | 'oversight' | 'audit']

    if (viewContent) {
      return (
        <>
          <FocusedPortalView {...viewContent} onAction={requestedView === 'access' ? () => openInvite() : undefined} />
          {renderWorkspace()}
        </>
      )
    }
  }

  function toggleAccess(user: User) {
    void updateUser(user.id, { status: user.status === 'active' ? 'suspended' : 'active' })
  }

  function openInvite() {
    setSetupLink(null)
    setWorkspaceOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Admin panel"
        subtitle="User access, system configuration and the security audit trail."
        icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />}
        actions={
          <Button variant="primary" onClick={openInvite}>
            <UserCog className="h-4 w-4" aria-hidden="true" />
            Add user
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Platform users"
          value={users.length}
          hint={`${users.filter((u) => u.status === 'active').length} active now`}
          icon={<UserCog className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Patients on record"
          value={patients.length}
          hint="All departments combined"
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Revenue collected"
          value={formatCurrency(revenueCollected)}
          hint={`${formatCurrency(revenueOutstanding)} outstanding`}
          tone="positive"
          icon={<ScrollText className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Security events"
          value={auditEvents.filter((a) => a.severity !== 'normal').length}
          hint="Require review"
          tone="danger"
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader
          title="User role management"
          description="Grant, edit or revoke access for every staff group"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-cyan-100 p-5">
          <span className="text-sm font-semibold text-cyan-900">Filter by role</span>
          {(['all', 'doctor', 'staff', 'lab', 'pharmacy', 'receptionist', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              aria-pressed={roleFilter === r}
              className={`min-h-11 cursor-pointer rounded-xl px-3 text-sm font-medium capitalize transition-colors duration-200 ${
                roleFilter === r
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white text-cyan-800 ring-1 ring-cyan-300 ring-inset hover:bg-cyan-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <DataTable
          caption="Platform users with role and access status"
          rows={filteredUsers}
          rowKey={(u) => u.id}
          emptyMessage="No users with this role."
          columns={[
            {
              key: 'user',
              header: 'User',
              primary: true,
              render: (u) => (
                <span className="flex items-center gap-3">
                  <Avatar initials={initialsOf(u.name)} name={u.name} size="sm" />
                  <span>
                    <span className="block font-semibold">{u.name}</span>
                    <span className="text-cyan-700">{u.email}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              render: (u) => (
                <Badge>
                  <span className="capitalize">{u.role}</span>
                </Badge>
              ),
            },
            {
              key: 'lastActive',
              header: 'Last active',
              render: (u) => (
                <span className="tabular text-cyan-800">{formatDateTime(u.lastActive)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Access',
              render: (u) => (
                <StatusPill tone={statusTone[u.status]}>{u.status}</StatusPill>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              render: (u) =>
                u.id === me?.id ? (
                  <span className="text-sm text-cyan-700">You</span>
                ) : (
                  <Button onClick={() => toggleAccess(u)}>
                    {u.status === 'active' ? 'Suspend' : u.status === 'invited' ? 'Approve' : 'Reactivate'}
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Security & audit logs"
            description="Every privileged action across the platform"
            icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          />
          <ul className="divide-y divide-cyan-100">
            {auditEvents.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <StatusPill severity={a.severity}>{a.severity}</StatusPill>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-cyan-950">{a.action}</p>
                  <p className="text-sm text-cyan-700">{a.target}</p>
                  <p className="tabular mt-0.5 text-xs text-cyan-700">
                    {a.actor} · {a.role} · {formatDateTime(a.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="Users by role"
              description="Access distribution"
              icon={<ChartColumn className="h-5 w-5" aria-hidden="true" />}
            />
            <PieChart
              compact
              title="Platform users by role"
              unit="users"
              segments={Object.entries(
                users.reduce<Record<string, number>>((counts, user) => {
                  counts[user.role] = (counts[user.role] ?? 0) + 1
                  return counts
                }, {}),
              ).map(([role, count]) => ({
                label: humanize(role),
                value: count,
                color: roleColors[role] ?? 'var(--color-cyan-400)',
              }))}
            />
          </Card>

          <Card>
            <CardHeader
              title="System configuration"
              description="Services and internal workflows"
              icon={<Settings className="h-5 w-5" aria-hidden="true" />}
            />
            <ul className="divide-y divide-cyan-100">
              {systemSettings.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <span className="text-sm text-cyan-800">{row.label}</span>
                  <span className="text-sm font-semibold text-cyan-950">{row.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {clinic ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Clinic settings"
              description="Reference data used across every portal"
              icon={<Hospital className="h-5 w-5" aria-hidden="true" />}
              action={<Button onClick={() => setClinicOpen(true)}>Edit</Button>}
            />
            <dl className="divide-y divide-cyan-100">
              {[
                ['Clinic name', clinic.name],
                ['Currency', `${clinic.currency} · e.g. ${formatCurrency(1250)}`],
                ['Locale', clinic.locale],
                ['Time zone', clinic.timeZone],
                ['Appointment times', clinic.appointmentSlots.join(', ')],
                ['Payment methods', clinic.paymentMethods.join(', ')],
                ['Unassigned bookings shown as', clinic.defaultClinician],
                ['Emergency number', clinic.emergencyNumber],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <dt className="text-sm text-cyan-800">{label}</dt>
                  <dd className="text-right text-sm font-semibold text-cyan-950">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Departments"
              description="Closed departments keep their history but take no new patients or bookings"
              icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
              action={<Button onClick={() => setDepartmentEdit('')}>Add department</Button>}
            />
            <ul className="divide-y divide-cyan-100">
              {clinic.departments.map((department) => (
                <li key={department.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cyan-950">{department.name}</span>
                    {department.active ? null : <StatusPill tone="neutral">Closed</StatusPill>}
                  </span>
                  <span className="flex gap-2">
                    <Button variant="ghost" onClick={() => setDepartmentEdit(department.name)}>
                      Rename
                    </Button>
                    <Button onClick={() => void updateDepartment(department.name, { active: !department.active })}>
                      {department.active ? 'Close' : 'Reopen'}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Data oversight — appointments"
            description="Booking source mix across the platform"
            icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
          />
          <PieChart
            title="Appointments by booking source"
            unit="bookings"
            segments={bookingSources.map(({ source, color }) => ({
              label: humanize(source),
              value: appointments.filter((a) => a.source === source).length,
              color,
            }))}
          />
        </Card>

        <Card>
          <CardHeader
            title="Volume trend"
            description="Clinical records created over the last seven days"
            icon={<Database className="h-5 w-5" aria-hidden="true" />}
          />
          <LineChart
            title="Clinical records created per day over the last seven days"
            data={recordVolume}
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Cross-module record counts"
          description="Every module writes into the same patient record"
          icon={<Database className="h-5 w-5" aria-hidden="true" />}
        />
        <DataTable
          caption="Record counts per module"
          rows={[
            { module: 'Appointments', count: appointments.length, owner: 'Reception' },
            { module: 'Patients', count: patients.length, owner: 'Registration' },
            { module: 'Laboratory tests', count: labTests.length, owner: 'Laboratory' },
            { module: 'Prescriptions', count: prescriptions.length, owner: 'Doctors' },
          ]}
          rowKey={(r) => r.module}
          columns={[
            { key: 'module', header: 'Module', primary: true, render: (r) => r.module },
            {
              key: 'owner',
              header: 'Owner',
              render: (r) => r.owner,
            },
            {
              key: 'count',
              header: 'Records',
              align: 'right',
              render: (r) => <span className="tabular">{r.count}</span>,
            },
          ]}
        />
      </Card>
      {renderWorkspace()}
    </>
  )

  function renderWorkspace() {
    const list = (value: string) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

    if (clinicOpen && clinic) {
      return (
        <Workspace
          title="Clinic settings"
          description="Changes apply to every portal straight away."
          action="Save settings"
          onClose={() => setClinicOpen(false)}
          onComplete={(values) =>
            updateClinic({
              name: values.name,
              currency: values.currency,
              locale: values.locale,
              timeZone: values.timeZone,
              appointmentSlots: list(values.appointmentSlots),
              paymentMethods: list(values.paymentMethods),
              defaultClinician: values.defaultClinician,
              emergencyNumber: values.emergencyNumber,
            })
          }
        >
          <WorkspaceField label="Clinic name" name="name" defaultValue={clinic.name} />
          <div className="grid gap-4 sm:grid-cols-3">
            <WorkspaceField label="Currency (ISO code)" name="currency" defaultValue={clinic.currency} placeholder="GHS" />
            <WorkspaceField label="Locale" name="locale" defaultValue={clinic.locale} placeholder="en-GH" />
            <WorkspaceField label="Time zone" name="timeZone" defaultValue={clinic.timeZone} placeholder="Africa/Accra" />
          </div>
          <WorkspaceField
            label="Appointment times (HH:mm, comma separated)"
            name="appointmentSlots"
            defaultValue={clinic.appointmentSlots.join(', ')}
          />
          <WorkspaceField
            label="Payment methods (comma separated)"
            name="paymentMethods"
            defaultValue={clinic.paymentMethods.join(', ')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <WorkspaceField label="Show unassigned bookings as" name="defaultClinician" defaultValue={clinic.defaultClinician} />
            <WorkspaceField label="Emergency number (shown in symptom checks)" name="emergencyNumber" type="tel" defaultValue={clinic.emergencyNumber} />
          </div>
        </Workspace>
      )
    }

    if (departmentEdit !== null) {
      const renaming = departmentEdit !== ''
      return (
        <Workspace
          title={renaming ? `Rename ${departmentEdit}` : 'Add department'}
          description={renaming ? 'Patients and appointments move to the new name.' : 'New departments are open straight away.'}
          action={renaming ? 'Rename department' : 'Add department'}
          onClose={() => setDepartmentEdit(null)}
          onComplete={(values) =>
            renaming ? updateDepartment(departmentEdit, { rename: values.name }) : addDepartment(values.name)
          }
        >
          <WorkspaceField label="Department name" name="name" defaultValue={renaming ? departmentEdit : undefined} />
        </Workspace>
      )
    }

    if (!workspaceOpen) return null
    const link = setupLink ? `${window.location.origin}${setupLink}` : null
    return (
      <Workspace
        title="Add team member"
        description="Invite a colleague and assign their Medora role. They choose their own password."
        action="Send invitation"
        onClose={() => setWorkspaceOpen(false)}
        onComplete={async (values) => {
          const invited = await inviteUser({ name: values.name, email: values.email, role: values.role as StaffRole })
          if (invited) setSetupLink(invited.setupPath)
          return invited
        }}
        result={
          link ? (
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 text-sm text-cyan-900">
              <p className="font-semibold">Share this one-time setup link (valid 72 hours)</p>
              <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-xs break-all">{link}</p>
              <Button className="mt-3" onClick={() => void navigator.clipboard?.writeText(link)}>
                Copy link
              </Button>
            </div>
          ) : null
        }
      >
        <WorkspaceField label="Full name" name="name" />
        <WorkspaceField label="Work email" name="email" type="email" />
        <WorkspaceField label="Role">
          <WorkspaceSelect
            name="role"
            options={[
              { value: 'doctor', label: 'Doctor' },
              { value: 'staff', label: 'Staff' },
              { value: 'lab', label: 'Laboratory' },
              { value: 'pharmacy', label: 'Pharmacy' },
              { value: 'receptionist', label: 'Reception' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </WorkspaceField>
      </Workspace>
    )
  }
}

function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
