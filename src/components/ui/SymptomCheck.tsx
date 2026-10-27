import { AlertTriangle, ArrowLeft, ArrowRight, CalendarPlus, CheckCircle2, Info, Phone, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { URGENCY_LABELS } from '../../data/labels'
import type { OldcartsAnswers, TriageAssessment } from '../../data/types'
import { Button, StatusPill } from './primitives'

// A guided OLDCARTS history (Onset, Location, Duration, Character, Aggravating/relieving,
// Radiation, Timing, Severity), submitted to the API for assessment.

type TextField = Exclude<keyof OldcartsAnswers, 'severity'>

interface Step {
  title: string
  hint: string
  fields: { name: TextField; label: string; placeholder: string; required?: boolean }[]
}

const STEPS: Step[] = [
  {
    title: 'What is bothering you?',
    hint: 'Describe the main problem in your own words.',
    fields: [{ name: 'chiefComplaint', label: 'Main problem', placeholder: 'e.g. Pain in my lower back', required: true }],
  },
  {
    title: 'Onset',
    hint: 'When did it start, and did it come on suddenly or gradually?',
    fields: [{ name: 'onset', label: 'When it started', placeholder: 'e.g. Suddenly, yesterday evening while lifting' }],
  },
  {
    title: 'Location',
    hint: 'Where exactly do you feel it?',
    fields: [{ name: 'location', label: 'Where', placeholder: 'e.g. Lower right side of my back' }],
  },
  {
    title: 'Duration',
    hint: 'How long have you had it, and how long does each episode last?',
    fields: [{ name: 'duration', label: 'How long', placeholder: 'e.g. Two days, each episode lasts about an hour' }],
  },
  {
    title: 'Character',
    hint: 'What does it feel like?',
    fields: [{ name: 'character', label: 'What it feels like', placeholder: 'e.g. Sharp, dull, burning, throbbing, tight' }],
  },
  {
    title: 'Aggravating and relieving factors',
    hint: 'What makes it worse, and what makes it better?',
    fields: [
      { name: 'aggravating', label: 'Makes it worse', placeholder: 'e.g. Bending, walking, eating' },
      { name: 'relieving', label: 'Makes it better', placeholder: 'e.g. Lying down, paracetamol, rest' },
    ],
  },
  {
    title: 'Radiation',
    hint: 'Does it spread anywhere else?',
    fields: [{ name: 'radiation', label: 'Spreads to', placeholder: 'e.g. Down my right leg, or "No"' }],
  },
  {
    title: 'Timing',
    hint: 'Is it constant, or does it come and go? Is it worse at certain times?',
    fields: [{ name: 'timing', label: 'Pattern', placeholder: 'e.g. Comes and goes, worse in the morning' }],
  },
]

const EMPTY: OldcartsAnswers = {
  chiefComplaint: '',
  onset: '',
  location: '',
  duration: '',
  character: '',
  aggravating: '',
  relieving: '',
  radiation: '',
  timing: '',
  severity: 3,
  associated: '',
}

const inputClass =
  'mt-2 w-full rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 py-2.5 text-sm font-normal text-cyan-900 outline-none focus:border-cyan-500 focus:bg-white'

const resultTone = {
  danger: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  brand: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  neutral: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export function SymptomCheck({
  emergencyNumber,
  onSubmit,
  onBook,
  onClose,
}: {
  emergencyNumber: string
  onSubmit: (answers: OldcartsAnswers) => Promise<TriageAssessment | null>
  onBook: (department: string) => void
  onClose: () => void
}) {
  const [answers, setAnswers] = useState<OldcartsAnswers>(EMPTY)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<TriageAssessment | null>(null)

  // Steps: the OLDCARTS questions, then severity and other symptoms, then review.
  const severityStep = STEPS.length
  const reviewStep = STEPS.length + 1
  const current = STEPS[step]

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const set = (name: keyof OldcartsAnswers, value: string | number) =>
    setAnswers((previous) => ({ ...previous, [name]: value }))

  async function submit() {
    setBusy(true)
    try {
      const assessment = await onSubmit(answers)
      if (assessment) setResult(assessment)
    } finally {
      setBusy(false)
    }
  }

  const canContinue = step !== 0 || answers.chiefComplaint.trim().length >= 3

  let body: ReactNode
  if (result) {
    const urgency = URGENCY_LABELS[result.urgency]
    body = (
      <div className="space-y-4" aria-live="polite">
        <div className={`rounded-2xl border p-5 ${resultTone[urgency.tone]}`}>
          <div className="flex items-center gap-2">
            {result.urgency === 'emergency' ? (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            )}
            <p className="text-lg font-bold">{urgency.timeframe}</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{result.patientAdvice}</p>
          {result.urgency === 'emergency' || result.urgency === 'urgent' ? (
            <a
              href={`tel:${emergencyNumber.replace(/[^0-9+]/g, '')}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call {emergencyNumber}
            </a>
          ) : null}
        </div>

        {result.redFlags.length ? (
          <div className="rounded-xl border border-red-100 bg-white p-4">
            <p className="text-xs font-bold tracking-wide text-red-700 uppercase">Warning signs in your answers</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
              {result.redFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {result.department && result.urgency !== 'emergency' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-100 bg-white p-4">
            <div>
              <p className="text-xs text-cyan-600">Suggested department</p>
              <p className="font-semibold text-cyan-950">{result.department}</p>
            </div>
            <Button variant="primary" onClick={() => onBook(result.department!)}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Book with {result.department}
            </Button>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-xs leading-relaxed text-cyan-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {result.source === 'ai'
            ? 'This check suggests how soon to get care; it is not a diagnosis. Your care team can see your answers.'
            : 'The automated assessment is unavailable, so this advice comes from safety rules only. It is not a diagnosis. Your care team can see your answers.'}
        </p>
      </div>
    )
  } else if (step === severityStep) {
    body = (
      <div className="space-y-5">
        <div>
          <label htmlFor="severity" className="text-sm font-semibold text-cyan-900">
            Severity: <span className="tabular text-cyan-700">{answers.severity} / 10</span>
          </label>
          <input
            id="severity"
            type="range"
            min={0}
            max={10}
            step={1}
            value={answers.severity}
            onChange={(event) => set('severity', Number(event.target.value))}
            className="mt-3 w-full accent-cyan-700"
          />
          <div className="mt-1 flex justify-between text-xs text-cyan-600">
            <span>0 · none</span>
            <span>5 · moderate</span>
            <span>10 · worst imaginable</span>
          </div>
        </div>
        <label className="block text-sm font-semibold text-cyan-900">
          Any other symptoms? <span className="font-normal text-cyan-600">(optional)</span>
          <textarea
            value={answers.associated}
            onChange={(event) => set('associated', event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. fever, nausea, dizziness, shortness of breath"
            className={inputClass}
          />
        </label>
      </div>
    )
  } else if (step === reviewStep) {
    const rows: [string, string][] = [
      ['Main problem', answers.chiefComplaint],
      ['Onset', answers.onset],
      ['Location', answers.location],
      ['Duration', answers.duration],
      ['Character', answers.character],
      ['Worse with', answers.aggravating],
      ['Better with', answers.relieving],
      ['Spreads to', answers.radiation],
      ['Timing', answers.timing],
      ['Severity', `${answers.severity} / 10`],
      ['Other symptoms', answers.associated],
    ]
    body = (
      <dl className="divide-y divide-cyan-100 rounded-xl border border-cyan-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 px-4 py-2.5 text-sm">
            <dt className="w-32 shrink-0 text-cyan-600">{label}</dt>
            <dd className="text-cyan-950">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    )
  } else {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-cyan-700">{current.hint}</p>
        {current.fields.map((field) => (
          <label key={field.name} className="block text-sm font-semibold text-cyan-900">
            {field.label}
            {field.required ? null : <span className="font-normal text-cyan-600"> (optional)</span>}
            <textarea
              value={answers[field.name]}
              onChange={(event) => set(field.name, event.target.value)}
              maxLength={500}
              rows={step === 0 ? 3 : 2}
              placeholder={field.placeholder}
              className={inputClass}
            />
          </label>
        ))}
      </div>
    )
  }

  const title = result
    ? 'Your symptom check'
    : step === severityStep
      ? 'Severity and other symptoms'
      : step === reviewStep
        ? 'Check your answers'
        : current.title
  const totalSteps = reviewStep + 1

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-cyan-950/40 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="symptom-check-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-cyan-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-500 uppercase">
              Symptom check{result ? '' : ` · step ${step + 1} of ${totalSteps}`}
            </p>
            <h2 id="symptom-check-title" className="mt-1 text-xl font-bold text-cyan-950">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close symptom check"
            className="rounded-xl p-2 text-cyan-600 hover:bg-cyan-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {result ? null : (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              If you have severe chest pain, trouble breathing, signs of a stroke or heavy bleeding, call{' '}
              {emergencyNumber} now instead of using this check.
            </p>
          )}
          {body}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-cyan-100 px-5 py-4">
          {result ? (
            <>
              <StatusPill tone={URGENCY_LABELS[result.urgency].tone}>{URGENCY_LABELS[result.urgency].label}</StatusPill>
              <Button onClick={onClose}>Done</Button>
            </>
          ) : (
            <>
              <Button onClick={() => setStep((value) => value - 1)} disabled={step === 0 || busy}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              {step === reviewStep ? (
                <Button variant="primary" onClick={() => void submit()} disabled={busy}>
                  {busy ? 'Assessing…' : 'Get advice'}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setStep((value) => value + 1)} disabled={!canContinue}>
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
