import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { assertCanAccessPatient, isStaff, requireRole } from '../lib/access.js'
import { audit } from '../lib/activity.js'
import { badRequest, notFound } from '../lib/errors.js'
import { idParams, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const MAX_TIPS = 5

const tipSchema = z.object({
  category: text(60),
  title: text(120),
  body: text(600),
  conditions: z
    .array(z.string().trim().toLowerCase().min(2).max(60))
    .max(20)
    .default([])
    .transform((terms) => [...new Set(terms)]),
  active: z.boolean().default(true),
})

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The first of the patient's recorded conditions that the tip's terms match as whole words. */
function matchingCondition(terms: string[], conditions: string[]): string | null {
  for (const condition of conditions) {
    if (terms.some((term) => new RegExp(`\\b${escape(term)}\\b`, 'i').test(condition))) return condition
  }
  return null
}

export default async function healthTipRoutes(app: FastifyInstance) {
  // Tips for one patient: those matching their recorded conditions first, then general advice.
  app.get('/health-tips', async (request) => {
    const actor = request.actor
    const query = parse(z.object({ patientId: z.string().max(64).optional() }), request.query)
    const patientId = isStaff(actor) ? query.patientId : actor.patientId
    if (!patientId) throw badRequest('Choose a patient to see tips for.')
    assertCanAccessPatient(actor, patientId)
    const patient = await db.patient.findUnique({ where: { id: patientId }, select: { conditions: true } })
    if (!patient) throw notFound('Patient')

    const tips = await db.healthTip.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }] })

    // Group condition-specific tips by the condition they match, then take them in
    // turn so a patient with several conditions sees advice for each of them.
    const byCondition = new Map<string, ReturnType<typeof out.healthTip>[]>()
    for (const tip of tips) {
      const condition = tip.conditions.length ? matchingCondition(tip.conditions, patient.conditions) : null
      if (condition) byCondition.set(condition, [...(byCondition.get(condition) ?? []), out.healthTip(tip, condition)])
    }
    const matched: ReturnType<typeof out.healthTip>[] = []
    for (let round = 0; [...byCondition.values()].some((group) => group.length > round); round++) {
      for (const group of byCondition.values()) if (group[round]) matched.push(group[round])
    }
    const general = tips.filter((tip) => tip.conditions.length === 0).map((tip) => out.healthTip(tip, null))
    return [...matched, ...general].slice(0, MAX_TIPS).map((tip) => ({ ...tip, patientId }))
  })

  app.get('/health-tips/library', async (request) => {
    requireRole(request.actor, ['doctor', 'admin'])
    const tips = await db.healthTip.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }] })
    return tips.map((tip) => out.healthTip(tip, null))
  })

  app.post('/health-tips', async (request, reply) => {
    requireRole(request.actor, ['doctor', 'admin'])
    const input = parse(tipSchema, request.body)
    const row = await mutate(['healthTips'], async (tx) => {
      const last = await tx.healthTip.aggregate({ _max: { position: true } })
      const tip = await tx.healthTip.create({
        data: { id: await nextId(tx, 'TIP'), ...input, position: (last._max.position ?? -1) + 1 },
      })
      await audit(tx, request.actor, { action: 'Added health tip', target: tip.title })
      return tip
    })
    return reply.code(201).send(out.healthTip(row, null))
  })

  app.patch('/health-tips/:id', async (request) => {
    requireRole(request.actor, ['doctor', 'admin'])
    const { id } = parse(idParams, request.params)
    const input = parse(tipSchema.partial(), request.body)
    if (!(await db.healthTip.findUnique({ where: { id } }))) throw notFound('Health tip')
    const row = await mutate(['healthTips'], async (tx) => {
      const tip = await tx.healthTip.update({ where: { id }, data: input })
      await audit(tx, request.actor, { action: 'Updated health tip', target: tip.title })
      return tip
    })
    return out.healthTip(row, null)
  })
}
