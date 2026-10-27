import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { DISCHARGE_STATUSES, DISCHARGE_TRANSITIONS, type DischargeStatus } from '../domain.js'
import { patientScope, requireRole } from '../lib/access.js'
import { audit, notifyPatient, notifyRoles } from '../lib/activity.js'
import { parseDateKey } from '../lib/clock.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { dateKeySchema, idParams, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

/** Who may move a summary into each status. */
const SIGN_OFF_ROLE: Record<DischargeStatus, 'staff' | 'doctor' | null> = {
  draft: null,
  'staff-verified': 'staff',
  'doctor-approved': 'doctor',
}

export default async function dischargeRoutes(app: FastifyInstance) {
  app.get('/discharge-summaries', async (request) => {
    const rows = await db.dischargeSummary.findMany({
      where: patientScope(request.actor),
      include: out.dischargeInclude,
      orderBy: { dischargeDate: 'asc' },
    })
    return rows.map(out.dischargeSummary)
  })

  app.post('/discharge-summaries', async (request, reply) => {
    requireRole(request.actor, ['doctor', 'staff'])
    const input = parse(
      z.object({
        patientId: z.string().min(1).max(64),
        admissionDate: dateKeySchema,
        dischargeDate: dateKeySchema,
        diagnosis: text(500),
      }),
      request.body,
    )
    if (input.dischargeDate < input.admissionDate) {
      throw badRequest('Discharge cannot be before admission.')
    }
    const patient = await db.patient.findUnique({ where: { id: input.patientId } })
    if (!patient) throw notFound('Patient')

    const row = await mutate(['dischargeSummaries'], async (tx) => {
      const summary = await tx.dischargeSummary.create({
        data: {
          id: await nextId(tx, 'D'),
          patientId: patient.id,
          admissionDate: parseDateKey(input.admissionDate),
          dischargeDate: parseDateKey(input.dischargeDate),
          diagnosis: input.diagnosis,
          status: 'draft',
          completedById: request.actor.id,
        },
        include: out.dischargeInclude,
      })
      await audit(tx, request.actor, { action: 'Drafted discharge summary', target: `${summary.id} · ${patient.name}` })
      return summary
    })
    return reply.code(201).send(out.dischargeSummary(row))
  })

  app.patch('/discharge-summaries/:id', async (request) => {
    const actor = request.actor
    requireRole(actor, ['doctor', 'staff'])
    const { id } = parse(idParams, request.params)
    const input = parse(
      z
        .object({
          status: z.enum(DISCHARGE_STATUSES).optional(),
          diagnosis: text(500).optional(),
          dischargeDate: dateKeySchema.optional(),
        })
        .refine((value) => Object.values(value).some((field) => field !== undefined), 'Nothing to update'),
      request.body,
    )
    const existing = await db.dischargeSummary.findUnique({ where: { id }, include: { patient: true } })
    if (!existing) throw notFound('Discharge summary')
    if (existing.status === 'doctor-approved') throw conflict('An approved discharge summary is locked.')

    const from = existing.status as DischargeStatus
    if (input.status && input.status !== from) {
      if (!DISCHARGE_TRANSITIONS[from].includes(input.status)) {
        throw conflict(`A ${from} summary cannot move to ${input.status}.`)
      }
      if (SIGN_OFF_ROLE[input.status] !== actor.role) {
        throw forbidden(
          input.status === 'doctor-approved'
            ? 'Only a doctor can approve a discharge.'
            : 'Ward staff verify discharge summaries.',
        )
      }
    }

    const row = await mutate(['dischargeSummaries'], async (tx) => {
      const summary = await tx.dischargeSummary.update({
        where: { id },
        data: {
          status: input.status,
          diagnosis: input.diagnosis,
          dischargeDate: input.dischargeDate ? parseDateKey(input.dischargeDate) : undefined,
          approvedById: input.status === 'doctor-approved' ? actor.id : undefined,
        },
        include: out.dischargeInclude,
      })
      const target = `${id} · ${existing.patient.name}`
      if (input.status === 'staff-verified') {
        await audit(tx, actor, { action: 'Verified discharge summary', target })
        await notifyRoles(tx, ['doctor'], {
          title: 'Discharge ready for sign-off',
          body: `${existing.patient.name}'s summary was verified by ${actor.name}.`,
        })
      } else if (input.status === 'doctor-approved') {
        await audit(tx, actor, { action: 'Approved discharge summary', target })
        await notifyRoles(tx, ['receptionist'], {
          title: 'Discharge approved',
          body: `${existing.patient.name} can be discharged. Settle billing before departure.`,
        })
        await notifyPatient(tx, existing.patientId, {
          title: 'Discharge approved',
          body: `${actor.name} approved your discharge summary.`,
        })
      } else {
        await audit(tx, actor, { action: 'Edited discharge summary', target })
      }
      return summary
    })
    return out.dischargeSummary(row)
  })
}
