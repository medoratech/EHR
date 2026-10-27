import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { db } from '../db.js'
import { clockIsPinned, now } from '../lib/clock.js'
import { DEMO_ACCOUNTS } from '../seed/data.js'

export default async function systemRoutes(app: FastifyInstance) {
  app.get('/healthz', async (_request, reply) => {
    try {
      await db.$queryRaw`SELECT 1`
      return { status: 'ok' }
    } catch {
      return reply.code(503).send({ status: 'unavailable' })
    }
  })

  // Public bootstrap information for the SPA.
  app.get('/system/info', async () => ({
    name: 'Medora EHR',
    demoMode: config.DEMO_MODE,
    clock: { now: now().toISOString(), pinned: clockIsPinned },
    demoAccounts: config.DEMO_MODE ? DEMO_ACCOUNTS : [],
  }))
}
