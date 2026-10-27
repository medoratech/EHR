import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { assertCanAccessPatient, isStaff, patientScope, requireRole } from '../lib/access.js'
import { audit, notifyRoles } from '../lib/activity.js'
import { ageOn, now } from '../lib/clock.js'
import { clinic } from '../lib/clinic.js'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { idParams, mutate, parse } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'
import { runTriage } from '../triage/service.js'
import { oldcartsSchema, type PatientContext } from '../triage/types.js'

const CLINICAL_READERS = ['doctor', 'staff', 'admin'] as const

const URGENCY_LABEL: Record<string, string> = {
  emergency: 'Emergency',
  urgent: 'Urgent (today)',
  soon: 'Within 1–3 days',
  routine: 'Routine',
  self_care: 'Self-care',
}

export default async function triageRoutes(app: FastifyInstance) {
  app.get('/triage-assessments', async (request) => {
    const actor = request.actor
    if (isStaff(actor)) requireRole(actor, CLINICAL_READERS)
    const rows = await db.triageAssessment.findMany({
      where: patientScope(actor),
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: out.triageInclude,
    })
    return rows.map((row) => out.triageAssessment(row, isStaff(actor)))
  })

  app.post(
    '/triage-assessments',
    // Each check is a paid model call; keep a single client from running up the bill.
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const actor = request.actor
      requireRole(actor, ['patient', 'doctor', 'staff', 'receptionist'])
      const body = parse(z.object({ patientId: z.string().max(64).optional() }).passthrough(), request.body)
      const answers = parse(oldcartsSchema, request.body)
      const patientId = actor.role === 'patient' ? actor.patientId : body.patientId
      if (!patientId) throw badRequest('Choose the patient this symptom check is for.')
      assertCanAccessPatient(actor, patientId)

      const patient = await db.patient.findUnique({ where: { id: patientId } })
      if (!patient) throw notFound('Patient')
      const latest = await db.vitals.findFirst({ where: { patientId }, orderBy: { recordedAt: 'desc' } })
      const departments = (
        await db.department.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }] })
      ).map((department) => department.name)

      const context: PatientContext = {
        age: ageOn(patient.dateOfBirth),
        sex: patient.sex,
        conditions: patient.conditions,
        allergies: patient.allergies.filter((allergy) => allergy !== 'None known'),
        latestVitals: latest
          ? {
              bloodPressure: `${latest.systolic}/${latest.diastolic}`,
              heartRate: latest.heartRate,
              temperatureF: latest.temperatureF,
              spo2: latest.spo2,
              severity: latest.severity,
              hoursAgo: Math.max(0, Math.round((now().getTime() - latest.recordedAt.getTime()) / 3_600_000)),
            }
          : null,
      }

      const outcome = await runTriage({
        answers,
        patient: context,
        departments,
        preferredDepartment: patient.department,
        emergencyNumber: clinic().emergencyNumber,
        onModelError: (error) => request.log.warn({ err: error }, 'triage model unavailable; using safety rules'),
      })

      const row = await mutate(['triageAssessments'], async (tx) => {
        const assessment = await tx.triageAssessment.create({
          data: {
            id: await nextId(tx, 'TRI'),
            patientId,
            submittedById: actor.id,
            answers,
            urgency: outcome.urgency,
            department: outcome.department,
            clinicalSummary: outcome.clinicalSummary,
            patientAdvice: outcome.patientAdvice,
            redFlags: outcome.redFlags,
            considerations: outcome.considerations,
            source: outcome.source,
            model: outcome.model,
            createdAt: now(),
          },
          include: out.triageInclude,
        })
        await audit(tx, actor, {
          action: `Completed symptom check (${URGENCY_LABEL[outcome.urgency]}, ${outcome.source === 'ai' ? 'AI-assisted' : 'rules only'})`,
          target: `${assessment.id} · ${patient.name}`,
          severity: outcome.urgency === 'emergency' ? 'critical' : outcome.urgency === 'urgent' ? 'abnormal' : 'normal',
        })
        if (outcome.urgency === 'emergency' || outcome.urgency === 'urgent') {
          await notifyRoles(tx, ['doctor'], {
            title: outcome.urgency === 'emergency' ? 'Emergency symptom check' : 'Urgent symptom check',
            body: `${patient.name}: ${answers.chiefComplaint}${outcome.redFlags.length ? ` — ${outcome.redFlags[0]}` : ''}`,
            severity: outcome.urgency === 'emergency' ? 'critical' : 'abnormal',
          })
        }
        return assessment
      })
      return reply.code(201).send(out.triageAssessment(row, isStaff(actor)))
    },
  )

  app.post('/triage-assessments/:id/review', async (request) => {
    requireRole(request.actor, ['doctor'])
    const { id } = parse(idParams, request.params)
    const existing = await db.triageAssessment.findUnique({ where: { id }, include: { patient: true } })
    if (!existing) throw notFound('Symptom check')
    if (existing.reviewedById) throw conflict('This symptom check has already been reviewed.')
    const row = await mutate(['triageAssessments'], async (tx) => {
      const assessment = await tx.triageAssessment.update({
        where: { id },
        data: { reviewedById: request.actor.id, reviewedAt: now() },
        include: out.triageInclude,
      })
      await audit(tx, request.actor, { action: 'Reviewed symptom check', target: `${id} · ${existing.patient.name}` })
      return assessment
    })
    return out.triageAssessment(row, true)
  })
}
