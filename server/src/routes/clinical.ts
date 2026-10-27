import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import {
  assertCanAccessPatient,
  patientScope,
  requireRole,
} from '../lib/access.js'
import { audit, notifyPatient } from '../lib/activity.js'
import { now, parseDateKey } from '../lib/clock.js'
import { conflict, notFound } from '../lib/errors.js'
import { dateKeySchema, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const patientParams = z.object({ patientId: z.string().min(1).max(64) })
const patientQuery = z.object({ patientId: z.string().min(1).max(64).optional() })

async function patientLabel(patientId: string) {
  const patient = await db.patient.findUnique({ where: { id: patientId }, select: { name: true } })
  if (!patient) throw notFound('Patient')
  return `${patientId} · ${patient.name}`
}

export default async function clinicalRoutes(app: FastifyInstance) {
  // Problem summaries ------------------------------------------------------------

  app.get('/problem-summaries', async (request) => {
    const rows = await db.problemSummary.findMany({
      where: patientScope(request.actor),
      include: out.problemSummaryInclude,
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(out.problemSummary)
  })

  app.put('/problem-summaries/:patientId', async (request) => {
    requireRole(request.actor, ['doctor'])
    const { patientId } = parse(patientParams, request.params)
    const input = parse(
      z.object({ headline: text(300), issues: z.array(text(300)).min(1).max(20) }),
      request.body,
    )
    const target = await patientLabel(patientId)
    const row = await mutate(['problemSummaries'], async (tx) => {
      const data = {
        headline: input.headline,
        issues: input.issues,
        aiGenerated: false,
        approvedById: request.actor.id,
        updatedAt: now(),
      }
      const summary = await tx.problemSummary.upsert({
        where: { patientId },
        create: { patientId, ...data },
        update: data,
        include: out.problemSummaryInclude,
      })
      await audit(tx, request.actor, { action: 'Edited problem summary', target })
      return summary
    })
    return out.problemSummary(row)
  })

  app.post('/problem-summaries/:patientId/approve', async (request) => {
    requireRole(request.actor, ['doctor'])
    const { patientId } = parse(patientParams, request.params)
    const existing = await db.problemSummary.findUnique({ where: { patientId } })
    if (!existing) throw notFound('Problem summary')
    if (existing.approvedById) throw conflict('This summary has already been approved.')
    const target = await patientLabel(patientId)
    const row = await mutate(['problemSummaries'], async (tx) => {
      const summary = await tx.problemSummary.update({
        where: { patientId },
        data: { approvedById: request.actor.id, updatedAt: now() },
        include: out.problemSummaryInclude,
      })
      await audit(tx, request.actor, {
        action: existing.aiGenerated ? 'Approved AI problem summary' : 'Approved problem summary',
        target,
      })
      return summary
    })
    return out.problemSummary(row)
  })

  // Clinical notes -------------------------------------------------------------------

  app.get('/clinical-notes', async (request) => {
    requireRole(request.actor, ['doctor', 'staff', 'admin'])
    const { patientId } = parse(patientQuery, request.query)
    const rows = await db.clinicalNote.findMany({
      where: { patientId },
      include: out.noteInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return rows.map(out.clinicalNote)
  })

  app.post('/clinical-notes', async (request, reply) => {
    requireRole(request.actor, ['doctor', 'staff'])
    const input = parse(z.object({ patientId: z.string().min(1), body: text(10_000) }), request.body)
    const target = await patientLabel(input.patientId)
    const row = await mutate(['clinicalNotes'], async (tx) => {
      const note = await tx.clinicalNote.create({
        data: {
          id: await nextId(tx, 'NOTE'),
          patientId: input.patientId,
          authorId: request.actor.id,
          body: input.body,
          createdAt: now(),
        },
        include: out.noteInclude,
      })
      await audit(tx, request.actor, { action: 'Added clinical note', target })
      return note
    })
    return reply.code(201).send(out.clinicalNote(row))
  })

  // Diet plans -----------------------------------------------------------------------

  app.get('/diet-plans', async (request) => {
    const rows = await db.dietPlan.findMany({ where: patientScope(request.actor) })
    return rows.map(out.dietPlan)
  })

  app.put('/diet-plans/:patientId', async (request) => {
    requireRole(request.actor, ['doctor'])
    const { patientId } = parse(patientParams, request.params)
    const input = parse(
      z.object({
        goal: text(300),
        dailyCalories: z.coerce.number().int().min(500).max(6000),
        restrictions: z.array(text(200)).max(20).default([]),
        entries: z
          .array(
            z.object({
              meal: text(40),
              items: text(300),
              calories: z.coerce.number().int().min(0).max(4000),
            }),
          )
          .max(10),
      }),
      request.body,
    )
    const target = await patientLabel(patientId)
    const row = await mutate(['dietPlans'], async (tx) => {
      const plan = await tx.dietPlan.upsert({
        where: { patientId },
        create: { patientId, ...input },
        update: input,
      })
      await audit(tx, request.actor, { action: 'Updated diet plan', target })
      await notifyPatient(tx, patientId, {
        title: 'Diet plan updated',
        body: `${request.actor.name} updated your diet plan: ${input.goal}`,
      })
      return plan
    })
    return out.dietPlan(row)
  })

  // Glucose readings -------------------------------------------------------------------

  app.get('/glucose-readings', async (request) => {
    const { patientId } = parse(patientQuery, request.query)
    const scope = patientScope(request.actor)
    const rows = await db.glucoseReading.findMany({
      where: { patientId: scope.patientId ?? patientId },
      orderBy: { date: 'asc' },
    })
    return rows.map(out.glucoseReading)
  })

  app.post('/glucose-readings', async (request, reply) => {
    const input = parse(
      z.object({
        patientId: z.string().min(1),
        date: dateKeySchema,
        value: z.coerce.number().int().min(20).max(800),
      }),
      request.body,
    )
    requireRole(request.actor, ['doctor', 'staff', 'lab', 'patient'])
    assertCanAccessPatient(request.actor, input.patientId)
    const target = await patientLabel(input.patientId)
    const row = await mutate(['glucoseReadings'], async (tx) => {
      const reading = await tx.glucoseReading.create({
        data: { patientId: input.patientId, date: parseDateKey(input.date), value: input.value },
      })
      await audit(tx, request.actor, { action: `Logged glucose ${input.value} mg/dL`, target })
      return reading
    })
    return reply.code(201).send(out.glucoseReading(row))
  })
}
