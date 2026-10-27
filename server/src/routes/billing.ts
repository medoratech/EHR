import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { INVOICE_STATUSES, INVOICE_TRANSITIONS, type InvoiceStatus } from '../domain.js'
import { assertCanAccessPatient, isStaff, patientScope, requireRole } from '../lib/access.js'
import { audit, notifyPatient, notifyRoles } from '../lib/activity.js'
import { assertPaymentMethod } from '../lib/clinic.js'
import { now } from '../lib/clock.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { idParams, money, mutate, parse } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const BILLING_ROLES = ['receptionist', 'pharmacy', 'admin'] as const

export default async function billingRoutes(app: FastifyInstance) {
  app.get('/invoices', async (request) => {
    const rows = await db.invoice.findMany({
      where: patientScope(request.actor),
      orderBy: { issuedAt: 'desc' },
    })
    return rows.map(out.invoice)
  })

  app.post('/invoices', async (request, reply) => {
    requireRole(request.actor, BILLING_ROLES)
    const input = parse(
      z.object({
        patientId: z.string().min(1).max(64),
        amount: money.refine((value) => value > 0, 'Amount must be greater than zero'),
        description: z.string().trim().max(300).optional(),
        status: z.enum(INVOICE_STATUSES).default('unpaid'),
        method: z.string().trim().max(60).optional(),
      }),
      request.body,
    )
    if (input.status !== 'unpaid' && !input.method) {
      throw badRequest('Record how the payment was made.')
    }
    assertPaymentMethod(input.method)
    const patient = await db.patient.findUnique({ where: { id: input.patientId } })
    if (!patient) throw notFound('Patient')

    const row = await mutate(['invoices'], async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          id: await nextId(tx, 'INV'),
          patientId: patient.id,
          amount: input.amount,
          status: input.status,
          description: input.description ?? null,
          issuedAt: now(),
          method: input.method ?? null,
          paidAt: input.status === 'paid' ? now() : null,
        },
      })
      await audit(tx, request.actor, { action: 'Generated invoice', target: `${invoice.id} · ${patient.name}` })
      await notifyPatient(tx, patient.id, {
        title: 'New invoice',
        body: `${invoice.id}${input.description ? ` · ${input.description}` : ''} has been issued.`,
      })
      return invoice
    })
    return reply.code(201).send(out.invoice(row))
  })

  app.patch('/invoices/:id', async (request) => {
    const actor = request.actor
    const { id } = parse(idParams, request.params)
    const input = parse(
      z.object({ status: z.enum(INVOICE_STATUSES), method: z.string().trim().min(1).max(60).optional() }),
      request.body,
    )

    const existing = await db.invoice.findUnique({ where: { id }, include: { patient: true } })
    if (!existing) throw notFound('Invoice')
    assertCanAccessPatient(actor, existing.patientId)
    if (isStaff(actor)) requireRole(actor, BILLING_ROLES)
    else if (input.status !== 'paid') throw forbidden('You can settle an invoice; the clinic records part payments.')

    const from = existing.status as InvoiceStatus
    if (!INVOICE_TRANSITIONS[from].includes(input.status)) {
      throw conflict(`An invoice that is ${from} cannot be marked ${input.status}.`)
    }
    if (!input.method && !existing.method) throw badRequest('Record how the payment was made.')
    assertPaymentMethod(input.method)

    const row = await mutate(['invoices'], async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          status: input.status,
          method: input.method ?? existing.method,
          paidAt: input.status === 'paid' ? now() : null,
        },
      })
      await audit(tx, actor, {
        action: `Recorded ${input.status === 'paid' ? 'payment' : 'part payment'} (${invoice.method})`,
        target: `${id} · ${existing.patient.name}`,
      })
      if (isStaff(actor)) {
        await notifyPatient(tx, existing.patientId, {
          title: 'Payment recorded',
          body: `${id} is now ${input.status}.`,
        })
      } else {
        await notifyRoles(tx, ['receptionist'], {
          title: 'Invoice paid online',
          body: `${existing.patient.name} settled ${id} by ${invoice.method}.`,
        })
      }
      return invoice
    })
    return out.invoice(row)
  })
}
