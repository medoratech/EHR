import { describe, expect, it } from 'vitest'
import { as, setupApp } from './helpers.js'

const ctx = setupApp()

describe('clinic reference data', () => {
  it('is readable without signing in', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/clinic' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ currency: 'GHS', locale: 'en-GH', timeZone: 'Africa/Accra', defaultClinician: 'Duty clinician' })
    expect(body.departments).toHaveLength(8)
    expect(body.paymentMethods).toEqual(['Cash', 'Mobile money', 'Card'])
  })

  it('can only be edited by an administrator, with validated values', async () => {
    const doctor = await as(ctx.app, 'doctor')
    expect((await doctor.put('/clinic', { currency: 'USD' })).statusCode).toBe(403)

    const admin = await as(ctx.app, 'admin')
    expect((await admin.put('/clinic', { currency: 'XYZ' })).statusCode).toBe(400)
    expect((await admin.put('/clinic', { timeZone: 'Mars/Olympus' })).statusCode).toBe(400)
    expect((await admin.put('/clinic', { paymentMethods: [] })).statusCode).toBe(400)
    expect((await admin.put('/clinic', { appointmentSlots: ['9am'] })).statusCode).toBe(400)

    const updated = await admin.put('/clinic', {
      currency: 'kes',
      locale: 'en-KE',
      appointmentSlots: ['14:00', '09:00'],
      paymentMethods: ['M-Pesa', 'Cash'],
    })
    expect(updated.json()).toMatchObject({ currency: 'KES', appointmentSlots: ['09:00', '14:00'], paymentMethods: ['M-Pesa', 'Cash'] })
  })

  it('drives booking slots and accepted payment methods', async () => {
    const admin = await as(ctx.app, 'admin')
    await admin.put('/clinic', { appointmentSlots: ['09:00'], paymentMethods: ['M-Pesa'] })

    const patient = await as(ctx.app, 'patient')
    const offSlot = await patient.post('/appointments', { department: 'Endocrinology', date: '2026-10-17', time: '10:30', reason: 'Review' })
    expect(offSlot.statusCode).toBe(400)
    const onSlot = await patient.post('/appointments', { department: 'Endocrinology', date: '2026-10-17', time: '09:00', reason: 'Review' })
    expect(onSlot.json()).toMatchObject({ time: '09:00', doctor: 'Duty clinician' })

    const reception = await as(ctx.app, 'reception')
    expect((await reception.patch('/invoices/INV-4473', { status: 'paid', method: 'Cash' })).statusCode).toBe(400)
    expect((await reception.patch('/invoices/INV-4473', { status: 'paid', method: 'M-Pesa' })).json().method).toBe('M-Pesa')
  })

  it('uses the configured default clinician for unassigned bookings', async () => {
    const admin = await as(ctx.app, 'admin')
    await admin.put('/clinic', { defaultClinician: 'Clinician on call' })
    const reception = await as(ctx.app, 'reception')
    const res = await reception.post('/walk-ins', {
      name: 'Ama Owusu', sex: 'female', age: 30, department: 'General Medicine', reason: 'Fever',
    })
    expect(res.json().appointment.doctor).toBe('Clinician on call')
  })

  it('reckons “today” and wall times in the clinic time zone', async () => {
    const admin = await as(ctx.app, 'admin')
    // The pinned clock reads 2026-10-16 09:00 UTC, which is still the 15th, 22:00, in Pago Pago (UTC−11).
    await admin.put('/clinic', { timeZone: 'Pacific/Pago_Pago' })
    const reception = await as(ctx.app, 'reception')
    const res = await reception.post('/walk-ins', {
      name: 'Late Arrival', sex: 'male', age: 50, department: 'Cardiology', reason: 'Chest pain',
    })
    expect(res.json().appointment).toMatchObject({ date: '2026-10-15', time: expect.stringMatching(/^22:0\d$/) })
  })
})

describe('departments', () => {
  it('can be added, closed to new records, and renamed with history intact', async () => {
    const admin = await as(ctx.app, 'admin')
    const reception = await as(ctx.app, 'reception')
    const walkIn = (department: string) =>
      reception.post('/walk-ins', { name: 'Test Person', sex: 'female', age: 40, department, reason: 'Check-up' })

    expect((await walkIn('Oncology')).statusCode).toBe(400)
    expect((await admin.post('/departments', { name: 'Oncology' })).statusCode).toBe(201)
    expect((await admin.post('/departments', { name: 'Oncology' })).statusCode).toBe(409)
    expect((await walkIn('Oncology')).statusCode).toBe(201)

    expect((await admin.patch('/departments/Oncology', { active: false })).json().active).toBe(false)
    expect((await walkIn('Oncology')).json().error.message).toMatch(/not taking new patients/)

    expect((await admin.patch('/departments/Cardiology', { rename: 'Heart Centre' })).statusCode).toBe(200)
    const patients = (await reception.get('/patients')).json() as { id: string; department: string }[]
    expect(patients.find((p) => p.id === 'P-1002')!.department).toBe('Heart Centre')
  })

  it('refuses to close the last open department', async () => {
    const admin = await as(ctx.app, 'admin')
    const { departments } = (await ctx.app.inject({ method: 'GET', url: '/api/clinic' })).json() as {
      departments: { name: string }[]
    }
    for (const { name } of departments.slice(1)) await admin.patch(`/departments/${encodeURIComponent(name)}`, { active: false })
    const last = await admin.patch(`/departments/${encodeURIComponent(departments[0].name)}`, { active: false })
    expect(last.statusCode).toBe(409)
  })
})
