import type { User } from '@prisma/client'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { config, cookieSecure } from '../config.js'
import { db } from '../db.js'
import { ROLES, SEXES, type Role } from '../domain.js'
import { HOME_ROUTE } from '../lib/access.js'
import { audit, notifyRoles } from '../lib/activity.js'
import { now, parseDateKey } from '../lib/clock.js'
import { HttpError, conflict, forbidden, unauthorized } from '../lib/errors.js'
import { dateKeySchema, mutate, parse } from '../lib/http.js'
import { nextId } from '../lib/ids.js'
import { burnPasswordCheck, hashPassword, verifyPassword } from '../lib/passwords.js'
import { hashToken, randomToken } from '../lib/tokens.js'
import { authenticate } from '../plugins/auth.js'

export const REFRESH_COOKIE = 'medora_rt'
/** Non-secret flag readable by the SPA, so it only tries to restore a session that exists. */
export const SESSION_HINT_COOKIE = 'medora_session'
const COOKIE_PATH = '/api/auth'
const MAX_FAILED_LOGINS = 5
const LOCKOUT_MS = 15 * 60_000
/** A just-rotated refresh token stays usable briefly so parallel tabs don't log out. */
const ROTATION_GRACE_MS = 30_000

const email = z.string().trim().toLowerCase().email().max(254)
const password = z.string().min(8, 'Use at least 8 characters').max(200)

export function sessionUser(user: User) {
  const role = user.role as Role
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    patientId: user.patientId,
    home: HOME_ROUTE[role],
  }
}

