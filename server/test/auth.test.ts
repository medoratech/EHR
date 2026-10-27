import { describe, expect, it, vi } from 'vitest'
import { db } from '../src/db.js'
import { ACCOUNTS, client, login, refreshCookie, setupApp } from './helpers.js'

const ctx = setupApp()

const loginRequest = (email: string, password: string, remember = false) =>
  ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password, remember } })

describe('sign in', () => {
  it('returns an access token, the session user and an httpOnly refresh cookie', async () => {
    const res = await loginRequest(ACCOUNTS.doctor, 'medora')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user).toMatchObject({ id: 'U-1', role: 'doctor', home: '/doctor' })
    expect(body.accessToken).toEqual(expect.any(String))
    const cookie = res.cookies.find((c) => c.name === 'medora_rt')!
    expect(cookie.httpOnly).toBe(true)
    expect(cookie.sameSite).toBe('Strict')
    expect(cookie.path).toBe('/api/auth')
    expect(cookie.maxAge).toBeUndefined()
  })

  it('makes the cookie persistent only when asked to keep the user signed in', async () => {
    const res = await loginRequest(ACCOUNTS.doctor, 'medora', true)
    expect(res.cookies.find((c) => c.name === 'medora_rt')!.maxAge).toBe(30 * 86_400)
  })

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await loginRequest(ACCOUNTS.doctor, 'nope-nope')
    const unknown = await loginRequest('ghost@medora.health', 'nope-nope')
    expect(wrong.statusCode).toBe(401)
    expect(unknown.statusCode).toBe(401)
    expect(wrong.json()).toEqual(unknown.json())
  })

  it('refuses suspended and not-yet-approved accounts', async () => {
    const suspended = await loginRequest('k.bediako@medora.health', 'medora')
    expect(suspended.statusCode).toBe(403)
    expect(suspended.json().error.message).toMatch(/suspended/)
    // Invited without a password: indistinguishable from a wrong password.
    expect((await loginRequest('i.saleh@medora.health', 'medora')).statusCode).toBe(401)
  })

  it('locks the account after five failures and audits the attempts', async () => {
    for (let i = 0; i < 5; i++) await loginRequest(ACCOUNTS.lab, 'wrong-password')
    const locked = await loginRequest(ACCOUNTS.lab, 'medora')
    expect(locked.statusCode).toBe(429)
    const events = await db.auditEvent.findMany({ where: { target: ACCOUNTS.lab } })
    expect(events.map((e) => e.action)).toContain('Account locked after failed logins')
  })
})

describe('sessions', () => {
  it('rotates the refresh token and rejects a replayed one after the grace window', async () => {
    const first = refreshCookie(await loginRequest(ACCOUNTS.staff, 'medora'))
    const refresh = (token: string) =>
      ctx.app.inject({ method: 'POST', url: '/api/auth/refresh', cookies: { medora_rt: token } })

    const rotated = await refresh(first)
    expect(rotated.statusCode).toBe(200)
    const second = refreshCookie(rotated)
    expect(second).not.toBe(first)

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 60_000)
    try {
      const replay = await refresh(first)
      expect(replay.statusCode).toBe(401)
      // Reuse revokes the whole family, including the legitimate newer token.
      expect((await refresh(second)).statusCode).toBe(401)
    } finally {
      vi.useRealTimers()
    }
  })

  it('logout revokes the refresh token', async () => {
    const cookie = refreshCookie(await loginRequest(ACCOUNTS.reception, 'medora'))
    const out = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout', cookies: { medora_rt: cookie } })
    expect(out.statusCode).toBe(204)
    const again = await ctx.app.inject({ method: 'POST', url: '/api/auth/refresh', cookies: { medora_rt: cookie } })
    expect(again.statusCode).toBe(401)
  })

  it('suspending a user blocks their existing access token immediately', async () => {
    const nurse = client(ctx.app, await login(ctx.app, ACCOUNTS.otherNurse))
    expect((await nurse.get('/tasks')).statusCode).toBe(200)
    const admin = client(ctx.app, await login(ctx.app, ACCOUNTS.admin))
    expect((await admin.patch('/users/U-4', { status: 'suspended' })).statusCode).toBe(200)
    expect((await nurse.get('/tasks')).statusCode).toBe(401)
  })

  it('rejects requests without a valid token', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/api/patients' })).statusCode).toBe(401)
    const forged = client(ctx.app, 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJVLTExIiwicm9sZSI6ImFkbWluIn0.bad')
    expect((await forged.get('/audit-events')).statusCode).toBe(401)
  })
})

describe('registration', () => {
  it('opens a chart and signs a patient straight in', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Kofi Annan',
        email: 'kofi@example.com',
        password: 'a-strong-password',
        role: 'patient',
        dateOfBirth: '1990-05-01',
        sex: 'male',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.patientId).toBe('P-1009')
    const me = client(ctx.app, body.accessToken)
    const patients = (await me.get('/patients')).json()
    expect(patients).toHaveLength(1)
    expect(patients[0]).toMatchObject({ id: 'P-1009', mrn: 'MRN-48209', age: 36 })
  })

  it('holds staff sign-ups until an administrator approves them', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Dr. New Person', email: 'new@medora.health', password: 'a-strong-password', role: 'doctor' },
    })
    expect(res.statusCode).toBe(202)
    const blocked = await loginRequest('new@medora.health', 'a-strong-password')
    expect(blocked.statusCode).toBe(403)
    expect(blocked.json().error.message).toMatch(/approval/)

    const admin = client(ctx.app, await login(ctx.app, ACCOUNTS.admin))
    const user = (await admin.get('/users')).json().find((u: { email: string }) => u.email === 'new@medora.health')
    expect((await admin.patch(`/users/${user.id}`, { status: 'active' })).statusCode).toBe(200)
    expect((await loginRequest('new@medora.health', 'a-strong-password')).statusCode).toBe(200)
  })

  it('lets an invited user choose a password through their setup link', async () => {
    const admin = client(ctx.app, await login(ctx.app, ACCOUNTS.admin))
    const invite = await admin.post('/users', { name: 'Nurse Ama', email: 'ama@medora.health', role: 'staff' })
    expect(invite.statusCode).toBe(201)
    const token = new URL(invite.json().setupPath, 'http://x').searchParams.get('token')!

    const set = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/set-password',
      payload: { token, password: 'nurse-ama-password' },
    })
    expect(set.statusCode).toBe(204)
    expect((await loginRequest('ama@medora.health', 'nurse-ama-password')).statusCode).toBe(200)

    const reused = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/set-password',
      payload: { token, password: 'another-password' },
    })
    expect(reused.statusCode).toBe(410)
  })

  it('rejects a duplicate email and a short password', async () => {
    const duplicate = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Copy', email: ACCOUNTS.doctor, password: 'long-enough-pw', role: 'doctor' },
    })
    expect(duplicate.statusCode).toBe(409)
    const short = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Short', email: 'short@x.com', password: 'short', role: 'doctor' },
    })
    expect(short.statusCode).toBe(400)
    expect(short.json().error.code).toBe('validation_failed')
  })
})
