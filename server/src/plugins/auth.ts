import type { FastifyRequest } from 'fastify'
import { db } from '../db.js'
import type { Role } from '../domain.js'
import type { Actor } from '../lib/access.js'
import { now } from '../lib/clock.js'
import { unauthorized } from '../lib/errors.js'

export interface AccessTokenPayload {
  sub: string
  role: Role
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload
    user: AccessTokenPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor
  }
}

const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60_000

/**
 * onRequest hook for protected routes. The user row is re-read on every request so a
 * suspension or role change takes effect immediately rather than when the token expires.
 */
export async function authenticate(request: FastifyRequest): Promise<void> {
  let payload: AccessTokenPayload
  try {
    payload = await request.jwtVerify<AccessTokenPayload>()
  } catch {
    throw unauthorized('Your session has expired. Sign in again.')
  }

  const user = await db.user.findUnique({ where: { id: payload.sub } })
  if (!user || user.status !== 'active') throw unauthorized('This account is not active.')

  request.actor = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    patientId: user.patientId,
  }

  const current = now()
  if (current.getTime() - user.lastActiveAt.getTime() > ACTIVITY_WRITE_INTERVAL_MS) {
    void db.user
      .update({ where: { id: user.id }, data: { lastActiveAt: current } })
      .catch((error: unknown) => request.log.warn({ error }, 'could not record activity'))
  }
}
