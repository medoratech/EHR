import type { Tx } from '../db.js'
import type { Role, Severity } from '../domain.js'
import type { Actor } from './access.js'
import { now } from './clock.js'
import { nextId } from './ids.js'

// Every mutation records an audit event and notifies the people it affects, inside
// the same transaction as the change itself.

export async function audit(
  tx: Tx,
  actor: Pick<Actor, 'id' | 'name' | 'role'> | null,
  entry: { action: string; target: string; severity?: Severity; ip?: string },
) {
  await tx.auditEvent.create({
    data: {
      id: await nextId(tx, 'AU'),
      actorId: actor?.id ?? null,
      actor: actor?.name ?? 'System',
      role: actor?.role ?? 'admin',
      action: entry.action,
      target: entry.target,
      severity: entry.severity ?? 'normal',
      ip: entry.ip ?? null,
      at: now(),
    },
  })
}

interface Message {
  title: string
  body: string
  severity?: Severity
}

export async function notifyUsers(tx: Tx, userIds: (string | null | undefined)[], message: Message) {
  const recipients = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  for (const recipientId of recipients) {
    await tx.notification.create({
      data: {
        id: await nextId(tx, 'N'),
        recipientId,
        title: message.title,
        body: message.body,
        severity: message.severity ?? 'normal',
        at: now(),
      },
    })
  }
}

/** Notifies every active user holding one of the roles, except the actor. */
export async function notifyRoles(tx: Tx, roles: Role[], message: Message, except?: string) {
  const users = await tx.user.findMany({
    where: { role: { in: roles }, status: 'active', NOT: except ? { id: except } : undefined },
    select: { id: true },
  })
  await notifyUsers(
    tx,
    users.map((user) => user.id),
    message,
  )
}

/** Notifies the patient who owns the chart, if they have a portal login. */
export async function notifyPatient(tx: Tx, patientId: string, message: Message, except?: string) {
  const user = await tx.user.findUnique({ where: { patientId }, select: { id: true, status: true } })
  if (user && user.status === 'active' && user.id !== except) {
    await notifyUsers(tx, [user.id], message)
  }
}
