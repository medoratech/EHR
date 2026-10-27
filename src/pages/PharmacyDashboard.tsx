import { AlertTriangle, Boxes, Pill, Receipt, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  MetricTile,
  PageHeader,
  ProgressBar,
  StatusPill,
} from '../components/ui/primitives'
import { DataTable } from '../components/ui/Table'
import type { InventoryItem } from '../data/types'
import { todayKey } from '../lib/clock'
import { formatCurrency, formatDate } from '../lib/format'
import { useEhr } from '../state/useEhr'
import { Workspace, WorkspaceField, WorkspaceSelect } from '../components/ui/Workspace'
import { FocusedPortalView } from '../components/ui/FocusedPortalView'

function priceFor(inventory: InventoryItem[], medicineName: string): number | null {
  const target = medicineName.toLowerCase()
  const match =
    inventory.find((i) => i.name.toLowerCase().startsWith(target)) ??
    inventory.find((i) => i.name.toLowerCase().includes(target))
  return match ? match.price : null
}

export function PharmacyDashboard() {
  const [searchParams] = useSearchParams()
  const {
    prescriptions,
    invoices,
    inventory,
    patients,
    patientName: getPatientName,
    dispenseMedicine,
    sendRefillReminder,
    requestReorder,
    createInvoice,
    clinic,
  } = useEhr()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const outOfStock = inventory.filter((i) => i.stock === 0)
  const inventoryValue = inventory.reduce((sum, i) => sum + i.stock * i.price, 0)
  const stockScale = Math.max(
    ...inventory.map((i) => Math.max(i.reorderLevel * 3, i.stock)),
    1,
  )
  const medicines = prescriptions.flatMap((p) =>
    p.medicines.map((m) => ({ ...m, prescription: p })),
  )

  const requestedView = searchParams.get('view') ?? 'overview'
  if (requestedView !== 'overview') {
    const viewContent = {
      inventory: {
        title: 'Inventory',
        description: 'Monitor stock, expiry and reorder decisions without unrelated prescription activity.',
        icon: Boxes,
        metrics: [
          { label: 'Stock value', value: formatCurrency(inventoryValue), hint: 'Current inventory' },
          { label: 'Below reorder', value: inventory.filter((item) => item.stock > 0 && item.stock <= item.reorderLevel).length, hint: 'Needs replenishment' },
        ],
        rows: inventory.slice(0, 8).map((item) => ({ label: item.name, value: `${item.stock} units`, detail: `${item.category} · ${formatCurrency(item.price)} each`, status: item.stock === 0 ? 'Out of stock' : item.stock <= item.reorderLevel ? 'Reorder soon' : 'Healthy' })),
        actionLabel: 'Review inventory',
      },
      prescriptions: {
        title: 'Prescription queue',
        description: 'Fulfil doctor-issued prescriptions with a clear view of what has already been ordered.',
        icon: Pill,
        metrics: [
          { label: 'Active prescriptions', value: prescriptions.length, hint: 'Current patient orders' },
          { label: 'Ready to fulfil', value: medicines.filter((medicine) => !medicine.ordered).length, hint: 'Awaiting pharmacy action' },
        ],
        rows: medicines.slice(0, 8).map((medicine) => ({ label: medicine.name, value: getPatientName(medicine.prescription.patientId), detail: medicine.dosage, status: medicine.ordered ? 'Ordered' : 'Ready' })),
        actionLabel: 'Fulfil prescription',
      },
      refills: {
        title: 'Refill reminders',
        description: 'Keep recurring medicines continuous with patient-specific refill follow-up.',
        icon: RefreshCcw,
        metrics: [
          { label: 'Refill candidates', value: medicines.filter((medicine) => medicine.ordered).length, hint: 'Previously ordered' },
          { label: 'Patients supported', value: new Set(medicines.map((medicine) => medicine.prescription.patientId)).size, hint: 'Across active plans' },
        ],
        rows: medicines.filter((medicine) => medicine.ordered).slice(0, 8).map((medicine) => ({ label: medicine.name, value: getPatientName(medicine.prescription.patientId), detail: medicine.dosage, status: 'Reminder ready' })),
        actionLabel: 'Send refill reminder',
      },
    }[requestedView as 'inventory' | 'prescriptions' | 'refills']

    if (viewContent) {
      return (
        <>
          <FocusedPortalView {...viewContent} onAction={() => setWorkspaceOpen(true)} />
          {renderWorkspace()}
        </>
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Pharmacy dashboard"
        subtitle="Inventory, prescription fulfilment and invoice handling."
        icon={<Boxes className="h-6 w-6" aria-hidden="true" />}
        actions={
          <Button variant="primary" onClick={() => setWorkspaceOpen(true)}>
            <Receipt className="h-4 w-4" aria-hidden="true" />
            New invoice
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Stock value"
          value={formatCurrency(inventoryValue)}
          hint={`${inventory.length} lines tracked`}
          icon={<Boxes className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Below reorder level"
          value={inventory.filter((i) => i.stock > 0 && i.stock <= i.reorderLevel).length}
          hint="Excludes out of stock"
          tone="warning"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Out of stock"
          value={outOfStock.length}
          hint="Blocking new orders"
          tone="danger"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        />
        <MetricTile
          label="Active prescriptions"
          value={prescriptions.length}
          hint={`${medicines.filter((m) => m.ordered).length} already ordered`}
          icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Medicine inventory"
          description="Stock levels, reorder thresholds and expiry tracking"
          icon={<Boxes className="h-5 w-5" aria-hidden="true" />}
        />
        <DataTable
          caption="Pharmacy medicine inventory with stock and expiry"
          rows={inventory}
          rowKey={(i) => i.id}
          emptyMessage="No stock lines recorded."
          columns={[
            {
              key: 'name',
              header: 'Medicine',
              primary: true,
              render: (i) => (
                <span>
                  <span className="block font-semibold">{i.name}</span>
                  <span className="text-cyan-700">{i.category}</span>
                </span>
              ),
            },
            {
              key: 'stock',
              header: 'Stock level',
              render: (i) => (
                <div className="min-w-0 sm:min-w-[160px]">
                  <ProgressBar
                    value={i.stock}
                    max={stockScale}
                    ariaLabel={`${i.name} stock level`}
                    severity={
                      i.stock === 0
                        ? 'critical'
                        : i.stock <= i.reorderLevel
                          ? 'abnormal'
                          : 'normal'
                    }
                  />
                  <p className="tabular mt-1 text-xs text-cyan-700">
                    {i.stock} units · reorder at {i.reorderLevel}
                  </p>
                </div>
              ),
            },
            {
              key: 'expiry',
              header: 'Expiry',
              render: (i) => {
                const days = Math.round(
                  (Date.parse(`${i.expiry}T00:00:00Z`) - Date.parse(`${todayKey()}T00:00:00Z`)) / 86_400_000,
                )
                if (days < 0) return <StatusPill tone="danger">Expired</StatusPill>
                if (days < 60) return <StatusPill tone="warning">{days} days</StatusPill>
                return <span className="tabular text-cyan-800">{formatDate(i.expiry)}</span>
              },
            },
            {
              key: 'price',
              header: 'Unit price',
              align: 'right',
              render: (i) => <span className="tabular">{formatCurrency(i.price)}</span>,
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              render: (i) =>
                i.reorderRequestedAt ? (
                  <StatusPill tone="positive">Order raised</StatusPill>
                ) : (
                  <Button
                    onClick={() => void requestReorder(i.id)}
                    disabled={i.stock > i.reorderLevel}
                  >
                    Reorder
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Prescription integration"
            description="Fetched directly from doctor-issued prescriptions"
            icon={<Pill className="h-5 w-5" aria-hidden="true" />}
          />
          <ul className="divide-y divide-cyan-100">
            {medicines.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-cyan-950">{m.name}</p>
                  <p className="text-sm text-cyan-700">
                    {m.dosage} · {m.frequency} · {m.durationDays} days
                  </p>
                  <p className="text-xs text-cyan-700">
                    {getPatientName(m.prescription.patientId)} · {m.prescription.doctor}
                  </p>
                </div>
                {m.dispensed ? (
                  <StatusPill tone="positive">Dispensed</StatusPill>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => void dispenseMedicine(m.prescription.id, m.id)}
                  >
                    Dispense
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Refill reminders"
            description="Recurring prescriptions approaching completion"
            icon={<RefreshCcw className="h-5 w-5" aria-hidden="true" />}
          />
          <ul className="divide-y divide-cyan-100">
            {prescriptions.map((p) => {
              const remaining = p.refillsLeft
              const exhausted = remaining === 0
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-cyan-950">
                      {getPatientName(p.patientId)}
                    </p>
                    <p className="text-sm text-cyan-700">
                      {p.medicines.map((m) => m.name).join(', ')}
                    </p>
                    <p className="text-xs text-cyan-700">
                      {p.refillsLeft} of {p.refillsTotal} refills remaining
                    </p>
                  </div>
                  {exhausted ? (
                    <StatusPill tone="danger">Refill needed</StatusPill>
                  ) : (
                    <Button onClick={() => void sendRefillReminder(p.id)}>
                      <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                      Send reminder
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Order & invoice management"
          description="Patient orders, payment status and generated invoices"
          icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
        />
        <DataTable
          caption="Pharmacy orders and invoice status"
          rows={prescriptions.flatMap((p) =>
            p.medicines.map((m) => ({
              key: m.id,
              medicine: m,
              prescription: p,
            })),
          )}
          rowKey={(row) => row.key}
          columns={[
            {
              key: 'patient',
              header: 'Patient',
              primary: true,
              render: (row) => getPatientName(row.prescription.patientId),
            },
            {
              key: 'medicine',
              header: 'Medicine',
              render: (row) => row.medicine.name,
            },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              render: (row) => {
                const price = priceFor(inventory, row.medicine.name)
                if (price === null) return <span className="text-cyan-700">—</span>
                return (
                  <span className="tabular">
                    {formatCurrency(price * row.medicine.durationDays)}
                  </span>
                )
              },
            },
            {
              key: 'payment',
              header: 'Payment',
              align: 'right',
              render: (row) => {
                const invoice = invoices.find(
                  (i) => i.patientId === row.prescription.patientId,
                )
                return invoice?.status === 'paid' ? (
                  <Badge tone="brand">Paid</Badge>
                ) : (
                  <StatusPill tone="warning">Unpaid</StatusPill>
                )
              },
            },
            {
              key: 'invoice',
              header: 'Invoice',
              align: 'right',
              render: (row) => {
                const price = priceFor(inventory, row.medicine.name)
                return (
                  <Button
                    disabled={price === null}
                    onClick={() =>
                      price !== null &&
                      void createInvoice({
                        patientId: row.prescription.patientId,
                        amount: Math.round(price * row.medicine.durationDays * 100) / 100,
                        description: `${row.medicine.name} ${row.medicine.dosage} × ${row.medicine.durationDays} days`,
                      })
                    }
                  >
                    Generate
                  </Button>
                )
              },
            },
          ]}
        />
      </Card>
      {renderWorkspace()}
    </>
  )

  function renderWorkspace() {
    if (!workspaceOpen) return null
    return (
      <Workspace
        title="Create invoice"
        description="Prepare a medicine invoice for a patient order."
        action="Generate invoice"
        onClose={() => setWorkspaceOpen(false)}
        onComplete={(values) =>
          createInvoice({
            patientId: values.patientId,
            amount: Number(values.amount),
            description: values.description,
            status: values.status === 'paid' ? 'paid' : 'unpaid',
            method: values.status === 'paid' ? values.method : undefined,
          })
        }
      >
        <WorkspaceField label="Patient">
          <WorkspaceSelect name="patientId" options={patients.map((p) => ({ value: p.id, label: `${p.name} · ${p.mrn}` }))} />
        </WorkspaceField>
        <WorkspaceField label="Medicine or order reference" name="description" />
        <div className="grid gap-4 sm:grid-cols-3">
          <WorkspaceField label="Amount" name="amount" type="number" min={0.01} step={0.01} />
          <WorkspaceField label="Payment status">
            <WorkspaceSelect name="status" options={[{ value: 'unpaid', label: 'Pending' }, { value: 'paid', label: 'Paid' }]} />
          </WorkspaceField>
          <WorkspaceField label="Method (if paid)">
            <WorkspaceSelect name="method" options={(clinic?.paymentMethods ?? []).map((m) => ({ value: m, label: m }))} />
          </WorkspaceField>
        </div>
      </Workspace>
    )
  }
}
