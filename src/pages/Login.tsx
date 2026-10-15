import { Lock, LogIn, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '../components/layout/AuthLayout'
import { dashboardForEmail, demoAccounts } from '../components/layout/roles'

const inputClass =
  'h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/60 pr-4 pl-10 text-sm text-cyan-900 shadow-inner shadow-cyan-900/5 placeholder:text-cyan-500 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const account = demoAccounts.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
    )
    if (!account || password !== 'medora') {
      setError('Use a listed demo account with the password “medora”.')
      return
    }
    sessionStorage.setItem('medora:demo-session', JSON.stringify(account))
    setError('')
    navigate(dashboardForEmail(email))
  }

  return (
    <AuthLayout
      formId="sign-in-form"
      heading="Sign in"
      subheading="Welcome back. Enter your details to access your dashboard."
      panelTitle="Welcome back to Medora."
      panelBody="Sign in to the dashboard built for your role and continue where your team left off — secure, audited and always up to date."
      bullets={['Role-based access control', 'Audit-ready activity trail', 'Real-time care coordination']}
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="sign-in-email" className="block text-sm font-semibold text-cyan-900">
            Email address
          </label>
          <div className="relative mt-1.5">
            <Mail
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
              aria-hidden="true"
            />
            <input
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@medora.health"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="sign-in-password" className="block text-sm font-semibold text-cyan-900">
            Password
          </label>
          <div className="relative mt-1.5">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500"
              aria-hidden="true"
            />
            <input
              id="sign-in-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-cyan-800">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-cyan-400 accent-cyan-700"
            />
            Keep me signed in
          </label>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('medora:demo-action'))}
            className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-700 to-cyan-500 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90"
        >
          Sign in
          <LogIn className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-cyan-100" />
        <span className="text-xs font-medium text-cyan-500">or</span>
        <span className="h-px flex-1 bg-cyan-100" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('medora:demo-action'))}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-300 transition-colors duration-200 hover:bg-cyan-50"
        >
          Continue with SSO
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('medora:demo-action'))}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-300 transition-colors duration-200 hover:bg-cyan-50"
        >
          Use a passkey
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-cyan-700">
        New to Medora?{' '}
        <Link
          to="/signup"
          className="font-semibold text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
        >
          Create an account
        </Link>
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/60 p-4">
        <p className="text-xs font-semibold tracking-wide text-cyan-700 uppercase">
          Demo accounts — click to autofill
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email)
                setPassword('medora')
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors duration-200 ${
                email === account.email
                  ? 'bg-cyan-700 text-white ring-cyan-700'
                  : 'bg-white text-cyan-800 ring-cyan-200 hover:bg-cyan-100'
              }`}
            >
              {account.role}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
