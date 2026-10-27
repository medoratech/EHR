import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, type Tx } from '../db.js'
import { STAFF_ROLES, USER_STATUSES } from '../domain.js'
import { requireRole, requireStaff } from '../lib/access.js'
import { audit, notifyUsers } from '../lib/activity.js'
import { now } from '../lib/clock.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { idParams, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'
import { hashToken, randomToken } from '../lib/tokens.js'

const SETUP_LINK_TTL_MS = 72 * 3_600_000

/** Issues a one-time password setup link, retiring any earlier unused ones. */
async function issueSetupLink(tx: Tx, userId: string) {
  await tx.setupToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } })
  const token = randomToken()
  await tx.setupToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SETUP_LINK_TTL_MS) },
  })
  return { setupPath: `/set-password?token=${token}`, expiresInHours: SETUP_LINK_TTL_MS / 3_600_000 }
}

export default async function adminRoutes(app: FastifyInstance) {
  // Users ----------------------------------------------------------------------------

  app.get('/users', async (request) => {
    requireStaff(request.actor)
    const rows = await db.user.findMany({
      where: { role: { not: 'patient' } },
      orderBy: { id: 'asc' },
    })
    return rows.map(out.user)
  })

  app.post('/users', async (request, reply) => {
    requireRole(request.actor, ['admin'])
    const input = parse(
      z.object({
        name: text(120),
        email: z.string().trim().toLowerCase().email().max(254),
        role: z.enum(STAFF_ROLES),
      }),
      request.body,
    )
    if (await db.user.findUnique({ where: { email: input.email } })) {
      throw conflict('Someone with this email is already on Medora.')
    }
    const result = await mutate(['users'], async (tx) => {
      const user = await tx.user.create({
        data: {
          id: await nextId(tx, 'U'),
          name: input.name,
          email: input.email,
          role: input.role,
          status: 'invited',
          lastActiveAt: now(),
        },
      })
      await audit(tx, request.actor, { action: `Invited ${input.role}`, target: input.email })
      return { user: out.user(user), ...(await issueSetupLink(tx, user.id)) }
    })
    return reply.code(201).send(result)
  })

  app.patch('/users/:id', async (request) => {
    requireRole(request.actor, ['admin'])
    const { id } = parse(idParams, request.params)
    const input = parse(
      z
        .object({ status: z.enum(USER_STATUSES).optional(), role: z.enum(STAFF_ROLES).optional() })
        .refine((value) => value.status || value.role, 'Nothing to update'),
      request.body,
    )
    if (id === request.actor.id) throw forbidden('You cannot change your own access.')
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) throw notFound('User')
    if (existing.role === 'patient') throw badRequest('Patient accounts are managed from the patient record.')

    const row = await mutate(['users'], async (tx) => {
      const user = await tx.user.update({ where: { id }, data: input })
      if (input.status === 'suspended' || (input.role && input.role !== existing.role)) {
        // End live sessions so the change applies immediately.
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
      }
      const changes = [
        input.status && input.status !== existing.status ? `status ${existing.status} → ${input.status}` : null,
        input.role && input.role !== existing.role ? `role ${existing.role} → ${input.role}` : null,
      ].filter(Boolean)
      await audit(tx, request.actor, {
        action: `Updated user access (${changes.join(', ') || 'no change'})`,
        target: user.email,
        severity: input.status === 'suspended' ? 'abnormal' : 'normal',
      })
      if (input.status === 'active' && existing.status !== 'active') {
        await notifyUsers(tx, [id], { title: 'Access approved', body: `${request.actor.name} activated your Medora account.` })
      }
      return user
    })
    return out.user(row)
  })

  app.post('/users/:id/setup-link', async (request) => {
    requireRole(request.actor, ['admin'])
    const { id } = parse(idParams, request.params)
    const user = await db.user.findUnique({ where: { id } })
    if (!user) throw notFound('User')
    if (user.status === 'suspended') throw conflict('Reactivate this account before sending a setup link.')
    return mutate([], async (tx) => {
      await audit(tx, request.actor, { action: 'Issued password setup link', target: user.email })
      return issueSetupLink(tx, id)
    })
  })

  // Audit ----------------------------------------------------------------------------

  app.get('/audit-events', async (request) => {
    requireRole(request.actor, ['admin'])
    const { limit } = parse(
      z.object({ limit: z.coerce.number().int().min(1).max(1000).default(200) }),
      request.query,
    )
    const rows = await db.auditEvent.findMany({ orderBy: [{ at: 'desc' }, { id: 'desc' }], take: limit })
    return rows.map(out.auditEvent)
  })

  // System settings -------------------------------------------------------------------

  app.get('/system/settings', async (request) => {
    requireStaff(request.actor)
    const rows = await db.systemSetting.findMany({ orderBy: { position: 'asc' } })
    return rows.map(out.systemSetting)
  })

  app.put('/system/settings/:key', async (request) => {
    requireRole(request.actor, ['admin'])
    const { key } = parse(z.object({ key: z.string().min(1).max(64) }), request.params)
    const { value } = parse(z.object({ value: text(200) }), request.body)
    const row = await mutate(['systemSettings'], async (tx) => {
      const setting = await tx.systemSetting.update({ where: { key }, data: { value } })
      await audit(tx, request.actor, { action: `Changed setting to “${value}”`, target: setting.label })
      return setting
    })
    return out.systemSetting(row)
  })
}
