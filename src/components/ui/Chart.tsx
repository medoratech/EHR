import { useId, useState } from 'react'

export interface BarDatum {
  label: string
  value: number
}

const barGradient = 'from-cyan-700 to-cyan-400'

export function BarChart({
  data,
  title,
  unit = '',
  horizontal = false,
}: {
  data: BarDatum[]
  title: string
  unit?: string
  horizontal?: boolean
}) {
  const max = Math.max(...data.map((d) => d.value), 1)

  if (horizontal) {
    return (
      <figure className="px-5 py-5">
        <figcaption className="sr-only">{title}</figcaption>
        <ul className="flex flex-col gap-3" role="img" aria-label={title}>
          {data.map((d) => {
            const width = d.value === 0 ? 0 : Math.max(Math.round((d.value / max) * 100), 5)
            return (
              <li
                key={d.label}
                className="grid items-center gap-3"
                style={{ gridTemplateColumns: 'minmax(0, 9rem) 1fr auto' }}
              >
                <span className="truncate text-xs font-medium text-cyan-800">{d.label}</span>
                <div className="h-6 overflow-hidden rounded-md bg-cyan-100">
                  <div
                    className={`h-full rounded-md bg-gradient-to-r ${barGradient}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="tabular text-sm font-semibold text-cyan-800">
                  {d.value}
                  {unit}
                </span>
              </li>
            )
          })}
        </ul>
      </figure>
    )
  }

  return (
    <figure className="px-5 py-5">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex h-44 items-end gap-3" role="img" aria-label={title}>
        {data.map((d) => {
          const height = Math.round((d.value / max) * 100)
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="tabular text-xs font-semibold text-cyan-800">
                {d.value}
                {unit}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-lg bg-gradient-to-t ${barGradient} transition-all duration-500`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              </div>
              <span className="text-center text-xs text-cyan-700">{d.label}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}

export interface PieSegment {
  label: string
  value: number
  color: string
}

export function PieChart({
  segments,
  title,
  unit = '',
  compact = false,
}: {
  segments: PieSegment[]
  title: string
  unit?: string
  compact?: boolean
}) {
  const [active, setActive] = useState<number | null>(null)
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const arcs = segments.map((s, index) => {
    const before = segments.slice(0, index).reduce((sum, x) => sum + x.value, 0)
    const fraction = total === 0 ? 0 : s.value / total
    return {
      ...s,
      index,
      dash: fraction * circumference,
      offset: total === 0 ? 0 : (before / total) * circumference,
      pct: total === 0 ? 0 : Math.round(fraction * 100),
    }
  })

  const focused = active === null ? null : arcs[active]

  return (
    <figure className={compact ? 'px-4 py-4' : 'px-5 py-5'}>
      <figcaption className="sr-only">{title}</figcaption>
      <div className={`flex flex-col items-center ${compact ? 'gap-3' : 'gap-6'}`}>
        <div className={`relative ${compact ? 'h-36 w-36' : 'h-48 w-48'} shrink-0`}>
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            role="img"
            aria-label={title}
          >
            <g transform="rotate(-90 50 50)" fill="none">
              {total === 0 ? (
                <circle
                  cx={50}
                  cy={50}
                  r={radius}
                  stroke="var(--color-cyan-100)"
                  strokeWidth={20}
                />
              ) : (
                arcs.map((a) => (
                  <circle
                    key={a.label}
                    cx={50}
                    cy={50}
                    r={radius}
                    stroke={a.color}
                    strokeWidth={active === a.index ? 26 : 20}
                    strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                    strokeDashoffset={-a.offset}
                    tabIndex={0}
                    aria-label={`${a.label}: ${a.value} (${a.pct}%)`}
                    className={`cursor-pointer transition-all duration-200 outline-none ${
                      active === a.index ? '' : 'hover:opacity-90'
                    }`}
                    onMouseEnter={() => setActive(a.index)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(a.index)}
                    onBlur={() => setActive(null)}
                  />
                ))
              )}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-[30%] flex flex-col items-center justify-center rounded-full text-center">
            <span className="tabular text-2xl font-bold tracking-tight text-cyan-950">
              {focused ? focused.value : total}
            </span>
            <span className="text-xs text-cyan-700">
              {focused ? `${focused.pct}%` : unit || 'total'}
            </span>
          </div>
        </div>
        <ul className={`flex w-full max-w-xs flex-col ${compact ? 'gap-0.5' : 'gap-1'}`}>
          {arcs.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onMouseEnter={() => setActive(a.index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(a.index)}
                onBlur={() => setActive(null)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm text-cyan-800 transition-colors duration-200 ${
                  active === a.index ? 'bg-cyan-50' : ''
                } ${compact ? 'py-1' : 'py-1.5'}`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color }}
                  aria-hidden="true"
                />
                <span className="font-medium">{a.label}</span>
                <span className="tabular ml-auto text-cyan-700">
                  {a.value} · {a.pct}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}

export function LineChart({
  data,
  title,
  unit = '',
  heightClass = 'h-52',
}: {
  data: BarDatum[]
  title: string
  unit?: string
  heightClass?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const gradientId = useId().replace(/:/g, '')
  const max = Math.max(...data.map((d) => d.value), 1)
  const count = data.length || 1
  const padY = 16

  const points = data.map((d, index) => ({
    ...d,
    x: ((index + 0.5) / count) * 100,
    y: 100 - padY - (d.value / max) * (100 - padY * 2),
  }))

  const line = points
    .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
  const first = points[0]
  const last = points[points.length - 1]
  const area = first && last ? `${line} L ${last.x} 100 L ${first.x} 100 Z` : ''
  const gridlines = Array.from({ length: 4 }, (_, index) => (index / 3) * 100)

  return (
    <figure className="px-5 py-5">
      <figcaption className="sr-only">{title}</figcaption>
      <div className={`relative mx-2 mb-6 ${heightClass}`}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-cyan-500)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-cyan-500)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridlines.map((y) => (
            <line
              key={y}
              x1={0}
              x2={100}
              y1={y}
              y2={y}
              stroke="var(--color-cyan-100)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--color-cyan-600)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {points.map((p, index) => (
          <button
            key={p.label}
            type="button"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            aria-label={`${p.label}: ${p.value}${unit}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full outline-none"
          >
            <span
              className={`block rounded-full ring-2 ring-white transition-all duration-200 ${
                active === index ? 'h-3.5 w-3.5 bg-cyan-700' : 'h-2.5 w-2.5 bg-cyan-600'
              }`}
            />
            <span
              className={`tabular pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-xs font-semibold transition-colors duration-200 ${
                active === index ? 'text-cyan-900' : 'text-cyan-700'
              }`}
            >
              {p.value}
              {unit}
            </span>
          </button>
        ))}
        {points.map((p) => (
          <span
            key={p.label}
            style={{ left: `${p.x}%` }}
            className="pointer-events-none absolute top-full mt-2 -translate-x-1/2 text-xs text-cyan-700"
          >
            {p.label}
          </span>
        ))}
      </div>
    </figure>
  )
}
