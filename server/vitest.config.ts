import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['test/global-setup.ts'],
    // Every file resets the shared test database, so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://medora:medora@localhost:5433/medora_test?schema=public',
      JWT_SECRET: 'test-secret-that-is-definitely-long-enough-123',
      DEMO_MODE: 'true',
      CLOCK_START_AT: '2026-10-16T09:00:00.000Z',
      LOG_LEVEL: 'silent',
      // Tests swap in a fake assessor; never call the network.
      TRIAGE_AI: 'false',
    },
  },
})
