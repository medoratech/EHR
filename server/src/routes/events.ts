import type { FastifyInstance } from 'fastify'
import { subscribe } from '../lib/events.js'

const HEARTBEAT_MS = 25_000

// Server-sent change feed. Each message lists collections that changed; the client
// refetches the ones it is allowed to read. Clients connect with fetch() so the
// bearer token travels in a header rather than the URL.
export default async function eventRoutes(app: FastifyInstance) {
  app.get('/events', async (request, reply) => {
    reply.hijack()
    const res = reply.raw
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write(`event: ready\ndata: {}\n\n`)

    const unsubscribe = subscribe((resources) => {
      res.write(`event: change\ndata: ${JSON.stringify({ resources })}\n\n`)
    })
    const heartbeat = setInterval(() => res.write(`: keep-alive\n\n`), HEARTBEAT_MS)

    request.raw.on('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
    })
  })
}
