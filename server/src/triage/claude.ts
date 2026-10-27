import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { SYSTEM_PROMPT, assessmentSchema, jsonSchema, triageRequest } from './prompt.js'
import type { Assessment, OldcartsAnswers, PatientContext, TriageModel } from './types.js'

// Claude-backed OLDCARTS assessment: one structured-output request per symptom check.
// The caller applies the rule-based safety floor afterwards and falls back to rules
// alone if this throws.

export class ClaudeTriageModel implements TriageModel {
  readonly name = config.CLAUDE_MODEL
  private readonly client = new Anthropic({ timeout: 60_000, maxRetries: 2 })

  async assess({ answers, patient, departments }: { answers: OldcartsAnswers; patient: PatientContext; departments: string[] }): Promise<Assessment> {
    if (departments.length === 0) throw new Error('No open departments to route to.')

    const response = await this.client.beta.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 16_000,
      // Re-run on Anthropic's recommended fallback model if a safety classifier declines.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: config.CLAUDE_EFFORT, format: { type: 'json_schema', schema: jsonSchema(departments) } },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: triageRequest(answers, patient, departments) }],
    })

    if (response.stop_reason === 'refusal') {
      throw new Error(`Assessment declined (${response.stop_details?.category ?? 'unspecified'}).`)
    }
    if (response.stop_reason === 'max_tokens') throw new Error('Assessment was cut off.')

    const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
    return assessmentSchema(departments).parse(JSON.parse(text))
  }
}
