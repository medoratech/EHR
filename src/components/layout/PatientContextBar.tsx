import { Activity, ChevronRight, CircleCheck, CloudOff, ShieldAlert, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { latestVitals } from '../../data/api'
import { formatDate } from '../../lib/format'
import { useAuth } from '../../state/useAuth'
import { useEhr } from '../../state/useEhr'
import { StatusPill } from '../ui/primitives'

/** The chart in focus: the patient's own record, or the one staff picked in search. */
export function PatientContextBar() {
  const { user } = useAuth()
  const { focusedPatient: patient, vitals, live, status } = useEhr()

  if (!patient) {
    return status === 'loading' ? (
      <section className="patient-context mx-auto h-[76px] max-w-7xl animate-pulse rounded-2xl border border-white/70 bg-white/60" aria-hidden="true" />
    ) : null
  }

  const latest = latestVitals(vitals, patient.id)
  const hasAllergies = patient.allergies.some((allergy) => allergy !== 'None known')

  return (
    <section className="patient-context mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,31,23,0.45)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-950 text-white shadow-lg shadow-cyan-950/15">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-bold text-cyan-950">{patient.name}</h2>
            <StatusPill severity={patient.risk}>{patient.risk}</StatusPill>
          </div>
          <p className="mt-0.5 truncate text-xs text-cyan-700">
            {patient.mrn} · {patient.age} yrs · {patient.department}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-700">
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Live sync
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 text-amber-800">
            <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
            Reconnecting…
          </span>
        )}
        {latest ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1.5">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Latest vitals {formatDate(latest.recordedAt)}
          </span>
        ) : null}
        {hasAllergies ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1.5 text-red-700"
            title={patient.allergies.join(', ')}
          >
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Allergy alert: {patient.allergies.join(', ')}
          </span>
        ) : null}
        {user?.role === 'patient' ? (
          <Link
            to="/patient"
            className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-cyan-800 transition-colors hover:bg-cyan-100"
          >
            View record
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  )
}
