import { config } from '../config.js'
import { SYSTEM_PROMPT, assessmentSchema, jsonSchema, triageRequest } from './prompt.js'
import type { Assessment, OldcartsAnswers, PatientContext, TriageModel } from './types.js'

// Local Gemma 3 API (FastAPI at /v1/chat): { message, system } in, text/JSON out.
// Same prompt/schema as the other providers; the caller applies the safety floor afterwards.

const SYSTEM_LIMIT = 2000
const MESSAGE_LIMIT = 8000

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? trimmed).trim()
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1))
    throw new Error('Assessment returned non-JSON text.')
  }
}

function replyText(payload: unknown): string {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') throw new Error('Assessment returned an empty body.')
  const record = payload as Record<string, unknown>
  for (const key of ['reply', 'response', 'content', 'message', 'text', 'output']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  // Some wrappers nest the assistant turn.
  const message = record.message
  if (message && typeof message === 'object' && typeof (message as { content?: unknown }).content === 'string') {
    return (message as { content: string }).content
  }
  throw new Error('Assessment returned no text.')
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export class GemmaTriageModel implements TriageModel {
  readonly name = config.GEMMA_MODEL

  async assess({ answers, patient, departments }: { answers: OldcartsAnswers; patient: PatientContext; departments: string[] }): Promise<Assessment> {
    if (departments.length === 0) throw new Error('No open departments to route to.')
    if (!config.GEMMA_API_KEY) throw new Error('GEMMA_API_KEY is not set.')

    const schema = jsonSchema(departments)
    // API caps system at 2000 chars; keep the shared prompt there and put the schema in the user turn.
    const system = clip(
      `${SYSTEM_PROMPT}\n\nRespond with a single JSON object only (no markdown).`,
      SYSTEM_LIMIT,
    )
    const message = clip(
      `${triageRequest(answers, patient, departments)}\n\nJSON schema:\n${JSON.stringify(schema)}`,
      MESSAGE_LIMIT,
    )

    const base = config.GEMMA_BASE_URL.replace(/\/+$/, '')
    const url = `${base}/v1/chat`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.GEMMA_API_KEY}`,
      },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({ message, system }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Gemma triage failed (${response.status}): ${detail.slice(0, 300)}`)
    }

    const payload: unknown = await response.json()
    return assessmentSchema(departments).parse(extractJson(replyText(payload)))
  }
}
