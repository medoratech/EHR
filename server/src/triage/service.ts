import { config } from '../config.js'
import { ClaudeTriageModel } from './claude.js'
import { GemmaTriageModel } from './gemma.js'
import { GeminiTriageModel } from './gemini.js'
import { rulesOnlyAdvice, screen } from './rules.js'
import { URGENCIES, moreUrgent, type Assessment, type OldcartsAnswers, type PatientContext, type TriageModel, type Urgency } from './types.js'

function configuredModel(): TriageModel | null {
  if (!config.TRIAGE_AI) return null
  if (config.TRIAGE_PROVIDER === 'claude') return new ClaudeTriageModel()
  if (config.TRIAGE_PROVIDER === 'gemma') return new GemmaTriageModel()
  return new GeminiTriageModel()
}

let model: TriageModel | null = configuredModel()

/** Replaces the assessor (tests use a fake; null = rules only). */
export function setTriageModel(next: TriageModel | null) {
  model = next
}

export interface TriageOutcome extends Assessment {
  source: 'ai' | 'rules'
  model: string | null
}

function historySummary(answers: OldcartsAnswers): string {
  const parts = [
    `Main problem: ${answers.chiefComplaint}`,
    answers.onset && `onset ${answers.onset}`,
    answers.location && `location ${answers.location}`,
    answers.duration && `duration ${answers.duration}`,
    answers.character && `character ${answers.character}`,
    answers.aggravating && `worse with ${answers.aggravating}`,
    answers.relieving && `better with ${answers.relieving}`,
    answers.radiation && `radiates to ${answers.radiation}`,
    answers.timing && `timing ${answers.timing}`,
    `severity ${answers.severity}/10`,
    answers.associated && `also ${answers.associated}`,
  ]
  return `${parts.filter(Boolean).join('; ')}.`
}

export async function runTriage(input: {
  answers: OldcartsAnswers
  patient: PatientContext
  departments: string[]
  preferredDepartment: string | null
  emergencyNumber: string
  onModelError: (error: unknown) => void
}): Promise<TriageOutcome> {
  const rules = screen(input.answers, input.patient)

  if (model) {
    try {
      const ai = await model.assess({ answers: input.answers, patient: input.patient, departments: input.departments })
      const urgency = moreUrgent(rules.urgency, ai.urgency)
      const escalated = urgency !== ai.urgency
      return {
        ...ai,
        urgency,
        redFlags: [...new Set([...rules.redFlags, ...ai.redFlags])],
        // Emergency and rule-escalated outcomes always carry the clinic's own instructions.
        patientAdvice: escalated || urgency === 'emergency' ? rulesOnlyAdvice(urgency, input.emergencyNumber) : ai.patientAdvice,
        clinicalSummary: escalated
          ? `${ai.clinicalSummary} Safety rules raised urgency from ${ai.urgency} to ${urgency}.`
          : ai.clinicalSummary,
        source: 'ai',
        model: model.name,
      }
    } catch (error) {
      input.onModelError(error)
    }
  }

  // Rules only: never below "routine", because nobody has actually assessed the history.
  const urgency: Urgency = moreUrgent(rules.urgency, 'routine')
  return {
    urgency,
    department:
      input.preferredDepartment && input.departments.includes(input.preferredDepartment)
        ? input.preferredDepartment
        : null,
    clinicalSummary: `${historySummary(input.answers)} Automated assessment unavailable; urgency set by safety rules only.`,
    patientAdvice: rulesOnlyAdvice(urgency, input.emergencyNumber),
    redFlags: rules.redFlags,
    considerations: [],
    source: 'rules',
    model: null,
  }
}

export { URGENCIES }
