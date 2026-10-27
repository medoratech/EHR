import { buildApp } from './app.js'
import { config } from './config.js'
import { db } from './db.js'

const app = await buildApp()

async function shutdown(signal: string) {
  app.log.info({ signal }, 'shutting down')
  await app.close()
  await db.$disconnect()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

await app.listen({ host: config.HOST, port: config.PORT })
