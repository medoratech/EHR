import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, CardHeader, MetricTile } from './primitives'

export interface FocusedPortalMetric {
  label: string
  value: string | number
  hint: string
}

export interface FocusedPortalRow {
  label: string
  value: string
  detail?: string
  status?: string
}

export function FocusedPortalView({
  title,
  description,
  icon: Icon,
  metrics,
  rows,
  actionLabel,
  onAction,
  emptyMessage = 'Nothing needs your attention right now.',
}: {
  title: string
  description: string
  icon: LucideIcon
  metrics: FocusedPortalMetric[]
  rows: FocusedPortalRow[]
  actionLabel: string
  onAction?: () => void
  emptyMessage?: string
}) {
  const [actionDone, setActionDone] = useState(false)

  function runAction() {
    onAction?.()
    setActionDone(true)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/70 to-emerald-50/70 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-lg shadow-cyan-900/15">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-5 text-[10px] font-bold tracking-[0.18em] text-cyan-600 uppercase">Focused workspace</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-cyan-950">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-cyan-700">{description}</p>
          </div>
          <Button variant="primary" onClick={runAction}>
            {actionDone ? 'Saved successfully' : actionLabel}
            {actionDone ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
        ))}
      </div>

      <Card>
        <CardHeader title="Recent activity" description="Only the records relevant to this section are shown." icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />} />
        {rows.length ? (
          <ul className="divide-y divide-cyan-100">
            {rows.map((row) => (
              <li key={`${row.label}-${row.value}`} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-cyan-950">{row.label}</p>
                  {row.detail ? <p className="mt-0.5 text-sm text-cyan-700">{row.detail}</p> : null}
                </div>
                <div className="flex items-center gap-3 sm:text-right">
                  <span className="text-sm font-semibold text-cyan-800">{row.value}</span>
                  {row.status ? <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">{row.status}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-cyan-700">{emptyMessage}</p>
        )}
      </Card>
    </div>
  )
}
