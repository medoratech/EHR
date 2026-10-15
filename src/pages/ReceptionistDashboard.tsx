import { Activity, Banknote, CalendarClock, CheckCircle2, DoorOpen, Printer, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Avatar, Button, Card, CardHeader, MetricTile, PageHeader, StatusPill } from '../components/ui/primitives'
import { DataTable } from '../components/ui/Table'
import {
  draftDischarges,
  getPatientName,
  patientInitials,
  todayKey,
} from '../data/api'
import { formatCurrency, formatDate } from '../lib/format'
import type { Appointment } from '../data/types'
import { useDemoStore } from '../state/useDemoStore'
import { DemoWorkspace, WorkspaceField } from '../components/ui/DemoWorkspace'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'
import { demoNow } from '../lib/demoClock'

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function ReceptionistDashboard() {
  const [searchParams] = useSearchParams()
  const { appointments, invoices, updateAppointment, updateInvoice } = useDemoStore()
  const [printed, setPrinted] = useState<string[]>([])
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const today = appointments.filter((appointment) => appointment.date === todayKey())
  const now = demoNow()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  function isConfirmed(a: Appointment) {
    return a.status === 'confirmed'
  }

  const flowStages = [
    {
      label: 'Arriving',
      count: today.filter((a) => a.status !== 'completed' && !isConfirmed(a)).length,
      className: 'bg-cyan-200',
    },
    {
      label: 'Waiting',
      count: today.filter(
        (a) => a.status !== 'completed' && isConfirmed(a) && minutesOf(a.time) > nowMinutes,
      ).length,
      className: 'bg-cyan-400',
    },
    {
      label: 'In consultation',
      count: today.filter(
        (a) => a.status !== 'completed' && isConfirmed(a) && minutesOf(a.time) <= nowMinutes,
      ).length,
      className: 'bg-cyan-600',
    },
    {
      label: 'Completed',
      count: today.filter((a) => a.status === 'completed').length,
      className: 'bg-emerald-500',
    },
  ]

  const collected = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
  const openInvoices = invoices.filter((i) => i.status !== 'paid')
  const outstanding = openInvoices.reduce((sum, i) => sum + i.amount, 0)
  const pendingCount = today.filter((appointment) => appointment.status === 'pending').length

  const requestedView = searchParams.get('view') ?? 'overview'
  if (requestedView !== 'overview') {
    const viewContent = {
      appointments: {
        title: 'Appointments',
        description: 'Confirm, check in and track arrivals from one focused front-desk queue.',
        icon: CalendarClock,
        metrics: [
          { label: 'Today', value: today.length, hint: 'Scheduled visits' },
          { label: 'Awaiting approval', value: pendingCount, hint: 'Needs confirmation' },
        ],
        rows: today.slice(0, 8).map((item) => ({ label: getPatientName(item.patientId), value: item.time, detail: `${item.doctor} · ${item.department}`, status: item.status })),
        actionLabel: 'Manage appointments',
      },
      billing: {
        title: 'Billing',
        description: 'Review outstanding invoices, payment status and Indian Rupee receipts without visual clutter.',
        icon: Banknote,
        metrics: [
          { label: 'Outstanding', value: formatCurrency(outstanding), hint: `${openInvoices.length} open invoices` },
          { label: 'Collected', value: formatCurrency(collected), hint: 'Settled invoices' },
        ],
        rows: invoices.slice(0, 8).map((invoice) => ({ label: invoice.id, value: formatCurrency(invoice.amount), detail: getPatientName(invoice.patientId), status: invoice.status })),
        actionLabel: 'Review billing',
      },
      discharges: {
        title: 'Discharges',
        description: 'Coordinate departures and keep discharge summaries moving between staff and doctors.',
        icon: DoorOpen,
        metrics: [
          { label: 'To coordinate', value: draftDischarges.length, hint: 'Summaries in progress' },
          { label: 'Today completed', value: today.filter((item) => item.status === 'completed').length, hint: 'Closed visits' },
        ],
        rows: draftDischarges.slice(0, 8).map((item) => ({ label: getPatientName(item.patientId), value: formatDate(item.dischargeDate), detail: item.diagnosis, status: item.status })),
        actionLabel: 'Coordinate discharge',
      },
    }[requestedView as 'appointments' | 'billing' | 'discharges']

    if (viewContent) return <FocusedPortalView {...viewContent} onAction={() => setWorkspaceOpen(true)} />
  }

  return (
    <>
      <PageHeader
        title="Reception dashboard"
        subtitle="Front desk flow, appointment approvals and billing."
        icon={<UserCheck className="h-6 w-6" aria-hidden="true" />}
        actions={
          <Button variant="primary" onClick={() => setWorkspaceOpen(true)}>
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Register walk-in
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Appointments today"
          value={today.length}
          hint={`${pendingCount} awaiting approval`}
          tone={pendingCount > 0 ? 'warning' : 'brand'}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Collected"
          value={formatCurrency(collected)}
          hint="Settled invoices"
          tone="positive"
          icon={<Banknote className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Outstanding"
          value={formatCurrency(outstanding)}
          hint={`${openInvoices.length} unpaid invoices`}
          tone="danger"
          icon={<Banknote className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Discharge coordination"
          value={draftDischarges.length}
          hint="Summaries to verify"
          tone="warning"
          icon={<DoorOpen className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Patient flow overview"
          description="Live view of where every patient is right now"
          icon={<Activity className="h-5 w-5" aria-hidden="true" />}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {flowStages.map((s) => (
            <div
              key={s.label}
              className="card-shadow rounded-2xl border border-cyan-200/70 bg-white p-5"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${s.className}`} aria-hidden="true" />
                <p className="text-sm font-medium text-cyan-700">{s.label}</p>
              </div>
              <p className="tabular mt-2 text-3xl font-bold tracking-tight text-cyan-950">
                {s.count}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Upcoming appointments"
          description="Requests raised through the app, WhatsApp bot and walk-in desk"
          icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
        />
        <DataTable
          caption="Upcoming and pending appointments"
          rows={appointments.filter((a) => a.date >= todayKey() && a.status !== 'cancelled')}
          rowKey={(a) => a.id}
          columns={[
            {
              key: 'patient',
              header: 'Patient',
              primary: true,
              render: (a) => (
                <span className="flex items-center gap-3">
                  <Avatar
                    initials={patientInitials(getPatientName(a.patientId))}
                    name={getPatientName(a.patientId)}
                    size="sm"
                  />
                  <span>
                    <span className="block font-semibold">
                      {getPatientName(a.patientId)}
                    </span>
                    <span className="text-cyan-700">{a.reason}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'when',
              header: 'When',
              render: (a) => (
                <span className="tabular">
                  <span className="block">{formatDate(a.date)}</span>
                  <span className="text-cyan-700">{a.time}</span>
                </span>
              ),
            },
            {
              key: 'doctor',
              header: 'Doctor',
              render: (a) => (
                <span>
                  <span className="block">{a.doctor}</span>
                  <span className="text-cyan-700">{a.department}</span>
                </span>
              ),
            },
            {
              key: 'source',
              header: 'Source',
              render: (a) => <span className="capitalize">{a.source}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (a) =>
                a.status === 'completed' ? (
                  <StatusPill tone="positive">Completed</StatusPill>
                ) : isConfirmed(a) ? (
                  <StatusPill tone="positive">Confirmed</StatusPill>
                ) : (
                  <StatusPill tone="warning">Pending</StatusPill>
                ),
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              render: (a) =>
                a.status === 'completed' || isConfirmed(a) ? (
                  <span className="text-sm text-cyan-700">—</span>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => updateAppointment(a.id, 'confirmed')}
                  >
                    Approve
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Billing management"
            description="Payments, confirmations and invoice generation"
            icon={<Banknote className="h-5 w-5" aria-hidden="true" />}
          />
          <DataTable
            caption="Patient invoices and payment status"
            rows={invoices}
            rowKey={(i) => i.id}
            columns={[
              {
                key: 'invoice',
                header: 'Invoice',
                primary: true,
                render: (i) => (
                  <span>
                    <span className="tabular block font-semibold">{i.id}</span>
                    <span className="text-cyan-700">{getPatientName(i.patientId)}</span>
                  </span>
                ),
              },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (i) => <span className="tabular">{formatCurrency(i.amount)}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (i) => {
                  if (i.status === 'paid') return <StatusPill tone="positive">Paid</StatusPill>
                  if (i.status === 'partial') return <StatusPill tone="warning">Partial</StatusPill>
                  return <StatusPill tone="danger">Unpaid</StatusPill>
                },
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: (i) =>
                  i.status === 'paid' ? (
                    <Button onClick={() => setPrinted((prev) => [...prev, i.id])}>
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      Print
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => updateInvoice(i.id, 'paid', 'Reception desk')}>
                      Mark paid
                    </Button>
                  ),
              },
            ]}
          />
          {printed.length > 0 ? (
            <p className="border-t border-cyan-100 px-5 py-3 text-xs text-cyan-700">
              {printed.length} invoice(s) printed this session.
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Discharge summary coordination"
            description="Verified with staff, awaiting doctor sign-off"
            icon={<DoorOpen className="h-5 w-5" aria-hidden="true" />}
          />
          <ul className="divide-y divide-cyan-100">
            {draftDischarges.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-cyan-950">{getPatientName(d.patientId)}</p>
                  <p className="text-sm text-cyan-700">{d.diagnosis}</p>
                  <p className="tabular text-xs text-cyan-700">
                    Discharge {formatDate(d.dischargeDate)} · {d.completedBy}
                  </p>
                </div>
                {d.status === 'doctor-approved' ? (
                  <StatusPill tone="positive">Complete</StatusPill>
                ) : d.status === 'staff-verified' ? (
                  <StatusPill tone="warning">Awaiting doctor</StatusPill>
                ) : (
                  <StatusPill tone="danger">Draft</StatusPill>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {workspaceOpen ? (
        <DemoWorkspace title="Register walk-in" description="Add a patient to today's front-desk flow." action="Add to queue" onClose={() => setWorkspaceOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <WorkspaceField label="Patient name" />
            <WorkspaceField label="Phone number" />
          </div>
          <WorkspaceField label="Consulting department">
            <select className="mt-2 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 text-sm font-normal text-cyan-900">
              <option>General Medicine</option><option>Cardiology</option><option>Endocrinology</option>
            </select>
          </WorkspaceField>
          <WorkspaceField label="Reason for visit" />
        </DemoWorkspace>
      ) : null}
    </>
  )
}
