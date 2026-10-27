import { FinishReason, GoogleGenAI, ThinkingLevel } from '@google/genai'
import { config } from '../config.js'
import { SYSTEM_PROMPT, assessmentSchema, jsonSchema, triageRequest } from './prompt.js'
import type { Assessment, OldcartsAnswers, PatientContext, TriageModel } from './types.js'

// Gemini-backed OLDCARTS assessment: one JSON-schema-constrained request per symptom
// check. The caller applies the rule-based safety floor afterwards and falls back to
// rules alone if this throws.

export class GeminiTriageModel implements TriageModel {
  readonly name = config.GEMINI_MODEL
  private client: GoogleGenAI | null = null

  // Created on first use so a missing key surfaces as a failed check (and a rules-only
  // fallback), never as a crash at start-up.
  private connect(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
      if (!apiKey) throw new Error('GEMINI_API_KEY is not set.')
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: { timeout: 60_000, retryOptions: { attempts: 3 } },
      })
    }
    return this.client
  }

  async assess({ answers, patient, departments }: { answers: OldcartsAnswers; patient: PatientContext; departments: string[] }): Promise<Assessment> {
    if (departments.length === 0) throw new Error('No open departments to route to.')

    const response = await this.connect().models.generateContent({
      model: config.GEMINI_MODEL,
      contents: triageRequest(answers, patient, departments),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema(departments),
        maxOutputTokens: 16_000,
        ...(config.GEMINI_THINKING_LEVEL
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel[config.GEMINI_THINKING_LEVEL] } }
          : {}),
      },
    })

    const blocked = response.promptFeedback?.blockReason
    if (blocked) throw new Error(`Assessment blocked (${blocked}).`)
    const finish = response.candidates?.[0]?.finishReason
    if (finish && finish !== FinishReason.STOP) throw new Error(`Assessment stopped early (${finish}).`)

    const text = response.text
    if (!text) throw new Error('Assessment returned no text.')
    return assessmentSchema(departments).parse(JSON.parse(text))
  }
}
