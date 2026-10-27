import { describe, expect, it } from 'vitest'
import { as, setupApp } from './helpers.js'

const ctx = setupApp()

describe('patient data isolation', () => {
  it('shows a patient only their own chart in every collection', async () => {
    const patient = await as(ctx.app, 'patient')
    // Amara has no discharge summary in the seed; scoping is still checked.
    for (const url of [
      '/patients', '/appointments', '/vitals', '/lab-tests', '/prescriptions', '/invoices',
      '/discharge-summaries', '/problem-summaries', '/diet-plans', '/glucose-readings',
    ]) {
      const res = await patient.get(url)
      expect(res.statusCode, url).toBe(200)
      const rows = res.json() as { id?: string; patientId?: string }[]
      if (url !== '/discharge-summaries') expect(rows.length, url).toBeGreaterThan(0)
      for (const row of rows) expect(row.patientId ?? row.id, url).toBe('P-1001')
    }
  })

  it('refuses a patient access to someone else’s record', async () => {
    const patient = await as(ctx.app, 'patient')
    expect((await patient.get('/patients/P-1002')).statusCode).toBe(403)
    expect((await patient.get('/vitals?patientId=P-1002')).json()).toHaveLength(1)
    expect((await patient.patch('/invoices/INV-4472', { status: 'paid', method: 'Card' })).statusCode).toBe(403)
    expect((await patient.post('/prescriptions/R-302/medicines/M-4/order')).statusCode).toBe(403)
  })

  it('keeps operational collections away from patients', async () => {
    const patient = await as(ctx.app, 'patient')
    for (const url of ['/tasks', '/inventory', '/users', '/audit-events', '/clinical-notes', '/system/settings']) {
      expect((await patient.get(url)).statusCode, url).toBe(403)
    }
  })

  it('only shows a user their own notifications', async () => {
    const patient = await as(ctx.app, 'patient')
    const doctor = await as(ctx.app, 'doctor')
    const mine = (await patient.get('/notifications')).json() as { id: string }[]
    const theirs = (await doctor.get('/notifications')).json() as { id: string }[]
    expect(mine.map((n) => n.id).sort()).toEqual(['N-1', 'N-2', 'N-3', 'N-4'])
    expect(theirs.map((n) => n.id).sort()).toEqual(['N-5', 'N-6'])
    expect((await doctor.post('/notifications/N-1/read')).statusCode).toBe(404)
  })
})

describe('role permissions', () => {
  it.each([
    ['doctor', 'GET', '/audit-events', undefined],
    ['lab', 'POST', '/appointments', { patientId: 'P-1001', department: 'Cardiology', date: '2026-10-20', time: '10:00', reason: 'x' }],
    ['reception', 'POST', '/vitals', { patientId: 'P-1001', bloodPressure: '120/80', heartRate: 70, temperatureF: 98.6, spo2: 98, weightKg: 70 }],
    ['pharmacy', 'POST', '/lab-tests/L-504/release', { result: 'Normal' }],
    ['staff', 'POST', '/prescriptions', { patientId: 'P-1001', medicines: [{ name: 'X', dosage: '1', frequency: 'daily', durationDays: 1 }] }],
    ['doctor', 'POST', '/users', { name: 'X', email: 'x@medora.health', role: 'staff' }],
    ['admin', 'POST', '/lab-tests/L-504/release', { result: 'Normal' }],
  ] as const)('%s cannot %s %s', async (who, method, url, payload) => {
    const user = await as(ctx.app, who)
    const res = method === 'GET' ? await user.get(url) : await user.post(url, payload)
    expect(res.statusCode).toBe(403)
  })

  it('stops ward staff from reassigning or touching other nurses’ tasks', async () => {
    const nurse = await as(ctx.app, 'staff')
    expect((await nurse.patch('/tasks/T-701', { assignedToId: 'U-4' })).statusCode).toBe(403)
    expect((await nurse.patch('/tasks/T-702', { status: 'in-progress' })).statusCode).toBe(403)
    expect((await nurse.patch('/tasks/T-703', { status: 'in-progress' })).statusCode).toBe(200)
  })

  it('stops an administrator from changing their own access', async () => {
    const admin = await as(ctx.app, 'admin')
    expect((await admin.patch('/users/U-11', { status: 'suspended' })).statusCode).toBe(403)
  })
})
