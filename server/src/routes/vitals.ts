import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { classifyVitals } from '../domain.js'
import { patientScope, requireRole } from '../lib/access.js'
import { audit, notifyPatient, notifyRoles } from '../lib/activity.js'
import { now } from '../lib/clock.js'
import { notFound } from '../lib/errors.js'
import { mutate, parse } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const createSchema = z.object({
  patientId: z.string().min(1).max(64),
  bloodPressure: z
    .string()
    .trim()
    .regex(/^\d{2,3}\s*\/\s*\d{2,3}$/, 'Enter blood pressure as systolic/diastolic, e.g. 120/80'),
  heartRate: z.coerce.number().int().min(20).max(250),
  temperatureF: z.coerce.number().min(85).max(110),
  spo2: z.coerce.number().int().min(50).max(100),
  weightKg: z.coerce.number().min(0.5).max(400),
})

export default async function vitalsRoutes(app: FastifyInstance) {
  app.get('/vitals', async (request) => {
    const { patientId } = parse(z.object({ patientId: z.string().max(64).optional() }), request.query)
    const scope = patientScope(request.actor)
    const rows = await db.vitals.findMany({
      where: { patientId: scope.patientId ?? patientId },
      orderBy: { recordedAt: 'desc' },
    })
    return rows.map(out.vitals)
  })

  app.post('/vitals', async (request, reply) => {
    requireRole(request.actor, ['staff', 'doctor'])
    const input = parse(createSchema, request.body)
    const [systolic, diastolic] = input.bloodPressure.split('/').map((part) => Number(part.trim()))

    const patient = await db.patient.findUnique({ where: { id: input.patientId } })
    if (!patient) throw notFound('Patient')

    const reading = {
      systolic,
      diastolic,
      heartRate: input.heartRate,
      temperatureF: input.temperatureF,
      spo2: input.spo2,
    }
    const severity = classifyVitals(reading)

    const row = await mutate(['vitals'], async (tx) => {
      const entry = await tx.vitals.create({
        data: {
          id: await nextId(tx, 'V'),
          patientId: patient.id,
          recordedAt: now(),
          recordedBy: request.actor.name,
          recordedById: request.actor.id,
          ...reading,
          weightKg: input.weightKg,
          severity,
        },
      })
      await audit(tx, request.actor, {
        action: severity === 'critical' ? 'Recorded critical vitals' : 'Recorded vitals',
        target: `${patient.id} · ${patient.name}`,
        severity,
      })
      await notifyPatient(tx, patient.id, {
        title: 'New vitals on your record',
        body: `BP ${systolic}/${diastolic}, pulse ${input.heartRate}, SpO₂ ${input.spo2}%.`,
        severity,
      })
      if (severity === 'critical') {
        await notifyRoles(tx, ['doctor'], {
          title: 'Critical vitals',
          body: `${patient.name}: BP ${systolic}/${diastolic}, pulse ${input.heartRate}, SpO₂ ${input.spo2}%.`,
          severity: 'critical',
        })
      }
      return entry
    })
    return reply.code(201).send(out.vitals(row))
  })
}
