import { PrismaClient } from '@prisma/client'
import { config } from '../src/config.js'
import { resetDemoData } from '../src/seed/index.js'

if (config.NODE_ENV === 'production' && !config.DEMO_MODE) {
  console.error('Refusing to load synthetic demo records into a production database.')
  console.error('Create the first administrator with `npm run create-admin` instead.')
  process.exit(1)
}

const db = new PrismaClient()
try {
  await resetDemoData(db)
  console.log('Seeded Medora demo data.')
} finally {
  await db.$disconnect()
}
