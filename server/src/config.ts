import { z } from 'zod'

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  /** Lifetime of a "keep me signed in" session. */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** Lifetime of a browser-session sign-in. */
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  /** Comma-separated origins allowed to call the API cross-origin. Empty = same-origin only. */
  CORS_ORIGIN: z.string().default(''),
  COOKIE_SECURE: bool.optional(),
  /** Enables demo accounts on the login page and the "Reset demo data" endpoint. */
  DEMO_MODE: bool.default('false'),
  /**
   * Pins the clinical clock: the server starts at this instant and advances in real
   * time from there, so seeded "today" queues stay meaningful for demos.
   */
  CLOCK_START_AT: z.string().datetime().optional(),
  /** Use an LLM for symptom-check assessments. Off = deterministic safety rules only. */
  TRIAGE_AI: bool.default('true'),
  /** Which model provider assesses symptom checks. */
  TRIAGE_PROVIDER: z.enum(['gemini', 'claude']).default('gemini'),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  /** Optional Gemini thinking level; leave unset to use the model's default. */
  GEMINI_THINKING_LEVEL: z.enum(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  CLAUDE_MODEL: z.string().default('claude-opus-5-5'),
  CLAUDE_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('high'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export type Config = z.infer<typeof schema>

function load(): Config {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Invalid server configuration:\n${issues.join('\n')}`)
  }
  return parsed.data
}

export const config = load()
export const cookieSecure = config.COOKIE_SECURE ?? config.NODE_ENV === 'production'
