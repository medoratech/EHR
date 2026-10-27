import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../src/db.js'
import { GeminiTriageModel } from '../src/triage/gemini.js'
import { screen } from '../src/triage/rules.js'
import { setTriageModel } from '../src/triage/service.js'
import type { Assessment, OldcartsAnswers, PatientContext, TriageModel } from '../src/triage/types.js'
import { as, setupApp } from './helpers.js'

const ctx = setupApp()

const history = (overrides: Partial<OldcartsAnswers> = {}): OldcartsAnswers => ({
  chiefComplaint: 'Mild cough',
  onset: 'Two days ago',
  location: 'Throat',
  duration: 'On and off',
  character: 'Dry and tickly',
  aggravating: 'Cold air',
  relieving: 'Warm drinks',
  radiation: '',
  timing: 'Worse at night',
  severity: 2,
  associated: '',
  ...overrides,
})

const adult: PatientContext = { age: 40, sex: 'female', conditions: [], allergies: [], latestVitals: null }

function fakeModel(result: Partial<Assessment> | Error): TriageModel & { calls: unknown[] } {
  const calls: unknown[] = []
  return {
    name: 'fake-model',
    calls,
    async assess(input) {
      calls.push(input)
      if (result instanceof Error) throw result
      return {
        urgency: 'routine',
        department: input.departments[0],
        clinicalSummary: 'Model summary.',
        patientAdvice: 'Model advice for the patient.',
        redFlags: [],
        considerations: ['Viral upper respiratory infection'],
        ...result,
      }
    },
  }
}

afterEach(() => setTriageModel(null))

describe('safety rules', () => {
  it('flags emergencies, respects negation and context', () => {
    expect(screen(history({ chiefComplaint: 'Crushing chest pain', associated: 'sweating and short of breath', severity: 8 }), adult).urgency).toBe('emergency')
    expect(screen(history({ chiefComplaint: 'Chest pain when I press on a rib', severity: 3 }), adult).redFlags).toEqual([])
    expect(screen(history({ chiefComplaint: 'Cough', associated: 'no chest pain, not short of breath' }), adult).redFlags).toEqual([])
    expect(screen(history({ chiefComplaint: 'My face is drooping on one side' }), adult).urgency).toBe('emergency')
    expect(screen(history({ chiefComplaint: 'Drooping mouth since this morning' }), adult).urgency).toBe('emergency')
    expect(screen(history({ chiefComplaint: 'Facial numbness and slurred speech' }), adult).redFlags).toEqual(['Possible stroke signs'])
    expect(screen(history({ chiefComplaint: 'I keep thinking about ending it', associated: 'I want to kill myself' }), adult).urgency).toBe('emergency')
    expect(screen(history({ chiefComplaint: 'Headache', severity: 9 }), adult).urgency).toBe('urgent')
  })

  it('escalates on recent critical vitals and fever in infants', () => {
    const critical = { ...adult, latestVitals: { bloodPressure: '170/100', heartRate: 120, temperatureF: 99, spo2: 90, severity: 'critical', hoursAgo: 3 } }
    expect(screen(history(), critical).urgency).toBe('urgent')
    expect(screen(history({ chiefComplaint: 'Baby has a fever' }), { ...adult, age: 0 }).urgency).toBe('urgent')
  })
})

