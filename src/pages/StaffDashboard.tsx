import { Activity, ClipboardList, FileCheck2, PackageCheck, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  MetricTile,
  PageHeader,
  StatusPill,
  type Tone,
} from '../components/ui/primitives'
import { DataTable } from '../components/ui/Table'
import { latestVitals, patientInitials } from '../data/api'
import { TASK_KIND_LABELS } from '../data/labels'
import { clinicHour } from '../lib/clock'
import { formatDate, formatDay, humanize } from '../lib/format'
import type { DischargeSummary, Task, TaskStatus } from '../data/types'
import { useAuth } from '../state/useAuth'
import { useEhr } from '../state/useEhr'
import { Workspace, WorkspaceField, WorkspaceSelect } from '../components/ui/Workspace'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'

const statusTone: Record<TaskStatus, Tone> = {
  open: 'warning',
  'in-progress': 'brand',
  reverted: 'danger',
  done: 'positive',
}

export function StaffDashboard() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const {
    tasks: liveTasks,
    patients,
    vitals,
    dischargeSummaries,
    focusedPatient,
    patientName: getPatientName,
    updateTask,
    recordVitals,
    updateDischarge,
  } = useEhr()
  const [workspace, setWorkspace] = useState<{ kind: 'vitals' } | { kind: 'discharge'; summary: DischargeSummary } | null>(null)

  const myTasks = liveTasks.filter((t) => t.assignedToId === user?.id && t.status !== 'done')
  const dueBeforeNoon = myTasks.filter((t) => clinicHour(t.due) < 12).length
  const draftDischarges = dischargeSummaries.filter((d) => d.status !== 'doctor-approved')

  function update(task: Task, status: TaskStatus) {
    void updateTask(task.id, { status })
  }

  const openCount = liveTasks.filter((task) => task.status === 'open' || task.status === 'in-progress').length
  const revertedCount = liveTasks.filter((task) => task.status === 'reverted').length

  const requestedView = searchParams.get('view') ?? 'workspace'
  if (requestedView !== 'workspace') {
    const viewContent = {
      tasks: {
        title: 'Task queue',
        description: 'Complete assigned duties and send clear updates back to the doctor.',
        icon: ClipboardList,
        metrics: [
          { label: 'Assigned to me', value: myTasks.length, hint: 'Current ward duties' },
          { label: 'Still open', value: openCount, hint: 'Across the care team' },
        ],
        rows: myTasks.slice(0, 8).map((task) => ({ label: task.title, value: formatDay(task.due), detail: `${getPatientName(task.patientId)} · ${TASK_KIND_LABELS[task.kind]}`, status: humanize(task.status) })),
        actionLabel: 'Open task queue',
      },
      vitals: {
        title: 'Vital updates',
        description: 'Record and review the latest patient readings in a focused bedside workspace.',
        icon: Activity,
        metrics: [
          { label: 'Patients monitored', value: patients.length, hint: 'Ward records' },
          { label: 'Critical readings', value: patients.filter((patient) => latestVitals(vitals, patient.id)?.severity === 'critical').length, hint: 'Needs immediate review' },
        ],
        rows: patients.slice(0, 8).map((patient) => ({ label: patient.name, value: latestVitals(vitals, patient.id)?.bloodPressure ?? 'No reading', detail: patient.department, status: latestVitals(vitals, patient.id) ? 'Recorded' : 'Awaiting update' })),
        actionLabel: 'Record vitals',
      },
      discharges: {
        title: 'Discharges',
        description: 'Review summaries waiting for verification before patients leave the ward.',
        icon: FileCheck2,
        metrics: [
          { label: 'Draft summaries', value: draftDischarges.length, hint: 'Waiting for sign-off' },
          { label: 'Sent back', value: revertedCount, hint: 'Doctor feedback required' },
        ],
        rows: draftDischarges.slice(0, 8).map((item) => ({ label: getPatientName(item.patientId), value: formatDay(item.dischargeDate), detail: item.diagnosis, status: item.status === 'draft' ? 'Needs review' : 'Awaiting doctor' })),
        actionLabel: 'Review discharge',
      },
    }[requestedView as 'tasks' | 'vitals' | 'discharges']

    if (viewContent) {
      const firstDraft = draftDischarges.find((d) => d.status === 'draft')
      const onAction =
        requestedView === 'vitals'
          ? () => setWorkspace({ kind: 'vitals' })
          : requestedView === 'discharges' && firstDraft
            ? () => setWorkspace({ kind: 'discharge', summary: firstDraft })
            : undefined
      return (
        <>
          <FocusedPortalView {...viewContent} onAction={onAction} />
          {renderWorkspace()}
        </>
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Staff dashboard"
        subtitle="Assigned duties, vitals capture and discharge summaries for your ward."
        icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
        actions={
          <Button variant="primary" onClick={() => setWorkspace({ kind: 'vitals' })}>
            <Activity className="h-4 w-4" aria-hidden="true" />
            Record vitals
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Tasks assigned to me"
          value={myTasks.length}
          hint={`${dueBeforeNoon} due before noon`}
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Still open"
          value={openCount}
          hint="Across all staff"
          tone="warning"
          icon={<Activity className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Sent back for review"
          value={revertedCount}
          hint="Doctor feedback required"
          tone="danger"
          icon={<Undo2 className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Discharge summaries"
          value={draftDischarges.length}
          hint="Not yet doctor-approved"
          icon={<FileCheck2 className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader
          title="My task queue"
          description="Complete a task to send an update back to the assigning doctor"
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
        />
        {myTasks.length === 0 ? (
          <p className="px-5 py-6 text-sm text-cyan-700">Nothing assigned to you right now.</p>
        ) : null}
        <ul className="divide-y divide-cyan-100">
          {myTasks.map((t) => {
            const status = t.status
            return (
              <li
                key={t.id}
                className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar
                    initials={patientInitials(getPatientName(t.patientId))}
                    name={getPatientName(t.patientId)}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-cyan-950">{t.title}</p>
                    <p className="text-sm text-cyan-700">
                      {getPatientName(t.patientId)} · due {formatDay(t.due)}
                    </p>
                    <p className="text-xs text-cyan-700">
                      Assigned by {t.assignedBy} · {TASK_KIND_LABELS[t.kind]}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={statusTone[status]}>{humanize(status)}</StatusPill>
                  {status === 'done' ? null : (
                    <>
                      <Button
                        onClick={() => update(t, 'in-progress')}
                        disabled={status === 'in-progress'}
                      >
                        {status === 'reverted' ? 'Reopen' : 'Start'}
                      </Button>
                      <Button
                        variant="primary"
                        disabled={status === 'reverted'}
                        onClick={() => update(t, 'done')}
                      >
                        Mark done
                      </Button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Vital updates"
            description="Recorded readings feed the doctor and patient dashboards instantly"
            icon={<Activity className="h-5 w-5" aria-hidden="true" />}
          />
          <DataTable
            caption="Vitals recorded across the ward"
            rows={patients}
            rowKey={(p) => p.id}
            columns={[
              {
                key: 'patient',
                header: 'Patient',
                primary: true,
                render: (p) => (
                  <span>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="tabular text-cyan-700">{p.mrn}</span>
                  </span>
                ),
              },
              {
                key: 'entry',
                header: 'Entry',
                render: (p) => {
                  const record = latestVitals(vitals, p.id)
                  if (!record) return <span className="text-cyan-700">Not captured</span>
                  return (
                    <span className="tabular text-cyan-800">
                      {record.bloodPressure} · {record.spo2}% SpO₂
                    </span>
                  )
                },
              },
              {
                key: 'severity',
                header: 'Flag',
                render: (p) => {
                  const record = latestVitals(vitals, p.id)
                  return record ? (
                    <StatusPill severity={record.severity}>{record.severity}</StatusPill>
                  ) : (
                    <span className="text-cyan-700">—</span>
                  )
                },
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader
            title="Discharge summary management"
            description="Verify ward records before the doctor signs off"
            icon={<FileCheck2 className="h-5 w-5" aria-hidden="true" />}
          />
          {draftDischarges.length === 0 ? (
            <p className="px-5 py-6 text-sm text-cyan-700">No discharge summaries in progress.</p>
          ) : null}
          <ul className="divide-y divide-cyan-100">
            {draftDischarges.map((d) => {
              return (
                <li key={d.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-cyan-950">
                        {getPatientName(d.patientId)}
                      </p>
                      <p className="text-sm text-cyan-700">{d.diagnosis}</p>
                      <p className="tabular mt-0.5 text-xs text-cyan-700">
                        Admitted {formatDate(d.admissionDate)} · discharge{' '}
                        {formatDate(d.dischargeDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {d.status === 'staff-verified' ? (
                        <StatusPill tone="positive">Verified · awaiting doctor</StatusPill>
                      ) : (
                        <>
                          <Button onClick={() => setWorkspace({ kind: 'discharge', summary: d })}>Edit</Button>
                          <Button
                            variant="primary"
                            onClick={() => void updateDischarge(d.id, { status: 'staff-verified' })}
                          >
                            Verify
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Task feedback loop"
          description="Completed tasks revert to the doctor for verification and further action"
          icon={<PackageCheck className="h-5 w-5" aria-hidden="true" />}
        />
        <DataTable
          caption="Task feedback status"
          rows={liveTasks}
          rowKey={(t) => t.id}
          columns={[
            {
              key: 'task',
              header: 'Task',
              primary: true,
              render: (t) => (
                <span>
                  <span className="block font-semibold">{t.title}</span>
                  <span className="text-cyan-700">{getPatientName(t.patientId)}</span>
                </span>
              ),
            },
            {
              key: 'assignee',
              header: 'Assigned to',
              render: (t) => t.assignedTo,
            },
            {
              key: 'status',
              header: 'Status',
              render: (t) => <StatusPill tone={statusTone[t.status]}>{humanize(t.status)}</StatusPill>,
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              render: (t) =>
                t.status === 'reverted' && t.assignedToId === user?.id ? (
                  <Button onClick={() => update(t, 'in-progress')}>Reopen</Button>
                ) : (
                  <span className="text-sm text-cyan-700">—</span>
                ),
            },
          ]}
        />
        <p className="flex items-center gap-2 border-t border-cyan-100 px-5 py-3 text-xs text-cyan-700">
          <PackageCheck className="h-4 w-4" aria-hidden="true" />
          Medicine deliveries confirm back to the pharmacy dashboard once received at the ward.
        </p>
      </Card>
      {renderWorkspace()}
    </>
  )

  function renderWorkspace() {
    if (!workspace) return null
    const close = () => setWorkspace(null)
    if (workspace.kind === 'discharge') {
      const { summary } = workspace
      return (
        <Workspace
          title={`Discharge summary · ${getPatientName(summary.patientId)}`}
          description="Correct the ward record before verifying it for the doctor's sign-off."
          action="Save summary"
          onClose={close}
          onComplete={(values) => updateDischarge(summary.id, { diagnosis: values.diagnosis })}
        >
          <WorkspaceField label="Diagnosis and course" name="diagnosis" defaultValue={summary.diagnosis} />
          <p className="text-xs text-cyan-700">
            Admitted {formatDate(summary.admissionDate)} · planned discharge {formatDate(summary.dischargeDate)}
          </p>
        </Workspace>
      )
    }
    return (
      <Workspace
        title="Record vitals"
        description="Capture the latest bedside readings. Medora flags abnormal values automatically."
        action="Save vitals"
        onClose={close}
        onComplete={(values) =>
          recordVitals({
            patientId: values.patientId,
            bloodPressure: values.bloodPressure,
            heartRate: Number(values.heartRate),
            temperatureF: Number(values.temperatureF),
            spo2: Number(values.spo2),
            weightKg: Number(values.weightKg),
          })
        }
      >
        <WorkspaceField label="Patient">
          <WorkspaceSelect
            name="patientId"
            defaultValue={focusedPatient?.id}
            options={patients.map((patient) => ({ value: patient.id, label: `${patient.name} · ${patient.mrn}` }))}
          />
        </WorkspaceField>
        <div className="grid gap-4 sm:grid-cols-2">
          <WorkspaceField label="Blood pressure" name="bloodPressure" placeholder="120/80" />
          <WorkspaceField label="Heart rate (bpm)" name="heartRate" type="number" min={20} max={250} />
          <WorkspaceField label="Temperature (°F)" name="temperatureF" type="number" min={85} max={110} step={0.1} />
          <WorkspaceField label="SpO₂ (%)" name="spo2" type="number" min={50} max={100} />
          <WorkspaceField label="Weight (kg)" name="weightKg" type="number" min={0.5} max={400} step={0.1} />
        </div>
      </Workspace>
    )
  }
}
