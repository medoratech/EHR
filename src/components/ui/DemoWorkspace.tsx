import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './primitives'

export function DemoWorkspace({
  title,
  description,
  action,
  children,
  onComplete,
  onClose,
}: {
  title: string
  description: string
  action: string
  children: ReactNode
  onComplete?: () => void
  onClose: () => void
}) {
  const [complete, setComplete] = useState(false)
  const fieldsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fieldsRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function completeAction() {
    const fields = fieldsRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[required]')
    if (fields && Array.from(fields).some((field) => !field.value.trim())) {
      fields.forEach((field) => field.reportValidity())
      return
    }
    onComplete?.()
    setComplete(true)
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
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl shadow-cyan-950/25"
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
            <div className="rounded-2xl bg-emerald-50 p-7 text-center text-emerald-800">
              <CheckCircle2 className="mx-auto h-9 w-9" aria-hidden="true" />
              <p className="mt-2 font-semibold">{action} completed</p>
              <p className="mt-1 text-sm">The update is now visible across the care workspace.</p>
            </div>
          ) : (
            <>
              <div ref={fieldsRef} className="space-y-4">{children}</div>
              <Button variant="primary" className="mt-5 w-full" onClick={completeAction}>
                {action}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function WorkspaceField({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-cyan-900">
      {label}
      {children ?? (
        <input required className="mt-2 h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 text-sm font-normal text-cyan-900 outline-none focus:border-cyan-500 focus:bg-white" />
      )}
    </label>
  )
}
