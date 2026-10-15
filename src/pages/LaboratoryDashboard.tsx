import { CheckCircle2, FileClock, FlaskConical, LayoutList, ScanLine, Timer, Upload } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
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
import { BarChart, PieChart } from '../components/ui/Chart'
import { countBy, getPatientName, testsForBooking } from '../data/api'
import { formatCurrency, humanize } from '../lib/format'
import type { LabStatus } from '../data/types'
import { useDemoStore } from '../state/useDemoStore'
import { DemoWorkspace, WorkspaceField } from '../components/ui/DemoWorkspace'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'

const statusTone: Record<LabStatus, Tone> = {
  booked: 'neutral',
  'sample-collected': 'brand',
  processing: 'warning',
  completed: 'positive',
}

export function LaboratoryDashboard() {
  const [searchParams] = useSearchParams()
  const { labTests, releaseLabReport } = useDemoStore()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const pendingUpload = labTests.filter((l) => l.status !== 'completed' && !l.reportUploaded)
  const actionable = [...pendingUpload, ...labTests.filter((l) => l.isNew && l.reportUploaded)]
  const newLabReports = labTests.filter((l) => l.isNew && l.reportUploaded)
  const labStatusCounts = countBy(labTests, (test) => test.status)
  const labCategoryCounts = countBy(labTests, (test) => test.category)

  const requestedView = searchParams.get('view') ?? 'overview'
  if (requestedView !== 'overview') {
    const viewContent = {
      queue: {
        title: 'Test queue',
        description: 'See samples in progress and prioritise the next diagnostic action.',
        icon: LayoutList,
        metrics: [
          { label: 'In progress', value: pendingUpload.length, hint: 'Awaiting completion' },
          { label: 'New reports', value: newLabReports.length, hint: 'Ready to release' },
        ],
        rows: labTests.filter((test) => test.status !== 'completed').slice(0, 8).map((test) => ({ label: test.testName, value: getPatientName(test.patientId), detail: test.category, status: humanize(test.status) })),
        actionLabel: 'Review test queue',
      },
      reports: {
        title: 'Report uploads',
        description: 'Release completed results to the doctor and patient views with a clear audit trail.',
        icon: Upload,
        metrics: [
          { label: 'Awaiting upload', value: pendingUpload.length, hint: 'Results not attached' },
          { label: 'Released today', value: newLabReports.length, hint: 'Visible to care teams' },
        ],
        rows: actionable.slice(0, 8).map((test) => ({ label: test.testName, value: getPatientName(test.patientId), detail: test.result ?? 'Result ready for upload', status: test.reportUploaded ? 'Released' : 'Awaiting upload' })),
        actionLabel: 'Upload report',
      },
      catalogue: {
        title: 'Test catalogue',
        description: 'Keep bookable laboratory services, preparation guidance and Indian Rupee pricing easy to compare.',
        icon: FlaskConical,
        metrics: [
          { label: 'Bookable services', value: testsForBooking.length, hint: 'Available to patients' },
          { label: 'Average price', value: formatCurrency(testsForBooking.reduce((sum, test) => sum + test.price, 0) / Math.max(testsForBooking.length, 1)), hint: 'Indicative service price' },
        ],
        rows: testsForBooking.slice(0, 8).map((test) => ({ label: test.name, value: formatCurrency(test.price), detail: test.category, status: 'Bookable' })),
        actionLabel: 'View catalogue',
      },
    }[requestedView as 'queue' | 'reports' | 'catalogue']

    if (viewContent) return <FocusedPortalView {...viewContent} onAction={() => setWorkspaceOpen(true)} />
  }

  return (
    <>
      <PageHeader
        title="Laboratory dashboard"
        subtitle="Test throughput, report upload and the bookable catalogue."
        icon={<FlaskConical className="h-6 w-6" aria-hidden="true" />}
        actions={
          <Button variant="primary" onClick={() => setWorkspaceOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload report
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Total tests"
          value={labTests.length}
          hint="Ordered across all departments"
          icon={<FlaskConical className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="In progress"
          value={(labStatusCounts['sample-collected'] ?? 0) + (labStatusCounts.processing ?? 0)}
          hint="Sample collected or processing"
          tone="warning"
          icon={<Timer className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Completed"
          value={labStatusCounts.completed ?? 0}
          hint="Reports released to the EHR"
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Awaiting upload"
          value={pendingUpload.length}
          hint="Results not yet attached"
          tone="danger"
          icon={<Upload className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Test analytics"
            description="Status mix across the lab"
            icon={<FlaskConical className="h-5 w-5" aria-hidden="true" />}
          />
          <PieChart
            title="Laboratory test status distribution"
            unit="tests"
            segments={[
              {
                label: 'Completed',
                value: labStatusCounts.completed ?? 0,
                color: 'var(--color-emerald-500)',
              },
              {
                label: 'Processing',
                value: labStatusCounts.processing ?? 0,
                color: 'var(--color-amber-500)',
              },
              {
                label: 'Sample collected',
                value: labStatusCounts['sample-collected'] ?? 0,
                color: 'var(--color-cyan-600)',
              },
              {
                label: 'Booked',
                value: labStatusCounts.booked ?? 0,
                color: 'var(--color-cyan-300)',
              },
            ]}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Report upload management"
            description="Attach results and release them to the doctor and patient views"
            icon={<Upload className="h-5 w-5" aria-hidden="true" />}
          />
          <DataTable
            caption="Laboratory tests and report upload status"
            rows={actionable}
            rowKey={(l) => l.id}
            emptyMessage="Nothing awaiting upload."
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
                key: 'patient',
                header: 'Patient',
                render: (l) => getPatientName(l.patientId),
              },
              {
                key: 'status',
                header: 'Status',
                render: (l) => (
                  <StatusPill tone={statusTone[l.status]}>{humanize(l.status)}</StatusPill>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: (l) =>
                  l.status === 'completed' && l.reportUploaded ? (
                    <StatusPill tone="positive">Released</StatusPill>
                  ) : (
                    <Button onClick={() => releaseLabReport(l.id)}>
                      Upload PDF
                    </Button>
                  ),
              },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Patient report history"
            description="Newly released results requiring attention"
            icon={<FileClock className="h-5 w-5" aria-hidden="true" />}
          />
          <DataTable
            caption="Newly released lab reports"
            rows={newLabReports}
            rowKey={(l) => l.id}
            columns={[
              {
                key: 'patient',
                header: 'Patient',
                primary: true,
                render: (l) => getPatientName(l.patientId),
              },
              {
                key: 'test',
                header: 'Test',
                render: (l) => (
                  <span>
                    <span className="block">{l.testName}</span>
                    <span className="tabular text-cyan-700">{formatCurrency(l.price)}</span>
                  </span>
                ),
              },
              {
                key: 'result',
                header: 'Result',
                render: (l) => <span className="text-cyan-800">{l.result}</span>,
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader
            title="Bookable test list"
            description="Catalogue exposed to the patient dashboard"
            icon={<LayoutList className="h-5 w-5" aria-hidden="true" />}
          />
          <DataTable
            caption="Available laboratory tests with pricing"
            rows={testsForBooking}
            rowKey={(t) => t.name}
            columns={[
              {
                key: 'name',
                header: 'Test',
                primary: true,
                render: (t) => (
                  <span>
                    <span className="block font-semibold">{t.name}</span>
                    <span className="text-cyan-700">{t.category}</span>
                  </span>
                ),
              },
              {
                key: 'price',
                header: 'Price',
                align: 'right',
                render: (t) => <span className="tabular">{formatCurrency(t.price)}</span>,
              },
              {
                key: 'turnaround',
                header: 'Turnaround',
                align: 'right',
                render: (t) => <Badge>{t.turnaround}</Badge>,
              },
            ]}
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Tests ordered per category"
          description="Distribution of current laboratory workload"
          icon={<ScanLine className="h-5 w-5" aria-hidden="true" />}
        />
        <BarChart
          horizontal
          title="Laboratory tests ordered per category"
          data={Object.entries(labCategoryCounts).map(([label, value]) => ({ label, value }))}
        />
      </Card>
      {workspaceOpen ? (
        <DemoWorkspace title="Upload report" description="Attach a result and release it securely to the care team." action="Release report" onClose={() => setWorkspaceOpen(false)}>
          <WorkspaceField label="Patient or test">
            <select className="mt-2 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 text-sm font-normal text-cyan-900">
              {labTests.map((test) => <option key={test.id}>{getPatientName(test.patientId)} · {test.testName}</option>)}
            </select>
          </WorkspaceField>
          <WorkspaceField label="Report file">
            <input type="file" required className="mt-2 block w-full rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 text-sm font-normal text-cyan-700" />
          </WorkspaceField>
          <WorkspaceField label="Result summary" />
        </DemoWorkspace>
      ) : null}
    </>
  )
}
