import { describe, expect, it } from 'vitest'
import { db } from '../src/db.js'
import { as, setupApp } from './helpers.js'

const ctx = setupApp()

const titles = async (userId: string) =>
  (await db.notification.findMany({ where: { recipientId: userId }, orderBy: { at: 'desc' } })).map((n) => n.title)

describe('appointments', () => {
  it('runs request → confirm → complete, notifying each side', async () => {
    const patient = await as(ctx.app, 'patient')
    const created = await patient.post('/appointments', {
      department: 'Endocrinology',
      doctor: 'Dr. Adjoa Mensah',
      date: '2026-10-17',
      time: '10:30',
      reason: 'Follow-up on HbA1c',
      // Patients cannot self-confirm, whatever they send.
      status: 'confirmed',
    })
    expect(created.statusCode).toBe(201)
    const appointment = created.json()
    expect(appointment).toMatchObject({ id: 'A-2318', patientId: 'P-1001', status: 'pending', source: 'app' })
    expect(await titles('U-7')).toContain('New appointment request')

    const reception = await as(ctx.app, 'reception')
    expect((await reception.patch(`/appointments/${appointment.id}`, { status: 'confirmed' })).json().status).toBe('confirmed')
    expect((await titles('U-12'))[0]).toBe('Appointment confirmed')

    expect((await reception.patch(`/appointments/${appointment.id}`, { status: 'completed' })).statusCode).toBe(200)
    const reopened = await reception.patch(`/appointments/${appointment.id}`, { status: 'confirmed' })
    expect(reopened.statusCode).toBe(409)
  })

  it('lets a patient cancel but not confirm, and blocks past dates', async () => {
    const patient = await as(ctx.app, 'patient')
    expect((await patient.patch('/appointments/A-2201', { status: 'confirmed' })).statusCode).toBe(403)
    expect((await patient.patch('/appointments/A-2201', { status: 'cancelled' })).json().status).toBe('cancelled')
    const past = await patient.post('/appointments', {
      department: 'Endocrinology', date: '2026-10-01', time: '10:00', reason: 'Too late',
    })
    expect(past.statusCode).toBe(400)
  })

  it('registers a walk-in and queues them for today', async () => {
    const reception = await as(ctx.app, 'reception')
    const res = await reception.post('/walk-ins', {
      name: 'Esi Mensah', phone: '+233 24 000 0000', sex: 'female', age: 45,
      department: 'General Medicine', reason: 'Persistent cough',
    })
    expect(res.statusCode).toBe(201)
    const { patient, appointment } = res.json()
    expect(patient).toMatchObject({ id: 'P-1009', age: 45 })
    expect(appointment).toMatchObject({ date: '2026-10-16', source: 'walk-in', status: 'confirmed' })
  })
})

describe('diagnostics', () => {
  it('moves a test through the lab and releases it to the care team', async () => {
    const lab = await as(ctx.app, 'lab')
    expect((await lab.patch('/lab-tests/L-506', { status: 'processing' })).statusCode).toBe(409)
    expect((await lab.patch('/lab-tests/L-506', { status: 'sample-collected' })).statusCode).toBe(200)

    const released = await lab.post('/lab-tests/L-504/release', { result: 'Troponin I 0.02 ng/mL — negative' })
    expect(released.json()).toMatchObject({ status: 'completed', reportUploaded: true, isNew: true })
    expect((await titles('U-1'))[0]).toBe('New report to review')
    expect((await lab.post('/lab-tests/L-504/release', { result: 'again' })).statusCode).toBe(409)

    const doctor = await as(ctx.app, 'doctor')
    expect((await doctor.post('/lab-tests/L-504/acknowledge')).json().isNew).toBe(false)
  })

  it('books catalogue tests for patients at catalogue prices', async () => {
    const patient = await as(ctx.app, 'patient')
    const custom = await patient.post('/lab-tests', { testName: 'Free test', category: 'x', price: 0 })
    expect(custom.statusCode).toBe(400)
    const booked = await patient.post('/lab-tests', { catalogueItemId: 'CAT-6', patientId: 'P-1002' })
    expect(booked.json()).toMatchObject({ patientId: 'P-1001', testName: 'Thyroid panel', price: 190, status: 'booked' })
  })
})

