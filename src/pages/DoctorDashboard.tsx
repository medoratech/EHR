import {
  AlertTriangle,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  FileText,
  ListChecks,
  NotebookPen,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Avatar, Badge, Button, Card, CardHeader, MetricTile, PageHeader, ProgressBar, StatusPill } from '../components/ui/primitives'
import { DataTable } from '../components/ui/Table'
import { LineChart } from '../components/ui/Chart'
import {
  appointmentsFor,
  consultationVolume,
  openTasks,
  patients,
  patientInitials,
  problemSummaryFor,
  severityRank,
  tasks,
  users,
  vitals,
} from '../data/api'
import type { Severity, Task } from '../data/types'
import { useDemoStore } from '../state/useDemoStore'
import { announceDemoAction } from '../lib/demoActions'
import { DemoWorkspace, WorkspaceField } from '../components/ui/DemoWorkspace'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'

const nurses = users.filter((u) => u.role === 'staff')

export function DoctorDashboard() {
  const [searchParams] = useSearchParams()
  const { labTests } = useDemoStore()
  const [query, setQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | Severity>('all')
  const [approved, setApproved] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [delegated, setDelegated] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const today = appointmentsFor()
  const newLabReports = labTests.filter((report) => report.isNew && report.reportUploaded)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return patients
      .filter((p) => (riskFilter === 'all' ? true : p.risk === riskFilter))
      .filter((p) =>
        q === ''
          ? true
          : [p.name, p.mrn, p.department, ...p.conditions]
              .join(' ')
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) => severityRank(a.risk) - severityRank(b.risk))
  }, [query, riskFilter])

  const unapproved = patients.filter(
    (p) => problemSummaryFor(p.id) && !problemSummaryFor(p.id)?.approvedBy,
  )

  const criticalVitals = vitals.filter((v) => v.severity === 'critical')

  const requestedView = searchParams.get('view') ?? 'overview'
  if (requestedView !== 'overview') {
    const viewContent = {
      patients: {
        title: 'My patients',
        description: 'A focused view of active cases, risk signals and clinical history.',
        icon: Users,
        metrics: [
          { label: 'Active patients', value: filtered.length, hint: 'Matching current filters' },
          { label: 'High risk', value: patients.filter((p) => p.risk !== 'normal').length, hint: 'Needs closer review' },
        ],
        rows: filtered.slice(0, 8).map((patient) => ({ label: patient.name, value: patient.mrn, detail: `${patient.department} · ${patient.conditions.join(', ')}`, status: patient.risk })),
        actionLabel: 'Register patient',
      },
      reports: {
        title: 'Reports to review',
        description: 'New diagnostic results are separated from the wider clinical dashboard so review stays deliberate.',
        icon: FileText,
        metrics: [
          { label: 'New reports', value: newLabReports.length, hint: 'Uploaded since last review' },
          { label: 'Awaiting approval', value: unapproved.length, hint: 'Clinical summaries' },
        ],
        rows: newLabReports.slice(0, 8).map((report) => ({ label: report.testName, value: report.result ?? 'Ready for review', detail: report.category, status: 'New' })),
        actionLabel: 'Review report',
      },
      tasks: {
        title: 'Task delegation',
        description: 'Coordinate ward work and send clear assignments to the care team.',
        icon: ListChecks,
        metrics: [
          { label: 'Open tasks', value: openTasks.length, hint: 'Across the care team' },
          { label: 'Nurses available', value: nurses.length, hint: 'Assignable teammates' },
        ],
        rows: tasks.slice(0, 8).map((task) => ({ label: task.title, value: task.assignedTo, detail: task.kind, status: task.status })),
        actionLabel: 'Delegate task',
      },
    }[requestedView as 'patients' | 'reports' | 'tasks']

    if (viewContent) {
      return <FocusedPortalView {...viewContent} onAction={() => setWorkspaceOpen(true)} />
    }
  }

  function assignTask(task: Task) {
    if (!assignments[task.id]) return
    setDelegated((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]))
  }

  return (
    <>
      <PageHeader
        title="Doctor dashboard"
        subtitle="Cases, problem summaries and task delegation for your department."
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        actions={
          <Button variant="primary" onClick={() => setWorkspaceOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Register patient
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Consultations today"
          value={today.length}
          hint={`${today.filter((a) => a.type === 'IPD').length} inpatient`}
          icon={<Stethoscope className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Awaiting approval"
          value={unapproved.length}
          hint="AI summaries to verify"
          severity="abnormal"
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="New reports"
          value={newLabReports.length}
          hint="Uploaded since last review"
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Critical vitals"
          value={criticalVitals.length}
          hint="Needs immediate review"
          severity="critical"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Today's list"
          description="OPD and IPD patients, sorted by urgency"
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
        />
        <div className="flex flex-col gap-3 border-b border-cyan-100 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="doc-search" className="text-sm font-semibold text-cyan-900">
              Search patients
            </label>
            <input
              id="doc-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, MRN, condition or department"
              className="mt-1.5 h-11 w-full rounded-xl border border-cyan-300 px-3 text-base text-cyan-900 placeholder:text-cyan-600"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-cyan-900">Risk</legend>
            <div className="mt-1.5 flex gap-2">
              {(['all', 'critical', 'abnormal', 'normal'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskFilter(r)}
                  aria-pressed={riskFilter === r}
                  className={`min-h-11 cursor-pointer rounded-xl px-3 text-sm font-medium capitalize transition-colors duration-200 ${
                    riskFilter === r
                      ? 'bg-cyan-700 text-white'
                      : 'bg-white text-cyan-800 ring-1 ring-cyan-300 ring-inset hover:bg-cyan-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <DataTable
          caption="Patient list with demographics, conditions and risk level"
          rows={filtered}
          rowKey={(p) => p.id}
          emptyMessage="No patients match this filter."
          columns={[
            {
              key: 'patient',
              header: 'Patient',
              primary: true,
              render: (p) => (
                <span className="flex items-center gap-3">
                  <Avatar initials={patientInitials(p.name)} name={p.name} size="sm" />
                  <span>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="tabular text-cyan-700">
                      {p.mrn} · {p.age} yrs
                    </span>
                  </span>
                </span>
              ),
            },
            {
              key: 'department',
              header: 'Department',
              render: (p) => p.department,
            },
            {
              key: 'conditions',
              header: 'Conditions',
              render: (p) => (
                <span className="flex flex-wrap gap-1">
                  {p.conditions.map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </span>
              ),
            },
            {
              key: 'allergies',
              header: 'Allergies',
              render: (p) =>
                p.allergies.includes('None known') ? (
                  <span className="text-cyan-700">Nil</span>
                ) : (
                  <span className="font-medium text-red-700">{p.allergies.join(', ')}</span>
                ),
            },
            {
              key: 'risk',
              header: 'Risk',
              render: (p) => <StatusPill severity={p.risk}>{p.risk}</StatusPill>,
            },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Problem summary review"
            description="AI-generated findings awaiting your sign-off"
            icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
          />
          <ul className="divide-y divide-cyan-100">
            {unapproved.map((p) => {
              const summary = problemSummaryFor(p.id)
              if (!summary) return null
              const isApproved = approved.includes(p.id)
              return (
                <li key={p.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-cyan-950">
                        {p.name}
                        {summary.aiGenerated ? (
                          <span className="ml-2 text-xs font-medium text-cyan-700">
                            AI draft
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-cyan-800">{summary.headline}</p>
                    </div>
                    {isApproved ? (
                      <StatusPill severity="normal">Approved</StatusPill>
                    ) : (
                      <div className="flex shrink-0 gap-2">
                        <Button onClick={() => announceDemoAction(`Editing ${p.name}'s problem summary.`)}>Edit</Button>
                        <Button
                          variant="primary"
                          onClick={() => setApproved((prev) => [...prev, p.id])}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                  <ul className="mt-2.5 list-disc space-y-1 pl-5 text-sm text-cyan-700">
                    {summary.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="New report summaries"
            description="Flagged as unread by the laboratory"
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          />
          <DataTable
            caption="New diagnostic reports awaiting review"
            rows={newLabReports}
            rowKey={(l) => l.id}
            columns={[
              {
                key: 'test',
                header: 'Test',
                primary: true,
                render: (l) => (
                  <span>
                    <span className="block font-semibold">{l.testName}</span>
                    <span className="text-cyan-700">{l.category}</span>
                  </span>
                ),
              },
              {
                key: 'result',
                header: 'Result',
                render: (l) => <span className="text-cyan-800">{l.result}</span>,
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: (l) => (
                  <Button onClick={() => announceDemoAction(`Reviewing ${l.testName} for the care team.`)}>
                    Review
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Task assignment"
            description="Delegate duties to nursing staff and track completion"
            icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
          />
          <ul className="divide-y divide-cyan-100">
            {tasks.map((t) => {
              const assignedTo = assignments[t.id] ?? t.assignedTo
              const nurse = nurses.find((n) => n.name === assignedTo)
              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-cyan-950">{t.title}</p>
                    <p className="text-sm text-cyan-700">
                      Due{' '}
                      {new Date(t.due).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · status {t.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`assign-${t.id}`}>
                      Assign {t.title} to
                    </label>
                    <select
                      id={`assign-${t.id}`}
                      value={assignedTo}
                      onChange={(e) =>
                        setAssignments((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      className="h-11 cursor-pointer rounded-xl border border-cyan-300 bg-white px-3 text-sm text-cyan-900"
                    >
                      {nurses.map((n) => (
                        <option key={n.id} value={n.name}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      disabled={!assignments[t.id] || assignments[t.id] === t.assignedTo}
                      onClick={() => assignTask(t)}
                    >
                      Assign
                    </Button>
                    {delegated.includes(t.id) ? (
                      <StatusPill severity="normal">Delegated</StatusPill>
                    ) : nurse ? (
                      <StatusPill severity={nurse.status === 'active' ? 'normal' : 'abnormal'}>
                        {nurse.status}
                      </StatusPill>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Caseload"
            description="Open tasks by urgency"
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
          />
          <div className="space-y-5 p-5">
            <ProgressBar
              value={openTasks.filter((t) => t.severity === 'critical').length}
              max={openTasks.length || 1}
              label="Critical"
              severity="critical"
            />
            <ProgressBar
              value={openTasks.filter((t) => t.severity === 'abnormal').length}
              max={openTasks.length || 1}
              label="Abnormal"
              severity="abnormal"
            />
            <ProgressBar
              value={openTasks.filter((t) => t.severity === 'normal').length}
              max={openTasks.length || 1}
              label="Routine"
            />
            <p className="flex items-center gap-2 text-sm text-cyan-700">
              <Users className="h-4 w-4" aria-hidden="true" />
              {patients.length} patients under care · {today.length} seen today
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Consultation volume"
            description="Last seven days, all clinicians"
            icon={<ChartColumn className="h-5 w-5" aria-hidden="true" />}
          />
          <div className="p-4">
            <div className="overflow-hidden rounded-2xl border border-cyan-200/70 bg-cyan-50/70">
              <LineChart
                title="Consultations completed per day over the last seven days"
                data={consultationVolume}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Consultation note"
            description="Draft saved to the active case"
            icon={<NotebookPen className="h-5 w-5" aria-hidden="true" />}
          />
          <div className="p-5">
            <label htmlFor="consult-note" className="text-sm font-semibold text-cyan-900">
              Clinical note
            </label>
            <textarea
              id="consult-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setNoteSaved(false)
              }}
              rows={5}
              placeholder="Document findings, plan and follow-up interval…"
              className="mt-2 w-full rounded-xl border border-cyan-300 p-3 text-base text-cyan-900 placeholder:text-cyan-600"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button variant="primary" onClick={() => setNoteSaved(true)}>
                Save to case
              </Button>
              {noteSaved ? <StatusPill severity="normal">Saved</StatusPill> : null}
            </div>
          </div>
        </Card>
      </div>
      {workspaceOpen ? (
        <DemoWorkspace title="Register patient" description="Create a patient profile for the clinical team." action="Register patient" onClose={() => setWorkspaceOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <WorkspaceField label="Full name" />
            <WorkspaceField label="Medical record number" />
          </div>
          <WorkspaceField label="Department">
            <select className="mt-2 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 text-sm font-normal text-cyan-900">
              <option>General Medicine</option><option>Endocrinology</option><option>Cardiology</option>
            </select>
          </WorkspaceField>
          <WorkspaceField label="Reason for visit" />
        </DemoWorkspace>
      ) : null}
    </>
  )
}
