import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import {
  APPOINTMENT_SOURCES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TRANSITIONS,
  APPOINTMENT_TYPES,
  type AppointmentStatus,
} from '../domain.js'
import { assertCanAccessPatient, isStaff, patientScope, requireRole } from '../lib/access.js'
import { audit, notifyPatient, notifyRoles } from '../lib/activity.js'
import { assertActiveDepartment, clinic } from '../lib/clinic.js'
import { dateKey, now, parseDateKey, todayKey } from '../lib/clock.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { dateKeySchema, idParams, mutate, parse, text, timeSchema } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

const listQuery = z.object({
  date: dateKeySchema.optional(),
  from: dateKeySchema.optional(),
  patientId: z.string().max(64).optional(),
})

const createSchema = z.object({
  patientId: z.string().min(1).max(64).optional(),
  doctor: z.string().trim().min(1).max(120).optional(),
  doctorId: z.string().max(64).optional(),
  department: text(80),
  date: dateKeySchema,
  time: timeSchema,
  type: z.enum(APPOINTMENT_TYPES).default('OPD'),
  source: z.enum(APPOINTMENT_SOURCES).default('app'),
  status: z.enum(['pending', 'confirmed']).optional(),
  reason: text(300),
})

export default async function appointmentRoutes(app: FastifyInstance) {
  app.get('/appointments', async (request) => {
    const query = parse(listQuery, request.query)
    const scope = patientScope(request.actor)
    const rows = await db.appointment.findMany({
      where: {
        patientId: scope.patientId ?? query.patientId,
        date: query.date
          ? parseDateKey(query.date)
          : query.from
            ? { gte: parseDateKey(query.from) }
            : undefined,
      },
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    })
    return rows.map(out.appointment)
  })

  app.post('/appointments', async (request, reply) => {
    const actor = request.actor
    requireRole(actor, ['patient', 'doctor', 'receptionist'])
    const input = parse(createSchema, request.body)

    const byPatient = actor.role === 'patient'
    const patientId = byPatient ? actor.patientId : input.patientId
    if (!patientId) throw badRequest('Choose the patient this appointment is for.')
    assertCanAccessPatient(actor, patientId)
    if (input.date < todayKey()) throw badRequest('Appointments cannot be booked in the past.')
    if (byPatient && !clinic().appointmentSlots.includes(input.time)) {
      throw badRequest(`Choose one of the clinic's appointment times: ${clinic().appointmentSlots.join(', ')}.`)
    }
    await assertActiveDepartment(db, input.department)

    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient) throw notFound('Patient')

    let doctor = input.doctor ?? clinic().defaultClinician
    if (input.doctorId) {
      const user = await db.user.findFirst({
        where: { id: input.doctorId, role: 'doctor', status: 'active' },
      })
      if (!user) throw badRequest('That clinician is not available for booking.')
      doctor = user.name
    }

    const row = await mutate(['appointments'], async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          id: await nextId(tx, 'A'),
          patientId,
          doctor,
          doctorId: input.doctorId ?? null,
          department: input.department,
          date: parseDateKey(input.date),
          time: input.time,
          type: input.type,
          // Patients request; the front desk or clinician confirms.
          status: byPatient ? 'pending' : (input.status ?? 'confirmed'),
          source: byPatient ? 'app' : input.source,
          reason: input.reason,
        },
      })
      await audit(tx, actor, {
        action: byPatient ? 'Requested appointment' : 'Booked appointment',
        target: `${appointment.id} · ${patient.name}`,
      })
      if (byPatient) {
        await notifyRoles(tx, ['receptionist'], {
          title: 'New appointment request',
          body: `${patient.name} requested ${input.department} on ${input.date} at ${input.time}.`,
          severity: 'abnormal',
        })
      } else {
        await notifyPatient(tx, patientId, {
          title: 'Appointment booked',
          body: `${doctor} · ${input.department} on ${input.date} at ${input.time}.`,
        })
      }
      return appointment
    })
    return reply.code(201).send(out.appointment(row))
  })

  app.patch('/appointments/:id', async (request) => {
    const actor = request.actor
    const { id } = parse(idParams, request.params)
    const { status } = parse(z.object({ status: z.enum(APPOINTMENT_STATUSES) }), request.body)

    const existing = await db.appointment.findUnique({ where: { id }, include: { patient: true } })
    if (!existing) throw notFound('Appointment')
    assertCanAccessPatient(actor, existing.patientId)

    if (isStaff(actor)) {
      requireRole(actor, ['doctor', 'receptionist', 'admin'])
    } else if (status !== 'cancelled') {
      throw forbidden('You can cancel your appointment; the clinic confirms it.')
    }

    const from = existing.status as AppointmentStatus
    if (!APPOINTMENT_TRANSITIONS[from].includes(status)) {
      throw conflict(`An appointment that is ${from} cannot be marked ${status}.`)
    }

    const row = await mutate(['appointments', 'patients'], async (tx) => {
      const appointment = await tx.appointment.update({ where: { id }, data: { status } })
      if (status === 'completed') {
        await tx.patient.update({ where: { id: existing.patientId }, data: { lastVisitAt: now() } })
      }
      await audit(tx, actor, {
        action: `Marked appointment ${status}`,
        target: `${id} · ${existing.patient.name}`,
      })
      const summary = `${existing.doctor} · ${dateKey(existing.date)} at ${existing.time}.`
      if (isStaff(actor)) {
        await notifyPatient(tx, existing.patientId, { title: `Appointment ${status}`, body: summary })
      } else {
        await notifyRoles(tx, ['receptionist'], {
          title: 'Appointment cancelled by patient',
          body: `${existing.patient.name} · ${summary}`,
        })
      }
      return appointment
    })
    return out.appointment(row)
  })
}
