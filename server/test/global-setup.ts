import { execSync } from 'node:child_process'

// Bring the test database's schema up to date once per run.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://medora:medora@localhost:5433/medora_test?schema=public',
    },
  })
}
