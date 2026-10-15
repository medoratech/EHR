import {
  Building2,
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
import { dailyVolume, patients, systemConfig } from '../data/api'
import { formatCurrency, formatDateTime, humanize } from '../lib/format'
import type { User } from '../data/types'
import { useDemoStore } from '../state/useDemoStore'
import { DemoWorkspace, WorkspaceField } from '../components/ui/DemoWorkspace'
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
  const { users, updateUserStatus, auditEvents, appointments, labTests, prescriptions, invoices, vitals } =
    useDemoStore()
  const [roleFilter, setRoleFilter] = useState<'all' | User['role']>('all')
  const [saved, setSaved] = useState<string[]>([])
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

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

    if (viewContent) return <FocusedPortalView {...viewContent} onAction={() => setWorkspaceOpen(true)} />
  }

  function toggleAccess(user: User) {
    setSaved((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]))
    updateUserStatus(user.id, user.status === 'active' ? 'suspended' : 'active')
  }

  return (
    <>
      <PageHeader
        title="Admin panel"
        subtitle="User access, system configuration and the security audit trail."
        icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />}
        actions={
          <Button variant="primary" onClick={() => setWorkspaceOpen(true)}>
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
                saved.includes(u.id) ? (
                  <StatusPill severity="normal">Updated</StatusPill>
                ) : (
                  <Button onClick={() => toggleAccess(u)}>Edit access</Button>
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
              description="Departments, services and internal workflows"
              icon={<Settings className="h-5 w-5" aria-hidden="true" />}
            />
            <ul className="divide-y divide-cyan-100">
              {systemConfig.map((row) => (
                <li
                  key={row.label}
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
      {workspaceOpen ? (
        <DemoWorkspace title="Add team member" description="Invite a colleague and assign their Medora role." action="Send invitation" onClose={() => setWorkspaceOpen(false)}>
          <WorkspaceField label="Full name" />
          <WorkspaceField label="Work email" />
          <WorkspaceField label="Role">
            <select className="mt-2 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 text-sm font-normal text-cyan-900">
              <option>Doctor</option><option>Staff</option><option>Laboratory</option><option>Pharmacy</option><option>Reception</option>
            </select>
          </WorkspaceField>
        </DemoWorkspace>
      ) : null}
    </>
  )
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
