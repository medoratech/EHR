import { KeyRound, Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from '../components/layout/AuthLayout'
import { ApiError } from '../lib/http'
import { toast } from '../lib/toast'
import { useAuth } from '../state/useAuth'

const inputClass =
  'h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/60 pr-4 pl-10 text-sm text-cyan-900 shadow-inner shadow-cyan-900/5 placeholder:text-cyan-500 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100'

/** Landing page for the one-time link an administrator generates for an invited user. */
export function SetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setPassword } = useAuth()
  const token = params.get('token') ?? ''
  const [password, setValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await setPassword(token, password)
      toast('Password saved. Sign in to continue.', 'success')
      navigate('/login', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not save your password.')
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      formId="set-password-form"
      heading="Choose your password"
      subheading="Finish setting up your Medora account."
      panelTitle="Welcome to the team."
      panelBody="Your administrator has invited you to Medora. Choose a password to activate your account."
      bullets={['Role-based access control', 'Audit-ready activity trail', 'Real-time care coordination']}
    >
      {token ? (
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {[
            { id: 'new-password', label: 'New password', value: password, set: setValue, placeholder: '8+ characters' },
            { id: 'confirm-password', label: 'Confirm password', value: confirm, set: setConfirm, placeholder: 'Repeat password' },
          ].map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="block text-sm font-semibold text-cyan-900">
                {field.label}
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cyan-500" aria-hidden="true" />
                <input
                  id={field.id}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={field.value}
                  onChange={(event) => field.set(event.target.value)}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-700 to-cyan-500 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? 'Saving…' : 'Save password'}
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      ) : (
        <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          This link is missing its setup code. Open the full link your administrator shared with you.
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <p className="mt-6 text-center text-sm text-cyan-700">
        <Link to="/login" className="font-semibold text-cyan-800 underline underline-offset-2 hover:text-cyan-950">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
