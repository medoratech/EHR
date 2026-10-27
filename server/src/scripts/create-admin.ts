// Bootstraps the first administrator on a fresh (non-demo) database.
//   ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… npm run create-admin
import { db } from '../db.js'
import { audit } from '../lib/activity.js'
import { now } from '../lib/clock.js'
import { nextId } from '../lib/ids.js'
import { hashPassword } from '../lib/passwords.js'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const name = process.env.ADMIN_NAME?.trim()
const password = process.env.ADMIN_PASSWORD ?? ''

if (!email || !name || password.length < 12) {
  console.error('Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD (12+ characters).')
  process.exit(1)
}

try {
  if (await db.user.findUnique({ where: { email } })) {
    console.error(`${email} already exists.`)
    process.exit(1)
  }
  const passwordHash = await hashPassword(password)
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { id: await nextId(tx, 'U'), name, email, role: 'admin', status: 'active', passwordHash, lastActiveAt: now() },
    })
    await audit(tx, null, { action: 'Created administrator from the command line', target: user.email })
  })
  console.log(`Administrator ${email} created.`)
} finally {
  await db.$disconnect()
}
