import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { Prisma } from '@prisma/client'
import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify'
import { ZodError } from 'zod'
import { config } from './config.js'
import { db } from './db.js'
import { loadClinic } from './lib/clinic.js'
import { HttpError } from './lib/errors.js'
import { authenticate } from './plugins/auth.js'
import adminRoutes from './routes/admin.js'
import appointmentRoutes from './routes/appointments.js'
import authRoutes from './routes/auth.js'
import clinicAdminRoutes, { clinicPublicRoutes } from './routes/clinic.js'
import billingRoutes from './routes/billing.js'
import clinicalRoutes from './routes/clinical.js'
import demoRoutes from './routes/demo.js'
import dischargeRoutes from './routes/discharges.js'
import eventRoutes from './routes/events.js'
import healthTipRoutes from './routes/healthTips.js'
import labRoutes from './routes/labs.js'
import notificationRoutes from './routes/notifications.js'
import patientRoutes from './routes/patients.js'
import pharmacyRoutes from './routes/pharmacy.js'
import systemRoutes from './routes/system.js'
import taskRoutes from './routes/tasks.js'
import triageRoutes from './routes/triage.js'
import vitalsRoutes from './routes/vitals.js'

export async function buildApp(options: FastifyServerOptions = {}) {
  await loadClinic(db)
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 1_048_576,
    logger: {
      level: config.LOG_LEVEL,
      // Never write credentials or tokens to the log.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      transport:
        config.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
    ...options,
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  const origins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  await app.register(cors, { origin: origins.length > 0 ? origins : false, credentials: true })
  await app.register(cookie)
  await app.register(rateLimit, {
    global: true,
    max: 600,
    timeWindow: '1 minute',
    enableDraftSpec: true,
    skipOnError: true,
    allowList: () => config.NODE_ENV === 'test',
  })
  await app.register(jwt, { secret: config.JWT_SECRET, sign: { algorithm: 'HS256' }, verify: { algorithms: ['HS256'] } })

  app.decorateRequest('actor', undefined as never)

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
      const first = issues[0]
      return reply.code(400).send({
        error: {
          code: 'validation_failed',
          message: first ? `${first.path ? `${first.path}: ` : ''}${first.message}` : 'Invalid request.',
          issues,
        },
      })
    }
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Record not found.' } })
      }
      if (error.code === 'P2002') {
        return reply.code(409).send({ error: { code: 'conflict', message: 'That record already exists.' } })
      }
      if (error.code === 'P2003') {
        return reply.code(400).send({ error: { code: 'bad_reference', message: 'A linked record does not exist.' } })
      }
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: { code: error.code ?? 'bad_request', message: error.message } })
    }
    request.log.error({ err: error }, 'unhandled error')
    return reply.code(500).send({ error: { code: 'internal', message: 'Something went wrong. Please try again.' } })
  })

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: { code: 'not_found', message: 'Route not found.' } }),
  )

  await app.register(
    async (api) => {
      await api.register(systemRoutes)
      await api.register(clinicPublicRoutes)
      await api.register(authRoutes, { prefix: '/auth' })

      await api.register(async (secured) => {
        secured.addHook('onRequest', authenticate)
        for (const routes of [
          patientRoutes, clinicalRoutes, appointmentRoutes, vitalsRoutes, taskRoutes, labRoutes,
          pharmacyRoutes, billingRoutes, dischargeRoutes, adminRoutes, clinicAdminRoutes, triageRoutes, healthTipRoutes,
          notificationRoutes,
          eventRoutes, demoRoutes,
        ]) {
          await secured.register(routes)
        }
      })
    },
    { prefix: '/api' },
  )

  return app
}
