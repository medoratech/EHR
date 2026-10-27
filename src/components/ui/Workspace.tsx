import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type HTMLInputTypeAttribute, type ReactNode } from 'react'
import { Button } from './primitives'

export type WorkspaceValues = Record<string, string>

/**
 * Modal form for creating or updating a record. Fields are read by their `name`.
 * `onComplete` returns false (or null) when the save failed, which keeps the form open.
 */
export function Workspace({
  title,
  description,
  action,
  children,
  onComplete,
  onClose,
  result,
}: {
  title: string
  description: string
  action: string
  children: ReactNode
  onComplete: (values: WorkspaceValues) => Promise<unknown> | unknown
  onClose: () => void
  /** Extra content shown after a successful save. */
  result?: ReactNode
}) {
  const [complete, setComplete] = useState(false)
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const values: WorkspaceValues = {}
    new FormData(event.currentTarget).forEach((value, key) => {
      values[key] = typeof value === 'string' ? value.trim() : value.name
    })
    setBusy(true)
    try {
      const outcome = await onComplete(values)
      if (outcome !== false && outcome !== null) setComplete(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-cyan-950/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/80 bg-white shadow-2xl shadow-cyan-950/25"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-cyan-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-500 uppercase">Medora workspace</p>
            <h2 id="workspace-title" className="mt-1 text-xl font-bold text-cyan-950">{complete ? 'Saved successfully' : title}</h2>
            <p className="mt-1 text-sm text-cyan-700">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close workspace" className="rounded-xl p-2 text-cyan-600 hover:bg-cyan-50">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="p-5">
          {complete ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-emerald-50 p-7 text-center text-emerald-800" role="status">
                <CheckCircle2 className="mx-auto h-9 w-9" aria-hidden="true" />
                <p className="mt-2 font-semibold">{action} completed</p>
                <p className="mt-1 text-sm">The update is now visible across the care workspace.</p>
              </div>
              {result}
            </div>
          ) : (
            <form ref={formRef} onSubmit={submit}>
              <div className="space-y-4">{children}</div>
              <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy}>
                {busy ? 'Saving…' : action}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const fieldClass =
  'mt-2 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 text-sm font-normal text-cyan-900 outline-none focus:border-cyan-500 focus:bg-white'

export function WorkspaceField({
  label,
  name,
  children,
  type = 'text',
  required = true,
  placeholder,
  defaultValue,
  min,
  max,
  step,
}: {
  label: string
  name?: string
  children?: ReactNode
  type?: HTMLInputTypeAttribute
  required?: boolean
  placeholder?: string
  defaultValue?: string | number
  min?: number | string
  max?: number | string
  step?: number | string
}) {
  return (
    <label className="block text-sm font-semibold text-cyan-900">
      {label}
      {children ?? (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          className={fieldClass}
        />
      )}
    </label>
  )
}

export function WorkspaceSelect({
  name,
  options,
  defaultValue,
  required = true,
}: {
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  required?: boolean
}) {
  return (
    <select name={name} defaultValue={defaultValue} required={required} className={fieldClass}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
