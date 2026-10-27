import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { buildApp } from '../src/app.js'
import { db } from '../src/db.js'
import { resetDemoData } from '../src/seed/index.js'

export const ACCOUNTS = {
  doctor: 'doctor@medora.health',
  staff: 'staff@medora.health',
  otherNurse: 'p.ofori@medora.health',
  lab: 'lab@medora.health',
  pharmacy: 'pharmacy@medora.health',
  reception: 'reception@medora.health',
  admin: 'admin@medora.health',
  patient: 'patient@medora.health',
} as const

export function setupApp() {
  const context = { app: undefined as unknown as FastifyInstance }
  beforeAll(async () => {
    context.app = await buildApp({ logger: false })
    await context.app.ready()
  })
  beforeEach(async () => {
    await resetDemoData(db)
  })
  afterAll(async () => {
    await context.app.close()
  })
  return context
}

export async function login(app: FastifyInstance, email: string, password = 'medora') {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })
  if (res.statusCode !== 200) throw new Error(`login ${email} failed: ${res.statusCode} ${res.body}`)
  return res.json<{ accessToken: string }>().accessToken
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT'

export function client(app: FastifyInstance, token: string) {
  const call = (method: Method, url: string, payload?: unknown): Promise<LightMyRequestResponse> =>
    app.inject({
      method,
      url: `/api${url}`,
      headers: { authorization: `Bearer ${token}` },
      payload: payload as object | undefined,
    })
  return {
    get: (url: string) => call('GET', url),
    post: (url: string, payload: unknown = {}) => call('POST', url, payload),
    patch: (url: string, payload: unknown) => call('PATCH', url, payload),
    put: (url: string, payload: unknown) => call('PUT', url, payload),
  }
}

export async function as(app: FastifyInstance, who: keyof typeof ACCOUNTS) {
  return client(app, await login(app, ACCOUNTS[who]))
}

export function refreshCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === 'medora_rt')
  if (!cookie) throw new Error('no refresh cookie set')
  return cookie.value
}
