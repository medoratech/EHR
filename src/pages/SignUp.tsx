import { Building2, CalendarDays, CheckCircle2, Lock, Mail, UserPlus, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout, RoleSelector, type RoleOption } from '../components/layout/AuthLayout'
import { roleOptions } from '../components/layout/roles'
import type { Sex } from '../data/types'
import { ApiError } from '../lib/http'
import { useAuth } from '../state/useAuth'

const inputClass =
  'h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/60 pr-4 pl-10 text-sm text-cyan-900 shadow-inner shadow-cyan-900/5 placeholder:text-cyan-500 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100'

const steps = ['Your details', 'Your role', 'Confirm']

export function SignUp() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [role, setRole] = useState<RoleOption>(roleOptions[0])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(false)

  const passwordsMatch = confirm.length === 0 || password === confirm
  const isPatient = role.role === 'patient'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match. Please check and try again.')
      return
    }
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '').trim() || undefined
    setError('')
    setBusy(true)
    try {
      const result = await register({
        name: field('name') ?? '',
        email: field('email') ?? '',
        password,
        role: role.role,
        organisation: isPatient ? undefined : field('organisation'),
        dateOfBirth: isPatient ? field('dateOfBirth') : undefined,
        sex: isPatient ? (field('sex') as Sex | undefined) : undefined,
      })
      if (result.status === 'active') navigate(result.user.home, { replace: true })
      else setPending(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not create your account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (pending) {
    return (
      <AuthLayout
        formId="sign-up-form"
        heading="Request received"
        subheading="An administrator will review your access."
        panelTitle="Join the care teams already on Medora."
        panelBody="Staff accounts are approved by your organisation's administrator before first sign-in, so patient records stay protected."
        bullets={['Role-based access control', 'Audit-ready activity trail', 'Real-time care coordination']}
      >
        <div className="mt-7 rounded-2xl bg-emerald-50 p-6 text-emerald-800" role="status">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          <p className="mt-3 font-semibold">Your {role.label.toLowerCase()} account is awaiting approval.</p>
          <p className="mt-1 text-sm">
            You can sign in with the password you chose as soon as an administrator activates your access.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-cyan-700">
          <Link to="/login" className="font-semibold text-cyan-800 underline underline-offset-2 hover:text-cyan-950">
            Back to sign in
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      formId="sign-up-form"
      heading="Create your account"
      subheading="Set up your facility and invite your team in a few minutes."
      panelTitle="Join the care teams already on Medora."
      panelBody="Create an account to configure your organisation, invite colleagues and start using the dashboards built for every role."
      bullets={['Free 14-day trial, no card required', 'Guided onboarding & data import', 'Cancel or export anytime']}
    >
      <ol className="mt-7 flex items-center gap-2">
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span className="h-1 rounded-full bg-cyan-700" />
            <span className="text-xs font-semibold text-cyan-700">{label}</span>
            <span className="sr-only">Step {index + 1}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="sign-up-name" className="block text-sm font-semibold text-cyan-900">
            Full name
          </label>
          <div className="relative mt-1.5">
            <UserRound
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
              aria-hidden="true"
            />
            <input
              id="sign-up-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="e.g. Jane Mensah"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {isPatient ? null : (
          <div>
            <label htmlFor="sign-up-org" className="block text-sm font-semibold text-cyan-900">
              Organisation
            </label>
            <div className="relative mt-1.5">
              <Building2
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
                aria-hidden="true"
              />
              <input
                id="sign-up-org"
                name="organisation"
                type="text"
                autoComplete="organization"
                required
                placeholder="e.g. Apex Health"
                className={inputClass}
              />
            </div>
          </div>
          )}

          <div>
            <label htmlFor="sign-up-email" className="block text-sm font-semibold text-cyan-900">
              {isPatient ? 'Email' : 'Work email'}
            </label>
            <div className="relative mt-1.5">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
                aria-hidden="true"
              />
              <input
                id="sign-up-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@medora.health"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="block text-sm font-semibold text-cyan-900">Your role</p>
          <p className="mt-0.5 text-xs text-cyan-600">
            Patients get access straight away. Staff accounts are approved by an administrator.
          </p>
          <div className="mt-2.5">
            <RoleSelector options={roleOptions} value={role} onChange={setRole} />
          </div>
        </div>

        {isPatient ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sign-up-dob" className="block text-sm font-semibold text-cyan-900">
                Date of birth
              </label>
              <div className="relative mt-1.5">
                <CalendarDays
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
                  aria-hidden="true"
                />
                <input id="sign-up-dob" name="dateOfBirth" type="date" required autoComplete="bday" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="sign-up-sex" className="block text-sm font-semibold text-cyan-900">
                Sex
              </label>
              <select
                id="sign-up-sex"
                name="sex"
                required
                defaultValue=""
                className="mt-1.5 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/60 px-3 text-sm text-cyan-900"
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sign-up-password" className="block text-sm font-semibold text-cyan-900">
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
                aria-hidden="true"
              />
              <input
                id="sign-up-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8+ characters"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="sign-up-confirm" className="block text-sm font-semibold text-cyan-900">
              Confirm password
            </label>
            <div className="relative mt-1.5">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
                aria-hidden="true"
              />
              <input
                id="sign-up-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat password"
                aria-invalid={!passwordsMatch}
                className={`${inputClass} ${
                  passwordsMatch ? '' : 'border-red-400 bg-red-50/60 focus:border-red-500 focus:ring-red-100'
                }`}
              />
            </div>
            {passwordsMatch ? null : (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Passwords do not match
              </p>
            )}
          </div>
        </div>

        <ul className="space-y-1.5 rounded-xl bg-cyan-50/60 p-3.5 ring-1 ring-inset ring-cyan-100">
          {[
            'At least 8 characters',
            'One uppercase and one number recommended',
            'Never share your password with anyone',
          ].map((tip) => (
            <li key={tip} className="flex items-center gap-2 text-xs text-cyan-700">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-600" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>

        <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-cyan-700">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-cyan-400 accent-cyan-700"
          />
          <span>
            I agree to the <span className="font-semibold text-cyan-900">Terms of Service</span> and{' '}
            <span className="font-semibold text-cyan-900">Privacy Policy</span>, and confirm I am
            authorised to create this account.
          </span>
        </label>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-700 to-cyan-500 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? 'Creating account…' : isPatient ? 'Create account' : 'Request access'}
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-cyan-700">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
