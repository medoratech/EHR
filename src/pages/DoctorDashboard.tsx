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
import { dailyVolume, patientInitials, problemSummaryFor, severityRank } from '../data/api'
import { TASK_KIND_LABELS, URGENCY_LABELS, URGENCY_ORDER } from '../data/labels'
import type { Severity, TaskKind } from '../data/types'
import { clinicInstant, dateKey, todayKey } from '../lib/clock'
import { formatDateTime, formatDay, humanize } from '../lib/format'
import { useEhr } from '../state/useEhr'
import { Workspace, WorkspaceField, WorkspaceSelect } from '../components/ui/Workspace'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'
import { PatientFields } from '../components/ui/PatientFields'
import { readPatient } from '../components/ui/readPatient'

type DoctorWorkspace = { kind: 'register' } | { kind: 'task' } | { kind: 'summary'; patientId: string }

export function DoctorDashboard() {
  const [searchParams] = useSearchParams()
  const {
    patients,
    appointments,
    tasks,
    users,
    vitals,
    labTests,
    problemSummaries,
    clinicalNotes,
    focusedPatient,
    patientName,
    registerPatient,
    createTask,
    updateTask,
    acknowledgeLabReport,
    approveProblemSummary,
    editProblemSummary,
    addClinicalNote,
    triageAssessments,
    reviewSymptomCheck,
  } = useEhr()
  const [query, setQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | Severity>('all')
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [notePatientId, setNotePatientId] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<DoctorWorkspace | null>(null)

  const nurses = users.filter((u) => u.role === 'staff' && u.status === 'active')
  const today = appointments.filter((a) => a.date === todayKey())
  const newLabReports = labTests.filter((report) => report.isNew && report.reportUploaded)
  const openTasks = tasks.filter((t) => t.status !== 'done')
  const consultationVolume = dailyVolume(
    appointments.filter((a) => a.status === 'completed'),
    (a) => a.date,
  )
  // Unreviewed first, then most urgent, then newest.
  const symptomChecks = [...triageAssessments]
    .sort(
      (a, b) =>
        Number(Boolean(a.reviewedBy)) - Number(Boolean(b.reviewedBy)) ||
        URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 6)
  const unreviewedChecks = triageAssessments.filter((check) => !check.reviewedBy).length
  const noteTarget = notePatientId ?? focusedPatient?.id ?? patients[0]?.id ?? ''
  const recentNotes = clinicalNotes.filter((n) => n.patientId === noteTarget).slice(0, 3)

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
  }, [patients, query, riskFilter])

  const unapproved = patients.filter((p) => {
    const summary = problemSummaryFor(problemSummaries, p.id)
    return summary && !summary.approvedBy
  })

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
        rows: newLabReports.slice(0, 8).map((report) => ({ label: report.testName, value: report.result ?? 'Ready for review', detail: `${patientName(report.patientId)} · ${report.category}`, status: 'New' })),
        actionLabel: 'Mark all reviewed',
      },
      tasks: {
        title: 'Task delegation',
        description: 'Coordinate ward work and send clear assignments to the care team.',
        icon: ListChecks,
        metrics: [
          { label: 'Open tasks', value: openTasks.length, hint: 'Across the care team' },
          { label: 'Nurses available', value: nurses.length, hint: 'Assignable teammates' },
        ],
        rows: tasks.slice(0, 8).map((task) => ({ label: task.title, value: task.assignedTo, detail: TASK_KIND_LABELS[task.kind], status: humanize(task.status) })),
        actionLabel: 'Delegate task',
      },
    }[requestedView as 'patients' | 'reports' | 'tasks']

    if (viewContent) {
      const onAction =
        requestedView === 'reports'
          ? () => void Promise.all(newLabReports.map((report) => acknowledgeLabReport(report.id)))
          : () => setWorkspace({ kind: requestedView === 'tasks' ? 'task' : 'register' })
      return (
        <>
          <FocusedPortalView {...viewContent} onAction={newLabReports.length || requestedView !== 'reports' ? onAction : undefined} />
          {renderWorkspace()}
        </>
      )
    }
  }

  async function assignTask(taskId: string) {
    const assignedToId = assignments[taskId]
    if (!assignedToId) return
    if (await updateTask(taskId, { assignedToId })) {
      setAssignments((prev) => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    }
  }

  async function saveNote() {
    if (!noteTarget || !note.trim()) return
    if (await addClinicalNote(noteTarget, note.trim())) setNote('')
  }

  return (
    <>
      <PageHeader
        title="Doctor dashboard"
        subtitle="Cases, problem summaries and task delegation for your department."
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setWorkspace({ kind: 'task' })}>
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              Delegate task
            </Button>
            <Button variant="primary" onClick={() => setWorkspace({ kind: 'register' })}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Register patient
            </Button>
          </div>
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
          {unapproved.length === 0 ? (
            <p className="px-5 py-6 text-sm text-cyan-700">Every problem summary has been signed off.</p>
          ) : null}
          <ul className="divide-y divide-cyan-100">
            {unapproved.map((p) => {
              const summary = problemSummaryFor(problemSummaries, p.id)
              if (!summary) return null
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
                    <div className="flex shrink-0 gap-2">
                      <Button onClick={() => setWorkspace({ kind: 'summary', patientId: p.id })}>Edit</Button>
                      <Button variant="primary" onClick={() => void approveProblemSummary(p.id)}>
                        Approve
                      </Button>
                    </div>
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
            emptyMessage="No new reports to review."
            columns={[
              {
                key: 'test',
                header: 'Test',
                primary: true,
                render: (l) => (
                  <span>
                    <span className="block font-semibold">{l.testName}</span>
                    <span className="text-cyan-700">{patientName(l.patientId)} · {l.category}</span>
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
                  <Button onClick={() => void acknowledgeLabReport(l.id)}>
                    Mark reviewed
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Symptom checks"
          description={`${unreviewedChecks} awaiting review · OLDCARTS histories submitted by patients and staff`}
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        />
        {symptomChecks.length === 0 ? (
          <p className="px-5 py-6 text-sm text-cyan-700">No symptom checks yet.</p>
        ) : (
          <ul className="divide-y divide-cyan-100">
            {symptomChecks.map((check) => (
              <li key={check.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-cyan-950">
                      {patientName(check.patientId)} · {check.answers.chiefComplaint}
                    </p>
                    <p className="tabular text-xs text-cyan-600">
                      {formatDateTime(check.createdAt)} · severity {check.answers.severity}/10
                      {check.department ? ` · ${check.department}` : ''}
                      {check.source === 'rules' ? ' · safety rules only' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill tone={URGENCY_LABELS[check.urgency].tone}>{URGENCY_LABELS[check.urgency].label}</StatusPill>
                    {check.reviewedBy ? (
                      <span className="text-xs text-cyan-600">Reviewed by {check.reviewedBy}</span>
                    ) : (
                      <Button onClick={() => void reviewSymptomCheck(check.id)}>Mark reviewed</Button>
                    )}
                  </div>
                </div>
                {check.redFlags.length ? (
                  <p className="mt-2 text-sm font-medium text-red-700">Red flags: {check.redFlags.join('; ')}</p>
                ) : null}
                {check.clinicalSummary ? <p className="mt-2 text-sm text-cyan-800">{check.clinicalSummary}</p> : null}
                {check.considerations?.length ? (
                  <p className="mt-1 text-xs text-cyan-700">Consider: {check.considerations.join(' · ')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Task assignment"
            description="Delegate duties to nursing staff and track completion"
            icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
          />
          <ul className="divide-y divide-cyan-100">
            {tasks.map((t) => {
              const assignedToId = assignments[t.id] ?? t.assignedToId
              const nurse = nurses.find((n) => n.id === assignedToId)
              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-cyan-950">{t.title}</p>
                    <p className="text-sm text-cyan-700">
                      Due{' '}
                      {formatDay(t.due)}{' '}
                      · {patientName(t.patientId)} · {humanize(t.status)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`assign-${t.id}`}>
                      Assign {t.title} to
                    </label>
                    <select
                      id={`assign-${t.id}`}
                      value={assignedToId}
                      disabled={t.status === 'done'}
                      onChange={(e) =>
                        setAssignments((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      className="h-11 cursor-pointer rounded-xl border border-cyan-300 bg-white px-3 text-sm text-cyan-900"
                    >
                      {nurse ? null : <option value={t.assignedToId}>{t.assignedTo}</option>}
                      {nurses.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                    {t.status === 'done' ? (
                      <Button onClick={() => void updateTask(t.id, { status: 'reverted' })}>Send back</Button>
                    ) : (
                      <Button
                        variant="primary"
                        disabled={!assignments[t.id] || assignments[t.id] === t.assignedToId}
                        onClick={() => void assignTask(t.id)}
                      >
                        Assign
                      </Button>
                    )}
                    <StatusPill severity={t.status === 'reverted' ? 'abnormal' : 'normal'}>
                      {humanize(t.status)}
                    </StatusPill>
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
            description="Saved to the patient's case history"
            icon={<NotebookPen className="h-5 w-5" aria-hidden="true" />}
          />
          <div className="p-5">
            <label htmlFor="note-patient" className="text-sm font-semibold text-cyan-900">
              Patient
            </label>
            <select
              id="note-patient"
              value={noteTarget}
              onChange={(e) => setNotePatientId(e.target.value)}
              className="mt-1.5 h-11 w-full cursor-pointer rounded-xl border border-cyan-300 bg-white px-3 text-sm text-cyan-900"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.mrn}
                </option>
              ))}
            </select>
            <label htmlFor="consult-note" className="mt-4 block text-sm font-semibold text-cyan-900">
              Clinical note
            </label>
            <textarea
              id="consult-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              maxLength={10_000}
              placeholder="Document findings, plan and follow-up interval…"
              className="mt-2 w-full rounded-xl border border-cyan-300 p-3 text-base text-cyan-900 placeholder:text-cyan-600"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button variant="primary" disabled={!note.trim()} onClick={() => void saveNote()}>
                Save to case
              </Button>
            </div>
            {recentNotes.length ? (
              <ul className="mt-4 space-y-2 border-t border-cyan-100 pt-4">
                {recentNotes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-cyan-50/70 px-3 py-2.5">
                    <p className="text-sm whitespace-pre-line text-cyan-900">{n.body}</p>
                    <p className="tabular mt-1 text-xs text-cyan-600">
                      {n.author} · {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      </div>
      {renderWorkspace()}
    </>
  )

  function renderWorkspace() {
    if (!workspace) return null
    const close = () => setWorkspace(null)
    if (workspace.kind === 'register') {
      return (
        <Workspace
          title="Register patient"
          description="Create a patient record for the clinical team. The MRN is assigned automatically."
          action="Register patient"
          onClose={close}
          onComplete={(values) => registerPatient(readPatient(values))}
        >
          <PatientFields />
        </Workspace>
      )
    }
    if (workspace.kind === 'task') {
      return (
        <Workspace
          title="Delegate task"
          description="Send a clear assignment to a nurse on the ward."
          action="Assign task"
          onClose={close}
          onComplete={(values) =>
            createTask({
              title: values.title,
              kind: values.kind as TaskKind,
              patientId: values.patientId,
              assignedToId: values.assignedToId,
              due: clinicInstant(values.dueDate, values.dueTime).toISOString(),
              severity: values.severity as Severity,
            })
          }
        >
          <WorkspaceField label="Task" name="title" placeholder="e.g. Repeat vitals in 2 hours" />
          <div className="grid gap-4 sm:grid-cols-2">
            <WorkspaceField label="Patient">
              <WorkspaceSelect
                name="patientId"
                defaultValue={focusedPatient?.id}
                options={patients.map((p) => ({ value: p.id, label: p.name }))}
              />
            </WorkspaceField>
            <WorkspaceField label="Assign to">
              <WorkspaceSelect name="assignedToId" options={nurses.map((n) => ({ value: n.id, label: n.name }))} />
            </WorkspaceField>
            <WorkspaceField label="Type">
              <WorkspaceSelect
                name="kind"
                options={Object.entries(TASK_KIND_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </WorkspaceField>
            <WorkspaceField label="Urgency">
              <WorkspaceSelect
                name="severity"
                options={[
                  { value: 'normal', label: 'Routine' },
                  { value: 'abnormal', label: 'Soon' },
                  { value: 'critical', label: 'Urgent' },
                ]}
              />
            </WorkspaceField>
            <WorkspaceField label="Due date" name="dueDate" type="date" defaultValue={todayKey()} min={todayKey()} max={dateKey(30)} />
            <WorkspaceField label="Due time" name="dueTime" type="time" defaultValue="15:00" />
          </div>
        </Workspace>
      )
    }
    const summary = problemSummaryFor(problemSummaries, workspace.patientId)
    return (
      <Workspace
        title={`Problem summary · ${patientName(workspace.patientId)}`}
        description="Saving records you as the author and signs the summary off."
        action="Save and sign"
        onClose={close}
        onComplete={(values) =>
          editProblemSummary(workspace.patientId, {
            headline: values.headline,
            issues: values.issues.split('\n').map((line) => line.trim()).filter(Boolean),
          })
        }
      >
        <WorkspaceField label="Headline" name="headline" defaultValue={summary?.headline} />
        <WorkspaceField label="Active issues (one per line)">
          <textarea
            name="issues"
            required
            rows={5}
            defaultValue={summary?.issues.join('\n')}
            className="mt-2 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 text-sm font-normal text-cyan-900 outline-none focus:border-cyan-500 focus:bg-white"
          />
        </WorkspaceField>
      </Workspace>
    )
  }
}
