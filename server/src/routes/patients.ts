import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, type Tx } from '../db.js'
import { SEVERITIES, SEXES } from '../domain.js'
import { assertCanAccessPatient, patientScope, requireRole, type Actor } from '../lib/access.js'
import { audit, notifyRoles } from '../lib/activity.js'
import { assertActiveDepartment, clinic } from '../lib/clinic.js'
import { clinicTime, now, parseDateKey, todayKey } from '../lib/clock.js'
import { notFound } from '../lib/errors.js'
import { dateKeySchema, idParams, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const demographics = {
  name: text(120),
  dateOfBirth: dateKeySchema.optional(),
  age: z.coerce.number().int().min(0).max(130).optional(),
  sex: z.enum(SEXES),
  phone: z.string().trim().max(40).default(''),
  bloodGroup: z.string().trim().max(12).default('Unknown'),
  department: text(80),
  conditions: z.array(text(120)).max(50).default([]),
  allergies: z.array(text(120)).max(50).default(['None known']),
  risk: z.enum(SEVERITIES).default('normal'),
}

const needsBirthDate = (value: { dateOfBirth?: string; age?: number }) =>
  value.dateOfBirth !== undefined || value.age !== undefined
const birthDateIssue = { message: 'Provide a date of birth or an age', path: ['dateOfBirth'] }

const createPatientSchema = z.object(demographics).refine(needsBirthDate, birthDateIssue)

const updatePatientSchema = z
  .object({
    name: demographics.name,
    dateOfBirth: dateKeySchema,
    sex: demographics.sex,
    phone: z.string().trim().max(40),
    bloodGroup: z.string().trim().max(12),
    department: text(80),
    conditions: z.array(text(120)).max(50),
    allergies: z.array(text(120)).max(50),
    risk: z.enum(SEVERITIES),
  })
  .partial()

const walkInSchema = z
  .object({
    ...demographics,
    reason: text(300),
    doctor: z.string().trim().max(120).optional(),
  })
  .refine(needsBirthDate, birthDateIssue)

function birthDateFromAge(age: number): Date {
  const today = todayKey()
  const candidate = `${String(Number(today.slice(0, 4)) - age).padStart(4, '0')}${today.slice(4)}`
  // 29 February does not exist in most years; the date would roll over, so use the 28th.
  const exists = parseDateKey(candidate).toISOString().startsWith(candidate)
  return parseDateKey(exists ? candidate : `${candidate.slice(0, 8)}28`)
}

async function createPatient(tx: Tx, input: z.infer<typeof createPatientSchema>) {
  await assertActiveDepartment(tx, input.department)
  return tx.patient.create({
    data: {
      id: await nextId(tx, 'P'),
      mrn: await nextId(tx, 'MRN'),
      name: input.name,
      dateOfBirth: input.dateOfBirth ? parseDateKey(input.dateOfBirth) : birthDateFromAge(input.age!),
      sex: input.sex,
      phone: input.phone,
      bloodGroup: input.bloodGroup,
      conditions: input.conditions,
      allergies: input.allergies.length > 0 ? input.allergies : ['None known'],
      lastVisitAt: now(),
      risk: input.risk,
      department: input.department,
    },
  })
}

function auditPatient(tx: Tx, actor: Actor, action: string, patient: { id: string; name: string }) {
  return audit(tx, actor, { action, target: `${patient.id} · ${patient.name}` })
}

export default async function patientRoutes(app: FastifyInstance) {
  app.get('/patients', async (request) => {
    const rows = await db.patient.findMany({
      where: { id: patientScope(request.actor).patientId },
      orderBy: { id: 'asc' },
    })
    return rows.map(out.patient)
  })

  app.get('/patients/:id', async (request) => {
    const { id } = parse(idParams, request.params)
    assertCanAccessPatient(request.actor, id)
    const row = await db.patient.findUnique({ where: { id } })
    if (!row) throw notFound('Patient')
    return out.patient(row)
  })

  app.post('/patients', async (request, reply) => {
    requireRole(request.actor, ['doctor', 'receptionist', 'admin'])
    const input = parse(createPatientSchema, request.body)
    const row = await mutate(['patients'], async (tx) => {
      const patient = await createPatient(tx, input)
      await auditPatient(tx, request.actor, 'Registered patient', patient)
      return patient
    })
    return reply.code(201).send(out.patient(row))
  })

  app.patch('/patients/:id', async (request) => {
    requireRole(request.actor, ['doctor', 'receptionist', 'admin'])
    const { id } = parse(idParams, request.params)
    const input = parse(updatePatientSchema, request.body)
    const row = await mutate(['patients'], async (tx) => {
      if (input.department) await assertActiveDepartment(tx, input.department)
      const patient = await tx.patient.update({
        where: { id },
        data: {
          ...input,
          dateOfBirth: input.dateOfBirth ? parseDateKey(input.dateOfBirth) : undefined,
        },
      })
      await auditPatient(tx, request.actor, `Updated patient record (${Object.keys(input).join(', ')})`, patient)
      return patient
    })
    return out.patient(row)
  })

  // Front desk: register an unbooked arrival and queue them for today in one step.
  app.post('/walk-ins', async (request, reply) => {
    requireRole(request.actor, ['receptionist', 'admin'])
    const input = parse(walkInSchema, request.body)
    const result = await mutate(['patients', 'appointments'], async (tx) => {
      const patient = await createPatient(tx, input)
      const time = clinicTime(now())
      const appointment = await tx.appointment.create({
        data: {
          id: await nextId(tx, 'A'),
          patientId: patient.id,
          doctor: input.doctor || clinic().defaultClinician,
          department: input.department,
          date: parseDateKey(todayKey()),
          time,
          type: 'OPD',
          status: 'confirmed',
          source: 'walk-in',
          reason: input.reason,
        },
      })
      await auditPatient(tx, request.actor, 'Registered walk-in patient', patient)
      await notifyRoles(
        tx,
        ['doctor'],
        {
          title: 'Walk-in added to today',
          body: `${patient.name} · ${input.department} · arrived ${time}.`,
        },
        request.actor.id,
      )
      return { patient: out.patient(patient), appointment: out.appointment(appointment) }
    })
    return reply.code(201).send(result)
  })
}
