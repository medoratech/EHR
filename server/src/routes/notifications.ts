import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { notFound } from '../lib/errors.js'
import { publish } from '../lib/events.js'
import { idParams, parse } from '../lib/http.js'
import * as out from '../lib/serialize.js'

export default async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', async (request) => {
    const rows = await db.notification.findMany({
      where: { recipientId: request.actor.id },
      orderBy: [{ at: 'desc' }, { id: 'desc' }],
      take: 100,
    })
    return rows.map(out.notification)
  })

  app.post('/notifications/:id/read', async (request) => {
    const { id } = parse(idParams, request.params)
    const result = await db.notification.updateMany({
      where: { id, recipientId: request.actor.id, readAt: null },
      data: { readAt: new Date() },
    })
    if (result.count === 0 && !(await db.notification.findFirst({ where: { id, recipientId: request.actor.id } }))) {
      throw notFound('Notification')
    }
    publish(['notifications'])
    return { read: true }
  })

  app.post('/notifications/read-all', async (request) => {
    const result = await db.notification.updateMany({
      where: { recipientId: request.actor.id, readAt: null },
      data: { readAt: new Date() },
    })
    publish(['notifications'])
    return { updated: result.count }
  })
}
