import { z } from 'zod'

export const URGENCIES = ['self_care', 'routine', 'soon', 'urgent', 'emergency'] as const
export type Urgency = (typeof URGENCIES)[number]

/** Ordered least to most urgent; the higher of two urgencies always wins. */
export function moreUrgent(a: Urgency, b: Urgency): Urgency {
  return URGENCIES.indexOf(a) >= URGENCIES.indexOf(b) ? a : b
}

const answer = z.string().trim().max(500)

/** The OLDCARTS history: Onset, Location, Duration, Character, Aggravating/relieving, Radiation, Timing, Severity. */
export const oldcartsSchema = z.object({
  chiefComplaint: z.string().trim().min(3, 'Describe the main problem').max(500),
  onset: answer.default(''),
  location: answer.default(''),
  duration: answer.default(''),
  character: answer.default(''),
  aggravating: answer.default(''),
  relieving: answer.default(''),
  radiation: answer.default(''),
  timing: answer.default(''),
  severity: z.coerce.number().int().min(0).max(10),
  associated: answer.default(''),
})
export type OldcartsAnswers = z.infer<typeof oldcartsSchema>

/** What the clinician-facing assessment needs to know about the patient. No names or identifiers. */
export interface PatientContext {
  age: number
  sex: string
  conditions: string[]
  allergies: string[]
  latestVitals: {
    bloodPressure: string
    heartRate: number
    temperatureF: number
    spo2: number
    severity: string
    hoursAgo: number
  } | null
}

export interface Assessment {
  urgency: Urgency
  department: string | null
  clinicalSummary: string
  patientAdvice: string
  redFlags: string[]
  considerations: string[]
}

/** Something that can assess a symptom history. Swappable so tests never call the network. */
export interface TriageModel {
  readonly name: string
  assess(input: { answers: OldcartsAnswers; patient: PatientContext; departments: string[] }): Promise<Assessment>
}
