import { Activity, ChevronRight, CircleCheck, ShieldAlert, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { currentPatient, latestVitals } from '../../data/api'
import { formatDate } from '../../lib/format'
import { StatusPill } from '../ui/primitives'

export function PatientContextBar() {
  const vitals = latestVitals(currentPatient.id)

  return (
    <section className="patient-context mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,31,23,0.45)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-950 text-white shadow-lg shadow-cyan-950/15">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-bold text-cyan-950">{currentPatient.name}</h2>
            <StatusPill severity={currentPatient.risk}>{currentPatient.risk}</StatusPill>
          </div>
          <p className="mt-0.5 truncate text-xs text-cyan-700">
            {currentPatient.mrn} · {currentPatient.age} yrs · {currentPatient.department}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-700">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Synced from app · 2m ago
        </span>
        {vitals ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1.5">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Latest vitals {formatDate(vitals.recordedAt)}
          </span>
        ) : null}
        {currentPatient.allergies.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1.5 text-red-700">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Allergy alert
          </span>
        ) : null}
        <Link
          to="/patient"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-cyan-800 transition-colors hover:bg-cyan-100"
        >
          View record
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