export default async function authRoutes(app: FastifyInstance) {
  async function issueSession(
    request: FastifyRequest,
    reply: FastifyReply,
    user: User,
    persistent: boolean,
  ) {
    // Token lifetimes run on wall time, never on the (possibly pinned) clinical clock.
    const lifetimeMs = persistent
      ? config.REFRESH_TOKEN_TTL_DAYS * 86_400_000
      : config.SESSION_TTL_HOURS * 3_600_000
    const token = randomToken()
    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        persistent,
        expiresAt: new Date(Date.now() + lifetimeMs),
        userAgent: request.headers['user-agent']?.slice(0, 255) ?? null,
        ip: request.ip,
      },
    })
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: cookieSecure,
      path: COOKIE_PATH,
      maxAge: persistent ? Math.floor(lifetimeMs / 1000) : undefined,
    })
    reply.setCookie(SESSION_HINT_COOKIE, '1', {
      httpOnly: false,
      sameSite: 'strict',
      secure: cookieSecure,
      path: '/',
      maxAge: persistent ? Math.floor(lifetimeMs / 1000) : undefined,
    })
    const accessToken = app.jwt.sign(
      { sub: user.id, role: user.role as Role },
      { expiresIn: config.ACCESS_TOKEN_TTL },
    )
    return { accessToken, user: sessionUser(user) }
  }

  function clearCookie(reply: FastifyReply) {
    reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH })
    reply.clearCookie(SESSION_HINT_COOKIE, { path: '/' })
  }

  app.post(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parse(
        z.object({ email, password: z.string().min(1).max(200), remember: z.boolean().default(false) }),
        request.body,
      )
      const user = await db.user.findUnique({ where: { email: body.email } })

      if (!user) {
        await burnPasswordCheck(body.password)
        throw unauthorized('Email or password is incorrect.')
      }
      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        throw new HttpError(429, 'locked', 'Too many failed attempts. Try again in 15 minutes.')
      }

      const valid = user.passwordHash ? await verifyPassword(user.passwordHash, body.password) : false
      if (!valid) {
        if (!user.passwordHash) await burnPasswordCheck(body.password)
        const failures = user.failedLoginCount + 1
        const locked = failures >= MAX_FAILED_LOGINS
        await db.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: locked ? 0 : failures,
              lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MS) : null,
            },
          })
          await audit(tx, null, {
            action: locked ? 'Account locked after failed logins' : `Failed login attempt (${failures})`,
            target: user.email,
            severity: failures >= 3 || locked ? 'critical' : 'abnormal',
            ip: request.ip,
          })
        })
        throw unauthorized('Email or password is incorrect.')
      }

      // Status is only revealed once the password has been proven.
      if (user.status === 'invited') {
        throw forbidden('Your account is awaiting administrator approval.')
      }
      if (user.status !== 'active') throw forbidden('This account has been suspended.')

      const updated = await mutate(['users'], async (tx) => {
        const row = await tx.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastActiveAt: now() },
        })
        await audit(tx, sessionActor(row), { action: 'Signed in', target: row.email, ip: request.ip })
        return row
      })
      return issueSession(request, reply, updated, body.remember)
    },
  )

  app.post('/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (!token) throw unauthorized('No active session.')

    const stored = await db.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    })
    if (!stored || stored.expiresAt.getTime() <= Date.now()) {
      clearCookie(reply)
      throw unauthorized('Your session has expired. Sign in again.')
    }

    if (stored.revokedAt) {
      clearCookie(reply)
      throw unauthorized('Your session has ended. Sign in again.')
    }

    if (stored.rotatedAt && Date.now() - stored.rotatedAt.getTime() > ROTATION_GRACE_MS) {
      // A rotated-out token came back: treat the whole session family as stolen.
      await db.$transaction(async (tx) => {
        await tx.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        await audit(tx, null, {
          action: 'Refresh token reuse detected; sessions revoked',
          target: stored.user.email,
          severity: 'critical',
          ip: request.ip,
        })
      })
      clearCookie(reply)
      throw unauthorized('Your session was ended for security reasons. Sign in again.')
    }

    if (stored.user.status !== 'active') {
      clearCookie(reply)
      throw unauthorized('This account is not active.')
    }

    if (!stored.rotatedAt) {
      await db.refreshToken.update({ where: { id: stored.id }, data: { rotatedAt: new Date() } })
    }
    return issueSession(request, reply, stored.user, stored.persistent)
  })

  app.post('/logout', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (token) {
      const stored = await db.refreshToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      })
      if (stored && !stored.revokedAt) {
        await mutate([], async (tx) => {
          await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
          await audit(tx, sessionActor(stored.user), {
            action: 'Signed out',
            target: stored.user.email,
            ip: request.ip,
          })
        })
      }
    }
    clearCookie(reply)
    return reply.code(204).send()
  })

  app.post(
    '/register',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parse(
        z
          .object({
            name: z.string().trim().min(2).max(120),
            email,
            password,
            role: z.enum(ROLES),
            organisation: z.string().trim().max(160).optional(),
            dateOfBirth: dateKeySchema.optional(),
            sex: z.enum(SEXES).optional(),
            phone: z.string().trim().max(40).optional(),
          })
          .refine((value) => value.role !== 'patient' || (value.dateOfBirth && value.sex), {
            message: 'Date of birth and sex are required to open a patient record',
            path: ['dateOfBirth'],
          }),
        request.body,
      )

      if (await db.user.findUnique({ where: { email: body.email } })) {
        throw conflict('An account with this email already exists.')
      }
      const passwordHash = await hashPassword(body.password)

      if (body.role === 'patient') {
        const user = await mutate(['patients', 'users'], async (tx) => {
          const patientId = await nextId(tx, 'P')
          await tx.patient.create({
            data: {
              id: patientId,
              mrn: await nextId(tx, 'MRN'),
              name: body.name,
              dateOfBirth: parseDateKey(body.dateOfBirth!),
              sex: body.sex!,
              phone: body.phone ?? '',
              bloodGroup: 'Unknown',
              conditions: [],
              allergies: [],
              lastVisitAt: now(),
              risk: 'normal',
              department: 'General Medicine',
            },
          })
          const row = await tx.user.create({
            data: {
              id: await nextId(tx, 'U'),
              name: body.name,
              email: body.email,
              role: 'patient',
              status: 'active',
              passwordHash,
              patientId,
              lastActiveAt: now(),
            },
          })
          await audit(tx, sessionActor(row), {
            action: 'Registered patient account',
            target: `${patientId} · ${body.name}`,
            ip: request.ip,
          })
          return row
        })
        reply.code(201)
        return { status: 'active' as const, ...(await issueSession(request, reply, user, false)) }
      }

      // Staff accounts need an administrator to approve them before first sign-in.
      await mutate(['users'], async (tx) => {
        const row = await tx.user.create({
          data: {
            id: await nextId(tx, 'U'),
            name: body.name,
            email: body.email,
            role: body.role,
            status: 'invited',
            passwordHash,
            lastActiveAt: now(),
          },
        })
        await audit(tx, null, {
          action: 'Requested staff access',
          target: `${row.email} · ${row.role}${body.organisation ? ` · ${body.organisation}` : ''}`,
          severity: 'abnormal',
          ip: request.ip,
        })
        await notifyRoles(tx, ['admin'], {
          title: 'Access request',
          body: `${row.name} asked to join as ${row.role}. Approve them under User access.`,
          severity: 'abnormal',
        })
      })
      return reply.code(202).send({ status: 'pending' as const })
    },
  )

  app.post(
    '/set-password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parse(z.object({ token: z.string().min(20).max(200), password }), request.body)
      const stored = await db.setupToken.findUnique({
        where: { tokenHash: hashToken(body.token) },
        include: { user: true },
      })
      if (!stored || stored.usedAt || stored.expiresAt.getTime() <= Date.now()) {
        throw new HttpError(410, 'link_expired', 'This setup link has expired. Ask an administrator for a new one.')
      }
      if (stored.user.status === 'suspended') throw forbidden('This account has been suspended.')

      const passwordHash = await hashPassword(body.password)
      await mutate(['users'], async (tx) => {
        await tx.setupToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } })
        const row = await tx.user.update({
          where: { id: stored.userId },
          data: { passwordHash, status: 'active', failedLoginCount: 0, lockedUntil: null },
        })
        await tx.refreshToken.updateMany({
          where: { userId: row.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        await audit(tx, sessionActor(row), { action: 'Set account password', target: row.email, ip: request.ip })
      })
      return reply.code(204).send()
    },
  )

  app.get('/me', { onRequest: authenticate }, async (request) => {
    const user = await db.user.findUniqueOrThrow({ where: { id: request.actor.id } })
    return { user: sessionUser(user) }
  })
}

function sessionActor(user: User) {
  return { id: user.id, name: user.name, role: user.role as Role }
}
