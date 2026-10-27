import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { assertCanAccessPatient, patientScope, requireRole, requireStaff } from '../lib/access.js'
import { audit, notifyPatient, notifyRoles } from '../lib/activity.js'
import { now, parseDateKey } from '../lib/clock.js'
import { conflict, notFound } from '../lib/errors.js'
import { dateKeySchema, idParams, money, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const medicineParams = z.object({ id: z.string().min(1).max(64), medicineId: z.string().min(1).max(64) })

const prescriptionSchema = z.object({
  patientId: z.string().min(1).max(64),
  notes: z.string().trim().max(2000).default(''),
  refillsTotal: z.coerce.number().int().min(0).max(12).default(0),
  medicines: z
    .array(
      z.object({
        name: text(160),
        dosage: text(60),
        frequency: text(80),
        durationDays: z.coerce.number().int().min(1).max(365),
      }),
    )
    .min(1)
    .max(20),
})

const inventorySchema = z.object({
  name: text(160),
  category: text(80),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  reorderLevel: z.coerce.number().int().min(0).max(1_000_000),
  expiry: dateKeySchema,
  price: money,
})

async function loadMedicine(prescriptionId: string, medicineId: string) {
  const medicine = await db.medicine.findFirst({
    where: { id: medicineId, prescriptionId },
    include: { prescription: { include: { patient: true } } },
  })
  if (!medicine) throw notFound('Medicine')
  return medicine
}

export default async function pharmacyRoutes(app: FastifyInstance) {
  // Prescriptions ------------------------------------------------------------------

  app.get('/prescriptions', async (request) => {
    const rows = await db.prescription.findMany({
      where: patientScope(request.actor),
      include: out.prescriptionInclude,
      orderBy: { issuedAt: 'desc' },
    })
    return rows.map(out.prescription)
  })

  app.post('/prescriptions', async (request, reply) => {
    requireRole(request.actor, ['doctor'])
    const input = parse(prescriptionSchema, request.body)
    const patient = await db.patient.findUnique({ where: { id: input.patientId } })
    if (!patient) throw notFound('Patient')

    const row = await mutate(['prescriptions'], async (tx) => {
      const id = await nextId(tx, 'R')
      const medicines = []
      for (const [position, medicine] of input.medicines.entries()) {
        medicines.push({ id: await nextId(tx, 'M'), position, ...medicine })
      }
      const prescription = await tx.prescription.create({
        data: {
          id,
          patientId: patient.id,
          doctorId: request.actor.id,
          issuedAt: now(),
          refillsLeft: input.refillsTotal,
          refillsTotal: input.refillsTotal,
          notes: input.notes,
          medicines: { create: medicines },
        },
        include: out.prescriptionInclude,
      })
      const names = input.medicines.map((medicine) => medicine.name).join(', ')
      await audit(tx, request.actor, { action: 'Issued prescription', target: `${id} · ${patient.name}` })
      await notifyPatient(tx, patient.id, { title: 'New prescription', body: `${request.actor.name} prescribed ${names}.` })
      await notifyRoles(tx, ['pharmacy'], { title: 'New prescription', body: `${names} for ${patient.name}.` })
      return prescription
    })
    return reply.code(201).send(out.prescription(row))
  })

  app.post('/prescriptions/:id/medicines/:medicineId/order', async (request) => {
    const actor = request.actor
    requireRole(actor, ['patient', 'doctor', 'staff', 'pharmacy'])
    const { id, medicineId } = parse(medicineParams, request.params)
    const medicine = await loadMedicine(id, medicineId)
    const { patient } = medicine.prescription
    assertCanAccessPatient(actor, patient.id)
    if (medicine.ordered) throw conflict(`${medicine.name} has already been ordered.`)

    const row = await mutate(['prescriptions'], async (tx) => {
      await tx.medicine.update({ where: { id: medicineId }, data: { ordered: true, orderedAt: now() } })
      await audit(tx, actor, { action: 'Ordered medicine', target: `${medicine.name} · ${patient.name}` })
      if (actor.role !== 'pharmacy') {
        await notifyRoles(tx, ['pharmacy'], {
          title: 'Medicine order placed',
          body: `${medicine.name} ${medicine.dosage} for ${patient.name}.`,
        })
      }
      await notifyPatient(
        tx,
        patient.id,
        { title: 'Medicine order placed', body: `${medicine.name} is being prepared by the pharmacy.` },
        actor.id,
      )
      return tx.prescription.findUniqueOrThrow({ where: { id }, include: out.prescriptionInclude })
    })
    return out.prescription(row)
  })

  app.post('/prescriptions/:id/medicines/:medicineId/dispense', async (request) => {
    requireRole(request.actor, ['pharmacy'])
    const { id, medicineId } = parse(medicineParams, request.params)
    const medicine = await loadMedicine(id, medicineId)
    const { patient } = medicine.prescription
    if (medicine.dispensedAt) throw conflict(`${medicine.name} has already been dispensed.`)

    const row = await mutate(['prescriptions'], async (tx) => {
      await tx.medicine.update({
        where: { id: medicineId },
        data: { ordered: true, orderedAt: medicine.orderedAt ?? now(), dispensedAt: now() },
      })
      await audit(tx, request.actor, { action: 'Dispensed medicine', target: `${medicine.name} · ${patient.name}` })
      await notifyPatient(tx, patient.id, {
        title: 'Medicine ready',
        body: `${medicine.name} ${medicine.dosage} has been dispensed by the pharmacy.`,
      })
      return tx.prescription.findUniqueOrThrow({ where: { id }, include: out.prescriptionInclude })
    })
    return out.prescription(row)
  })

  app.post('/prescriptions/:id/refill-reminder', async (request) => {
    requireRole(request.actor, ['pharmacy'])
    const { id } = parse(idParams, request.params)
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: { patient: true, medicines: true },
    })
    if (!prescription) throw notFound('Prescription')
    if (prescription.refillsLeft === 0) {
      throw conflict('No refills remain on this prescription; the prescriber needs to renew it.')
    }
    await mutate([], async (tx) => {
      await audit(tx, request.actor, {
        action: 'Sent refill reminder',
        target: `${id} · ${prescription.patient.name}`,
      })
      await notifyPatient(tx, prescription.patientId, {
        title: 'Medicine refill due',
        body: `Time to refill ${prescription.medicines.map((m) => m.name).join(', ')}. ${prescription.refillsLeft} refill(s) remain.`,
        severity: 'abnormal',
      })
    })
    return { sent: true }
  })

  // Inventory -------------------------------------------------------------------------

  app.get('/inventory', async (request) => {
    requireStaff(request.actor)
    const rows = await db.inventoryItem.findMany({ orderBy: { id: 'asc' } })
    return rows.map(out.inventoryItem)
  })

  app.post('/inventory', async (request, reply) => {
    requireRole(request.actor, ['pharmacy'])
    const input = parse(inventorySchema, request.body)
    const row = await mutate(['inventory'], async (tx) => {
      const item = await tx.inventoryItem.create({
        data: { id: await nextId(tx, 'I'), ...input, expiry: parseDateKey(input.expiry) },
      })
      await audit(tx, request.actor, { action: 'Added stock line', target: `${item.id} · ${item.name}` })
      return item
    })
    return reply.code(201).send(out.inventoryItem(row))
  })

  app.patch('/inventory/:id', async (request) => {
    requireRole(request.actor, ['pharmacy', 'admin'])
    const { id } = parse(idParams, request.params)
    const input = parse(inventorySchema.partial(), request.body)
    const existing = await db.inventoryItem.findUnique({ where: { id } })
    if (!existing) throw notFound('Stock line')
    const stock = input.stock ?? existing.stock
    const reorderLevel = input.reorderLevel ?? existing.reorderLevel

    const row = await mutate(['inventory'], async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...input,
          expiry: input.expiry ? parseDateKey(input.expiry) : undefined,
          // A replenished line no longer has an open reorder.
          reorderRequestedAt: stock > reorderLevel ? null : undefined,
        },
      })
      await audit(tx, request.actor, {
        action: input.stock !== undefined ? `Adjusted stock ${existing.stock} → ${stock}` : 'Updated stock line',
        target: `${id} · ${item.name}`,
      })
      return item
    })
    return out.inventoryItem(row)
  })

  app.post('/inventory/:id/reorder', async (request) => {
    requireRole(request.actor, ['pharmacy'])
    const { id } = parse(idParams, request.params)
    const existing = await db.inventoryItem.findUnique({ where: { id } })
    if (!existing) throw notFound('Stock line')
    if (existing.stock > existing.reorderLevel) throw conflict(`${existing.name} is above its reorder level.`)
    if (existing.reorderRequestedAt) throw conflict(`A reorder for ${existing.name} is already open.`)

    const row = await mutate(['inventory'], async (tx) => {
      const item = await tx.inventoryItem.update({ where: { id }, data: { reorderRequestedAt: now() } })
      await audit(tx, request.actor, {
        action: 'Raised stock reorder',
        target: `${id} · ${item.name}`,
        severity: item.stock === 0 ? 'abnormal' : 'normal',
      })
      await notifyRoles(tx, ['admin'], {
        title: 'Stock reorder raised',
        body: `${item.name}: ${item.stock} in stock, reorder level ${item.reorderLevel}.`,
      })
      return item
    })
    return out.inventoryItem(row)
  })
}
