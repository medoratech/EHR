import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { requireRole } from '../lib/access.js'
import { audit } from '../lib/activity.js'
import { clinic, loadClinic } from '../lib/clinic.js'
import { conflict, notFound } from '../lib/errors.js'
import { mutate, parse, text, timeSchema } from '../lib/http.js'

const isTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

const isLocale = (value: string) => {
  try {
    return Intl.getCanonicalLocales(value).length === 1
  } catch {
    return false
  }
}

const isCurrency = (value: string) => Intl.supportedValuesOf('currency').includes(value)

const distinct = <T>(items: T[]) => new Set(items).size === items.length

const settingsSchema = z
  .object({
    name: text(120),
    currency: z.string().trim().toUpperCase().refine(isCurrency, 'Use an ISO 4217 currency code, e.g. GHS'),
    locale: z.string().trim().refine(isLocale, 'Use a BCP 47 locale, e.g. en-GH'),
    timeZone: z.string().trim().refine(isTimeZone, 'Use an IANA time zone, e.g. Africa/Accra'),
    appointmentSlots: z
      .array(timeSchema)
      .min(1, 'Offer at least one appointment time')
      .max(48)
      .refine(distinct, 'Appointment times must be unique')
      .transform((slots) => [...slots].sort()),
    paymentMethods: z
      .array(text(40))
      .min(1, 'Accept at least one payment method')
      .max(12)
      .refine(distinct, 'Payment methods must be unique'),
    defaultClinician: text(120),
    emergencyNumber: z.string().trim().regex(/^[0-9+ ()-]{2,20}$/, 'Use digits, spaces, + or -'),
  })
  .partial()

const departmentParams = z.object({ name: z.string().min(1).max(80) })

/** Public: the SPA needs currency, locale and time zone before anyone signs in. */
export async function clinicPublicRoutes(app: FastifyInstance) {
  app.get('/clinic', async () => {
    const departments = await db.department.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] })
    return {
      ...clinic(),
      departments: departments.map(({ name, active }) => ({ name, active })),
    }
  })
}

export default async function clinicAdminRoutes(app: FastifyInstance) {
  app.put('/clinic', async (request) => {
    requireRole(request.actor, ['admin'])
    const input = parse(settingsSchema, request.body)
    const before = clinic()
    await mutate(['clinic'], async (tx) => {
      await tx.clinic.update({ where: { id: 1 }, data: input })
      const changed = (Object.keys(input) as (keyof typeof input)[]).filter(
        (key) => JSON.stringify(input[key]) !== JSON.stringify(before[key]),
      )
      await audit(tx, request.actor, {
        action: `Updated clinic settings (${changed.join(', ') || 'no change'})`,
        target: before.name,
      })
    })
    return loadClinic(db)
  })

  app.post('/departments', async (request, reply) => {
    requireRole(request.actor, ['admin'])
    const { name } = parse(z.object({ name: text(80) }), request.body)
    if (await db.department.findUnique({ where: { name } })) throw conflict(`${name} already exists.`)
    const department = await mutate(['clinic'], async (tx) => {
      const last = await tx.department.aggregate({ _max: { position: true } })
      const row = await tx.department.create({ data: { name, position: (last._max.position ?? -1) + 1 } })
      await audit(tx, request.actor, { action: 'Added department', target: name })
      return row
    })
    return reply.code(201).send({ name: department.name, active: department.active })
  })

  app.patch('/departments/:name', async (request) => {
    requireRole(request.actor, ['admin'])
    const { name } = parse(departmentParams, request.params)
    const input = parse(
      z
        .object({ active: z.boolean().optional(), rename: text(80).optional() })
        .refine((value) => value.active !== undefined || value.rename, 'Nothing to update'),
      request.body,
    )
    const existing = await db.department.findUnique({ where: { name } })
    if (!existing) throw notFound('Department')
    if (input.rename && input.rename !== name && (await db.department.findUnique({ where: { name: input.rename } }))) {
      throw conflict(`${input.rename} already exists.`)
    }
    if (input.active === false) {
      const stillActive = await db.department.count({ where: { active: true, NOT: { name } } })
      if (stillActive === 0) throw conflict('Keep at least one department open.')
    }
    // Renames cascade to patients and appointments through the foreign keys.
    const row = await mutate(['clinic', 'patients', 'appointments'], async (tx) => {
      const department = await tx.department.update({
        where: { name },
        data: { active: input.active, name: input.rename },
      })
      const changes = [
        input.rename && input.rename !== name ? `renamed to ${input.rename}` : null,
        input.active !== undefined && input.active !== existing.active ? (input.active ? 'reopened' : 'closed') : null,
      ].filter(Boolean)
      await audit(tx, request.actor, {
        action: `Updated department (${changes.join(', ') || 'no change'})`,
        target: name,
      })
      return department
    })
    return { name: row.name, active: row.active }
  })
}
