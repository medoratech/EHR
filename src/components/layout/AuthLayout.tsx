import { ArrowLeft, HeartPulse, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Parallax } from '../ui/Parallax'
import type { Role } from '../../data/types'

export interface RoleOption {
  label: string
  description: string
  to: string
  role: Role
  icon: LucideIcon
}

export function RoleSelector({
  options,
  value,
  onChange,
}: {
  options: RoleOption[]
  value: RoleOption
  onChange: (option: RoleOption) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {options.map((option) => {
        const selected = option.to === value.to
        return (
          <button
            key={option.to}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={selected}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all duration-200 ${
              selected
                ? 'border-cyan-600 bg-cyan-700 text-white shadow-sm'
                : 'border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50'
            }`}
          >
            <option.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AuthLayout({
  formId,
  heading,
  subheading,
  panelTitle,
  panelBody,
  bullets,
  children,
}: {
  formId: string
  heading: string
  subheading: string
  panelTitle: string
  panelBody: string
  bullets: string[]
  children: ReactNode
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <a href={`#${formId}`} className="skip-link">
        Skip to form
      </a>

      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b5044] p-10 lg:flex xl:p-14">
        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/20">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">Medora EHR</span>
            <span className="block text-xs text-cyan-200">Better Care. Together.</span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-white">{panelTitle}</h2>
          <p className="mt-4 text-base leading-relaxed text-cyan-200">{panelBody}</p>
          <ul className="mt-8 space-y-3">
            {bullets.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-medium text-cyan-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white">
                  <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs font-medium text-cyan-300">
          Secure • Compliant • Patient Centred
        </p>

        <Parallax
          aria-hidden="true"
          speed={0.18}
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <Parallax
          aria-hidden="true"
          speed={0.26}
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
        />
      </aside>

      <main
        id={formId}
        className="app-canvas flex min-h-screen flex-col justify-center px-4 py-10 sm:px-6 lg:px-12"
      >
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors duration-200 hover:text-cyan-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>

          <div className="mt-6 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-800 text-white shadow-lg shadow-cyan-900/20">
              <HeartPulse className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-cyan-950 sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 text-sm text-cyan-700">{subheading}</p>

          {children}
        </div>
      </main>
    </div>
  )
}
