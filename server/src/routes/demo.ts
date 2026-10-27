import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { db } from '../db.js'
import { audit } from '../lib/activity.js'
import { HttpError } from '../lib/errors.js'
import { publish } from '../lib/events.js'
import { resetDemoData } from '../seed/index.js'

export default async function demoRoutes(app: FastifyInstance) {
  app.post('/demo/reset', async (request) => {
    if (!config.DEMO_MODE) throw new HttpError(404, 'not_found', 'Route not found.')
    await resetDemoData(db)
    // The caller survives the reset unless they were a user created after seeding.
    const actorSurvived = await db.user.findUnique({ where: { id: request.actor.id }, select: { id: true } })
    await db.$transaction((tx) =>
      audit(tx, actorSurvived ? request.actor : null, {
        action: 'Reset demo data',
        target: 'All records',
        severity: 'abnormal',
      }),
    )
    publish([
      'patients', 'appointments', 'vitals', 'tasks', 'labTests', 'labCatalogue', 'prescriptions',
      'inventory', 'invoices', 'dischargeSummaries', 'problemSummaries', 'clinicalNotes', 'dietPlans',
      'glucoseReadings', 'users', 'auditEvents', 'notifications', 'systemSettings', 'clinic',
      'triageAssessments', 'healthTips',
    ])
    return { reset: true }
  })
}