describe('symptom checks', () => {
  it('works on safety rules alone when no model is configured', async () => {
    const patient = await as(ctx.app, 'patient')
    const res = await patient.post('/triage-assessments', history({ chiefComplaint: 'Chest pain', associated: 'short of breath and sweating', severity: 8 }))
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ urgency: 'emergency', source: 'rules', patientId: 'P-1001' })
    expect(body.patientAdvice).toMatch(/112/)
    expect(body).not.toHaveProperty('clinicalSummary')
    expect(body).not.toHaveProperty('considerations')
    const doctorAlerts = await db.notification.findMany({ where: { recipientId: 'U-1', title: 'Emergency symptom check' } })
    expect(doctorAlerts).toHaveLength(1)
  })

  it('never lets the model lower the urgency the rules set', async () => {
    setTriageModel(fakeModel({ urgency: 'self_care' }))
    const patient = await as(ctx.app, 'patient')
    const body = (await patient.post('/triage-assessments', history({ chiefComplaint: 'Sudden slurred speech' }))).json()
    expect(body.urgency).toBe('emergency')
    expect(body.redFlags).toContain('Possible stroke signs')
    const doctor = await as(ctx.app, 'doctor')
    const stored = (await doctor.get('/triage-assessments')).json()[0]
    expect(stored.clinicalSummary).toMatch(/raised urgency from self_care to emergency/)
  })

  it('uses the model assessment, sends it patient context, and keeps clinical notes from the patient', async () => {
    const model = fakeModel({ urgency: 'soon', department: 'Endocrinology', patientAdvice: 'Book within 3 days.' })
    setTriageModel(model)
    const patient = await as(ctx.app, 'patient')
    const body = (await patient.post('/triage-assessments', history({ chiefComplaint: 'Very thirsty and tired', severity: 3 }))).json()
    expect(body).toMatchObject({ urgency: 'soon', department: 'Endocrinology', source: 'ai', patientAdvice: 'Book within 3 days.' })

    const sent = model.calls[0] as { patient: PatientContext; departments: string[] }
    expect(sent.patient).toMatchObject({ age: 34, sex: 'female', conditions: ['Type 2 diabetes', 'Mild anaemia'], allergies: ['Penicillin'] })
    expect(JSON.stringify(sent)).not.toMatch(/Amara|MRN|\+233/)
    expect(sent.departments).toContain('Cardiology')

    const doctor = await as(ctx.app, 'doctor')
    const stored = (await doctor.get('/triage-assessments')).json()[0]
    expect(stored).toMatchObject({ model: 'fake-model', considerations: ['Viral upper respiratory infection'] })
    expect((await doctor.post(`/triage-assessments/${stored.id}/review`)).json().reviewedBy).toBe('Dr. Adjoa Mensah')
    expect((await doctor.post(`/triage-assessments/${stored.id}/review`)).statusCode).toBe(409)
  })

  it('falls back to the rules when the model fails', async () => {
    setTriageModel(fakeModel(new Error('network down')))
    const patient = await as(ctx.app, 'patient')
    const body = (await patient.post('/triage-assessments', history())).json()
    expect(body).toMatchObject({ source: 'rules', urgency: 'routine', department: 'Endocrinology' })
  })

  it('falls back to the rules when Gemini has no API key', async () => {
    const saved = { gemini: process.env.GEMINI_API_KEY, google: process.env.GOOGLE_API_KEY }
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_API_KEY
    try {
      setTriageModel(new GeminiTriageModel())
      const patient = await as(ctx.app, 'patient')
      const body = (await patient.post('/triage-assessments', history({ chiefComplaint: 'Vomiting blood' }))).json()
      expect(body).toMatchObject({ source: 'rules', urgency: 'emergency' })
    } finally {
      if (saved.gemini !== undefined) process.env.GEMINI_API_KEY = saved.gemini
      if (saved.google !== undefined) process.env.GOOGLE_API_KEY = saved.google
    }
  })

  it('uses the clinic emergency number and checks access and input', async () => {
    const admin = await as(ctx.app, 'admin')
    await admin.put('/clinic', { emergencyNumber: '193' })
    const patient = await as(ctx.app, 'patient')
    const emergency = (await patient.post('/triage-assessments', history({ chiefComplaint: 'I passed out' }))).json()
    expect(emergency.patientAdvice).toMatch(/193/)

    const other = (await patient.post('/triage-assessments', { ...history(), patientId: 'P-1002' })).json()
    expect(other.patientId).toBe('P-1001')
    expect((await patient.post('/triage-assessments', { severity: 3 })).statusCode).toBe(400)
    expect((await patient.post('/triage-assessments', history({ severity: 11 }))).statusCode).toBe(400)

    const reception = await as(ctx.app, 'reception')
    expect((await reception.get('/triage-assessments')).statusCode).toBe(403)
    const nurse = await as(ctx.app, 'staff')
    expect((await nurse.post('/triage-assessments', { ...history(), patientId: 'P-1003' })).json().patientId).toBe('P-1003')
  })
})

describe('health tips', () => {
  it('matches tips to each of the patient’s conditions in turn', async () => {
    const patient = await as(ctx.app, 'patient')
    const tips = (await patient.get('/health-tips')).json() as { matchedCondition: string | null; category: string }[]
    expect(tips).toHaveLength(5)
    expect(tips.slice(0, 3).map((t) => t.matchedCondition)).toEqual(['Type 2 diabetes', 'Mild anaemia', 'Type 2 diabetes'])
  })

  it('falls back to general advice and is managed by clinicians', async () => {
    const doctor = await as(ctx.app, 'doctor')
    expect((await doctor.get('/health-tips')).statusCode).toBe(400)
    const kwame = (await doctor.get('/health-tips?patientId=P-1002')).json() as { category: string; matchedCondition: string | null }[]
    expect(kwame.map((t) => t.category)).toEqual(['Blood pressure', 'Heart health', 'Blood pressure', 'Hydration', 'Sleep'])

    const zainab = (await doctor.get('/health-tips?patientId=P-1003')).json() as { title: string }[]
    expect(zainab[0].title).toBe('Keep your reliever inhaler with you')

    const created = await doctor.post('/health-tips', { category: 'Kidney health', title: 'Limit salty snacks', body: 'Salt raises blood pressure, which strains the kidneys.', conditions: ['Kidney'] })
    expect(created.json().conditions).toEqual(['kidney'])
    const samuel = (await doctor.get('/health-tips?patientId=P-1008')).json() as { title: string }[]
    expect(samuel.map((t) => t.title)).toContain('Limit salty snacks')

    const patient = await as(ctx.app, 'patient')
    expect((await patient.post('/health-tips', { category: 'x', title: 'x', body: 'x' })).statusCode).toBe(403)
    expect((await patient.get('/health-tips?patientId=P-1002')).json()[0].patientId).toBe('P-1001')
  })
})