describe('ward care', () => {
  it('classifies vitals on the server and escalates critical readings', async () => {
    const nurse = await as(ctx.app, 'staff')
    const res = await nurse.post('/vitals', {
      patientId: 'P-1002', bloodPressure: '182/104', heartRate: 118, temperatureF: 99, spo2: 94, weightKg: 81,
    })
    expect(res.json()).toMatchObject({ severity: 'critical', recordedBy: 'Nurse Grace Owusu', bloodPressure: '182/104' })
    expect(await titles('U-2')).toContain('Critical vitals')
    const bad = await nurse.post('/vitals', { patientId: 'P-1002', bloodPressure: 'high', heartRate: 1 })
    expect(bad.statusCode).toBe(400)
  })

  it('follows the task feedback loop between doctor and nurse', async () => {
    const nurse = await as(ctx.app, 'staff')
    const doctor = await as(ctx.app, 'doctor')
    expect((await nurse.patch('/tasks/T-701', { status: 'done' })).json().status).toBe('done')
    expect((await titles('U-2'))[0]).toBe('Task done')
    expect((await nurse.patch('/tasks/T-701', { status: 'reverted' })).statusCode).toBe(403)
    expect((await doctor.patch('/tasks/T-701', { status: 'reverted' })).json().status).toBe('reverted')

    const reassigned = await doctor.patch('/tasks/T-703', { assignedToId: 'U-4' })
    expect(reassigned.json()).toMatchObject({ assignedTo: 'Nurse Peter Ofori' })
    expect((await titles('U-4'))[0]).toBe('Task assigned to you')
    expect((await doctor.patch('/tasks/T-703', { assignedToId: 'U-5' })).statusCode).toBe(400)
  })

  it('needs a nurse to verify and a doctor to approve a discharge', async () => {
    const nurse = await as(ctx.app, 'staff')
    const doctor = await as(ctx.app, 'doctor')
    expect((await doctor.patch('/discharge-summaries/D-601', { status: 'doctor-approved' })).statusCode).toBe(409)
    expect((await doctor.patch('/discharge-summaries/D-601', { status: 'staff-verified' })).statusCode).toBe(403)
    expect((await nurse.patch('/discharge-summaries/D-601', { status: 'staff-verified' })).statusCode).toBe(200)
    const approved = await doctor.patch('/discharge-summaries/D-601', { status: 'doctor-approved' })
    expect(approved.json()).toMatchObject({ status: 'doctor-approved', approvedBy: 'Dr. Adjoa Mensah' })
    expect((await nurse.patch('/discharge-summaries/D-601', { diagnosis: 'changed' })).statusCode).toBe(409)
  })

  it('records doctor approval of an AI problem summary', async () => {
    const doctor = await as(ctx.app, 'doctor')
    const res = await doctor.post('/problem-summaries/P-1002/approve')
    expect(res.json()).toMatchObject({ approvedBy: 'Dr. Adjoa Mensah', aiGenerated: true })
    expect((await doctor.post('/problem-summaries/P-1002/approve')).statusCode).toBe(409)
  })
})

describe('pharmacy and billing', () => {
  it('orders, dispenses and reorders stock', async () => {
    const patient = await as(ctx.app, 'patient')
    const pharmacy = await as(ctx.app, 'pharmacy')
    const ordered = await patient.post('/prescriptions/R-301/medicines/M-2/order')
    expect(ordered.json().medicines[1]).toMatchObject({ id: 'M-2', ordered: true, dispensed: false })
    expect((await patient.post('/prescriptions/R-301/medicines/M-2/order')).statusCode).toBe(409)

    const dispensed = await pharmacy.post('/prescriptions/R-301/medicines/M-2/dispense')
    expect(dispensed.json().medicines[1].dispensed).toBe(true)

    expect((await pharmacy.post('/inventory/I-1/reorder')).statusCode).toBe(409)
    expect((await pharmacy.post('/inventory/I-2/reorder')).json().reorderRequestedAt).toEqual(expect.any(String))
    expect((await pharmacy.post('/inventory/I-2/reorder')).statusCode).toBe(409)
    expect((await pharmacy.patch('/inventory/I-2', { stock: 400 })).json().reorderRequestedAt).toBeNull()
    expect((await pharmacy.post('/prescriptions/R-302/refill-reminder')).statusCode).toBe(409)
  })

  it('takes payments and refuses to move a paid invoice backwards', async () => {
    const patient = await as(ctx.app, 'patient')
    const reception = await as(ctx.app, 'reception')
    expect((await patient.patch('/invoices/INV-4471', { status: 'paid', method: 'Card' })).statusCode).toBe(409)

    const invoice = await reception.post('/invoices', { patientId: 'P-1001', amount: 120.5, description: 'Consultation' })
    expect(invoice.json()).toMatchObject({ id: 'INV-4477', amount: 120.5, status: 'unpaid' })
    expect((await patient.patch('/invoices/INV-4477', { status: 'partial', method: 'Card' })).statusCode).toBe(403)
    const paid = await patient.patch('/invoices/INV-4477', { status: 'paid', method: 'Mobile money' })
    expect(paid.json()).toMatchObject({ status: 'paid', method: 'Mobile money', paidAt: expect.any(String) })
    expect(await titles('U-7')).toContain('Invoice paid online')
  })
})

describe('audit trail', () => {
  it('records who did what for every change', async () => {
    const reception = await as(ctx.app, 'reception')
    await reception.patch('/appointments/A-2205', { status: 'confirmed' })
    const event = await db.auditEvent.findFirst({ where: { action: 'Marked appointment confirmed' } })
    expect(event).toMatchObject({ actorId: 'U-7', actor: 'Reception Sena Aidoo', role: 'receptionist' })
    expect(event!.target).toBe('A-2205 · Efua Danso')
  })

  it('cannot be edited or deleted, even directly in the database', async () => {
    await expect(db.auditEvent.update({ where: { id: 'AU-1' }, data: { action: 'tampered' } })).rejects.toThrow(/append-only/)
    await expect(db.auditEvent.delete({ where: { id: 'AU-1' } })).rejects.toThrow(/append-only/)
  })

  it('rejects values the domain does not allow, even directly in the database', async () => {
    await expect(db.appointment.update({ where: { id: 'A-2201' }, data: { status: 'teleported' } })).rejects.toThrow()
  })
})

describe('demo reset', () => {
  it('restores the seed data and keeps the caller signed in', async () => {
    const reception = await as(ctx.app, 'reception')
    await reception.patch('/appointments/A-2205', { status: 'confirmed' })
    expect((await reception.post('/demo/reset')).statusCode).toBe(200)
    const appointment = (await reception.get('/appointments')).json().find((a: { id: string }) => a.id === 'A-2205')
    expect(appointment.status).toBe('pending')
  })
})
