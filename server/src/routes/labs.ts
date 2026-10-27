import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { LAB_STATUSES, LAB_TRANSITIONS, type LabStatus } from '../domain.js'
import { assertCanAccessPatient, patientScope, requireRole } from '../lib/access.js'
import { audit, notifyPatient, notifyRoles } from '../lib/activity.js'
import { now } from '../lib/clock.js'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { idParams, money, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const bookSchema = z
  .object({
    patientId: z.string().min(1).max(64).optional(),
    catalogueItemId: z.string().min(1).max(64).optional(),
    testName: text(160).optional(),
    category: text(80).optional(),
    price: money.optional(),
  })
  .refine((value) => value.catalogueItemId || (value.testName && value.category && value.price !== undefined), {
    message: 'Choose a test from the catalogue or describe a custom test with its price',
  })

const catalogueSchema = z.object({
  name: text(160),
  category: text(80),
  price: money,
  turnaround: text(60),
  active: z.boolean().default(true),
})

export default async function labRoutes(app: FastifyInstance) {
  app.get('/lab-tests', async (request) => {
    const rows = await db.labTest.findMany({
      where: patientScope(request.actor),
      orderBy: { orderedAt: 'desc' },
    })
    return rows.map(out.labTest)
  })

  app.post('/lab-tests', async (request, reply) => {
    const actor = request.actor
    requireRole(actor, ['patient', 'doctor', 'lab', 'receptionist'])
    const input = parse(bookSchema, request.body)
    const patientId = actor.role === 'patient' ? actor.patientId : input.patientId
    if (!patientId) throw badRequest('Choose the patient this test is for.')
    assertCanAccessPatient(actor, patientId)
    if (actor.role === 'patient' && !input.catalogueItemId) {
      throw badRequest('Choose a test from the catalogue.')
    }

    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient) throw notFound('Patient')

    let test = { testName: input.testName!, category: input.category!, price: input.price! }
    if (input.catalogueItemId) {
      const item = await db.labCatalogueItem.findFirst({
        where: { id: input.catalogueItemId, active: true },
      })
      if (!item) throw badRequest('That test is not currently bookable.')
      test = { testName: item.name, category: item.category, price: Number(item.price) }
    }

    const row = await mutate(['labTests'], async (tx) => {
      const lab = await tx.labTest.create({
        data: {
          id: await nextId(tx, 'L'),
          patientId,
          ...test,
          status: 'booked',
          orderedAt: now(),
        },
      })
      await audit(tx, actor, { action: 'Booked laboratory test', target: `${lab.id} · ${lab.testName} · ${patient.name}` })
      await notifyRoles(tx, ['lab'], {
        title: 'New test booked',
        body: `${lab.testName} for ${patient.name}.`,
      })
      if (actor.role !== 'patient') {
        await notifyPatient(tx, patientId, {
          title: 'Lab test booked',
          body: `${lab.testName} has been booked for you.`,
        })
      }
      return lab
    })
    return reply.code(201).send(out.labTest(row))
  })

  // A document the patient (or the care team on their behalf) brings from elsewhere.
  app.post('/lab-tests/uploads', async (request, reply) => {
    const actor = request.actor
    requireRole(actor, ['patient', 'doctor', 'staff', 'receptionist'])
    const input = parse(
      z.object({
        patientId: z.string().min(1).max(64).optional(),
        fileName: text(255),
        note: z.string().trim().max(500).optional(),
      }),
      request.body,
    )
    const patientId = actor.role === 'patient' ? actor.patientId : input.patientId
    if (!patientId) throw badRequest('Choose the patient this report belongs to.')
    assertCanAccessPatient(actor, patientId)
    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient) throw notFound('Patient')

    const row = await mutate(['labTests'], async (tx) => {
      const lab = await tx.labTest.create({
        data: {
          id: await nextId(tx, 'L'),
          patientId,
          testName: input.fileName,
          category: 'External document',
          price: 0,
          status: 'completed',
          result: input.note || 'Uploaded for care-team review',
          orderedAt: now(),
          reportUploaded: true,
          isNew: true,
          releasedAt: now(),
        },
      })
      await audit(tx, actor, { action: 'Uploaded external report', target: `${lab.id} · ${patient.name}` })
      await notifyRoles(tx, ['doctor'], {
        title: 'External report uploaded',
        body: `${patient.name} shared “${input.fileName}” for review.`,
      })
      return lab
    })
    return reply.code(201).send(out.labTest(row))
  })

  app.patch('/lab-tests/:id', async (request) => {
    requireRole(request.actor, ['lab'])
    const { id } = parse(idParams, request.params)
    const { status } = parse(z.object({ status: z.enum(LAB_STATUSES) }), request.body)
    const existing = await db.labTest.findUnique({ where: { id }, include: { patient: true } })
    if (!existing) throw notFound('Lab test')
    const from = existing.status as LabStatus
    if (!LAB_TRANSITIONS[from].includes(status)) {
      throw conflict(`A test that is ${from} cannot move to ${status}.`)
    }
    const row = await mutate(['labTests'], async (tx) => {
      const lab = await tx.labTest.update({ where: { id }, data: { status } })
      await audit(tx, request.actor, {
        action: `Marked test ${status}`,
        target: `${id} · ${lab.testName} · ${existing.patient.name}`,
      })
      return lab
    })
    return out.labTest(row)
  })

  app.post('/lab-tests/:id/release', async (request) => {
    requireRole(request.actor, ['lab'])
    const { id } = parse(idParams, request.params)
    const { result } = parse(z.object({ result: text(2000) }), request.body)
    const existing = await db.labTest.findUnique({ where: { id }, include: { patient: true } })
    if (!existing) throw notFound('Lab test')
    if (existing.reportUploaded) throw conflict('This report has already been released.')

    const row = await mutate(['labTests'], async (tx) => {
      const lab = await tx.labTest.update({
        where: { id },
        data: { status: 'completed', result, reportUploaded: true, isNew: true, releasedAt: now() },
      })
      const target = `${id} · ${lab.testName} · ${existing.patient.name}`
      await audit(tx, request.actor, { action: 'Released laboratory report', target })
      await notifyPatient(tx, existing.patientId, {
        title: 'Lab result ready',
        body: `Your ${lab.testName} report has been released by the laboratory.`,
        severity: 'abnormal',
      })
      await notifyRoles(tx, ['doctor'], {
        title: 'New report to review',
        body: `${lab.testName} for ${existing.patient.name}: ${result}`,
      })
      return lab
    })
    return out.labTest(row)
  })

  app.post('/lab-tests/:id/acknowledge', async (request) => {
    requireRole(request.actor, ['doctor'])
    const { id } = parse(idParams, request.params)
    const existing = await db.labTest.findUnique({ where: { id }, include: { patient: true } })
    if (!existing) throw notFound('Lab test')
    if (!existing.reportUploaded) throw conflict('There is no released report to review yet.')
    if (!existing.isNew) return out.labTest(existing)

    const row = await mutate(['labTests'], async (tx) => {
      const lab = await tx.labTest.update({ where: { id }, data: { isNew: false } })
      await audit(tx, request.actor, {
        action: 'Reviewed laboratory report',
        target: `${id} · ${lab.testName} · ${existing.patient.name}`,
      })
      return lab
    })
    return out.labTest(row)
  })

  app.get('/lab-catalogue', async () => {
    const rows = await db.labCatalogueItem.findMany({ orderBy: { name: 'asc' } })
    return rows.map(out.labCatalogueItem)
  })

  app.post('/lab-catalogue', async (request, reply) => {
    requireRole(request.actor, ['lab', 'admin'])
    const input = parse(catalogueSchema, request.body)
    const row = await mutate(['labCatalogue'], async (tx) => {
      const item = await tx.labCatalogueItem.create({
        data: { id: await nextId(tx, 'CAT'), ...input },
      })
      await audit(tx, request.actor, { action: 'Added test to catalogue', target: item.name })
      return item
    })
    return reply.code(201).send(out.labCatalogueItem(row))
  })

  app.patch('/lab-catalogue/:id', async (request) => {
    requireRole(request.actor, ['lab', 'admin'])
    const { id } = parse(idParams, request.params)
    const input = parse(catalogueSchema.partial(), request.body)
    const row = await mutate(['labCatalogue'], async (tx) => {
      const item = await tx.labCatalogueItem.update({ where: { id }, data: input })
      await audit(tx, request.actor, { action: 'Updated catalogue test', target: item.name })
      return item
    })
    return out.labCatalogueItem(row)
  })
}
