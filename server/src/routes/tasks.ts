import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { SEVERITIES, TASK_KINDS, TASK_STATUSES, TASK_TRANSITIONS, type Severity, type TaskStatus } from '../domain.js'
import { requireRole, requireStaff } from '../lib/access.js'
import { audit, notifyUsers } from '../lib/activity.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { idParams, mutate, parse, text } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import * as out from '../lib/serialize.js'

async function assignableNurse(id: string) {
  const user = await db.user.findFirst({ where: { id, role: 'staff', status: 'active' } })
  if (!user) throw badRequest('Tasks can only be assigned to active ward staff.')
  return user
}

export default async function taskRoutes(app: FastifyInstance) {
  app.get('/tasks', async (request) => {
    requireStaff(request.actor)
    const rows = await db.task.findMany({ include: out.taskInclude, orderBy: { due: 'asc' } })
    return rows.map(out.task)
  })

  app.post('/tasks', async (request, reply) => {
    requireRole(request.actor, ['doctor'])
    const input = parse(
      z.object({
        title: text(200),
        kind: z.enum(TASK_KINDS),
        patientId: z.string().min(1).max(64),
        assignedToId: z.string().min(1).max(64),
        due: z.string().datetime(),
        severity: z.enum(SEVERITIES).default('normal'),
      }),
      request.body,
    )
    const nurse = await assignableNurse(input.assignedToId)
    const patient = await db.patient.findUnique({ where: { id: input.patientId } })
    if (!patient) throw notFound('Patient')

    const row = await mutate(['tasks'], async (tx) => {
      const task = await tx.task.create({
        data: {
          id: await nextId(tx, 'T'),
          title: input.title,
          kind: input.kind,
          patientId: patient.id,
          assignedById: request.actor.id,
          assignedToId: nurse.id,
          due: new Date(input.due),
          status: 'open',
          severity: input.severity,
        },
        include: out.taskInclude,
      })
      await audit(tx, request.actor, {
        action: `Assigned task to ${nurse.name}`,
        target: `${task.id} · ${task.title}`,
      })
      await notifyUsers(tx, [nurse.id], {
        title: 'New task assigned',
        body: `${request.actor.name}: ${task.title}`,
        severity: input.severity,
      })
      return task
    })
    return reply.code(201).send(out.task(row))
  })

  app.patch('/tasks/:id', async (request) => {
    const actor = request.actor
    requireRole(actor, ['doctor', 'staff'])
    const { id } = parse(idParams, request.params)
    const input = parse(
      z
        .object({
          status: z.enum(TASK_STATUSES).optional(),
          assignedToId: z.string().min(1).max(64).optional(),
        })
        .refine((value) => value.status || value.assignedToId, 'Nothing to update'),
      request.body,
    )

    const existing = await db.task.findUnique({ where: { id }, include: out.taskInclude })
    if (!existing) throw notFound('Task')

    if (actor.role === 'staff') {
      if (input.assignedToId) throw forbidden('Only a doctor can reassign a task.')
      if (existing.assignedToId !== actor.id) throw forbidden('This task is assigned to someone else.')
    }
    if (input.status && input.status !== existing.status) {
      const from = existing.status as TaskStatus
      if (!TASK_TRANSITIONS[from].includes(input.status)) {
        throw conflict(`A task that is ${from} cannot move to ${input.status}.`)
      }
      if (input.status === 'reverted' && actor.role !== 'doctor') {
        throw forbidden('Only a doctor can send a task back.')
      }
    }
    const nurse = input.assignedToId ? await assignableNurse(input.assignedToId) : null

    const row = await mutate(['tasks'], async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: { status: input.status, assignedToId: nurse?.id },
        include: out.taskInclude,
      })
      if (nurse && nurse.id !== existing.assignedToId) {
        await audit(tx, actor, { action: `Reassigned task to ${nurse.name}`, target: `${id} · ${task.title}` })
        await notifyUsers(tx, [nurse.id], {
          title: 'Task assigned to you',
          body: `${actor.name}: ${task.title}`,
          severity: task.severity as Severity,
        })
      }
      if (input.status && input.status !== existing.status) {
        await audit(tx, actor, { action: `Marked task ${input.status}`, target: `${id} · ${task.title}` })
        const recipient = actor.id === task.assignedById ? task.assignedToId : task.assignedById
        await notifyUsers(tx, [recipient], {
          title: `Task ${input.status}`,
          body: `${task.title} · updated by ${actor.name}.`,
        })
      }
      return task
    })
    return out.task(row)
  })
}
