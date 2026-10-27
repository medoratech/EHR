import type { ReactNode } from 'react'
import type { Severity } from '../../data/types'

export type Tone = 'neutral' | 'brand' | 'positive' | 'warning' | 'danger'

const severityToTone: Record<Severity, Tone> = {
  normal: 'positive',
  abnormal: 'warning',
  critical: 'danger',
}

const metricSeverityToTone: Record<Severity, Tone> = {
  normal: 'brand',
  abnormal: 'warning',
  critical: 'danger',
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`card-shadow overflow-hidden rounded-2xl border border-cyan-200/70 bg-white ${className}`}
    >
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  action,
  description,
  icon,
}: {
  title: string
  action?: ReactNode
  description?: string
  icon?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-100 bg-gradient-to-r from-cyan-50/80 to-white px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-cyan-950">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-cyan-700">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        {icon ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-600 text-white shadow-lg shadow-cyan-900/25">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-cyan-950 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-cyan-700 sm:text-base">{subtitle}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-cyan-100 text-cyan-800 ring-cyan-600/20',
  brand: 'bg-cyan-700 text-white ring-cyan-700/30',
  positive: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-red-50 text-red-700 ring-red-600/25',
}

const toneDot: Record<Tone, string> = {
  neutral: 'bg-cyan-500',
  brand: 'bg-white',
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export function StatusPill({
  severity,
  tone,
  children,
}: {
  severity?: Severity
  tone?: Tone
  children: ReactNode
}) {
  const resolved: Tone = tone ?? (severity ? severityToTone[severity] : 'neutral')
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${toneStyles[resolved]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${toneDot[resolved]}`} aria-hidden="true" />
      {children}
    </span>
  )
}

const neutralBadges: Record<string, string> = {
  neutral: 'bg-cyan-100 text-cyan-800 ring-cyan-600/20',
  brand: 'bg-cyan-700 text-white ring-cyan-700/30',
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof neutralBadges
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${neutralBadges[tone]}`}
    >
      {children}
    </span>
  )
}

export function Avatar({
  initials,
  name,
  size = 'md',
}: {
  initials: string
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  }
  return (
    <span
      className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-cyan-500 font-semibold text-white shadow-sm`}
      aria-hidden="true"
      title={name}
    >
      {initials}
    </span>
  )
}

const metricTones: Record<Tone, { bar: string; icon: string }> = {
  neutral: { bar: 'bg-cyan-300', icon: 'bg-cyan-100 text-cyan-700' },
  brand: { bar: 'bg-cyan-500', icon: 'bg-cyan-100 text-cyan-700' },
  positive: { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-700' },
  warning: { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-700' },
  danger: { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' },
}

export function MetricTile({
  label,
  value,
  hint,
  severity,
  tone,
  icon,
}: {
  label: string
  value: string | number
  hint?: string
  severity?: Severity
  tone?: Tone
  icon?: ReactNode
}) {
  const resolved: Tone = tone ?? (severity ? metricSeverityToTone[severity] : 'brand')
  const accent = metricTones[resolved]
  return (
    <div className="card-shadow relative overflow-hidden rounded-2xl border border-cyan-200/70 bg-white p-5">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${accent.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 pl-2">
        <p className="text-sm font-medium text-cyan-700">{label}</p>
        {icon ? (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.icon}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="tabular mt-2 pl-2 text-3xl font-bold tracking-tight text-cyan-950">{value}</p>
      {hint ? <p className="mt-1 pl-2 text-xs text-cyan-700">{hint}</p> : null}
    </div>
  )
}

const progressBars: Record<Tone, string> = {
  neutral: 'bg-cyan-400',
  brand: 'bg-cyan-600',
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export function ProgressBar({
  value,
  max,
  label,
  severity,
  tone,
  ariaLabel,
}: {
  value: number
  max: number
  label?: string
  severity?: Severity
  tone?: Tone
  ariaLabel?: string
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  const resolved: Tone =
    tone ?? (severity ? metricSeverityToTone[severity] : 'brand')
  return (
    <div>
      {label ? (
        <div className="flex items-center justify-between text-xs text-cyan-800">
          <span className="font-medium">{label}</span>
          <span className="tabular">
            {value} / {max}
          </span>
        </div>
      ) : null}
      <div
        className={`${label ? 'mt-1.5' : ''} h-2 w-full overflow-hidden rounded-full bg-cyan-100`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? label ?? 'Progress'}
      >
        <div className={`h-full rounded-full ${progressBars[resolved]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="m-5 rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/60 p-8 text-center">
      <p className="font-medium text-cyan-900">{message}</p>
      {hint ? <p className="mt-1 text-sm text-cyan-700">{hint}</p> : null}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary:
      'bg-gradient-to-r from-cyan-700 to-cyan-500 text-white shadow-sm hover:opacity-90 disabled:from-cyan-100 disabled:to-cyan-100 disabled:text-cyan-800 disabled:shadow-none disabled:opacity-100',
    secondary:
      'bg-white text-cyan-700 ring-1 ring-inset ring-cyan-300 hover:bg-cyan-50 disabled:bg-cyan-50 disabled:text-cyan-700 disabled:ring-cyan-200',
    ghost: 'text-cyan-700 hover:bg-cyan-100 disabled:text-cyan-700 disabled:opacity-60',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
