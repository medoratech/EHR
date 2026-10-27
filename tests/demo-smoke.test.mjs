import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const pages = [
  'PatientDashboard.tsx',
  'DoctorDashboard.tsx',
  'StaffDashboard.tsx',
  'LaboratoryDashboard.tsx',
  'PharmacyDashboard.tsx',
  'ReceptionistDashboard.tsx',
  'AdminPanel.tsx',
]

test('all presentation-critical portal pages exist', () => {
  for (const page of pages) {
    assert.equal(fs.existsSync(`src/pages/${page}`), true, `${page} should exist`)
  }
})

test('the app is wired to the API through auth and the EHR store', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8')
  const store = fs.readFileSync('src/state/ehrStore.tsx', 'utf8')
  assert.match(app, /AuthProvider/)
  assert.match(app, /EhrProvider/)
  assert.match(app, /RequireAuth/)
  assert.match(store, /streamEvents/)
  for (const endpoint of ['/appointments', '/lab-tests', '/invoices', '/vitals']) {
    assert.match(store, new RegExp(`'${endpoint}`))
  }
})

test('no page reads synthetic data directly', () => {
  assert.equal(fs.existsSync('src/data/mock.ts'), false, 'seed data lives in server/src/seed')
  for (const page of pages) {
    const source = fs.readFileSync(`src/pages/${page}`, 'utf8')
    assert.doesNotMatch(source, /data\/mock|useDemoStore/, page)
    assert.match(source, /useEhr/, page)
  }
})

test('portal navigation renders focused workspaces for query views', () => {
  for (const page of pages) {
    const source = fs.readFileSync(`src/pages/${page}`, 'utf8')
    assert.match(source, /useSearchParams/)
    assert.match(source, /FocusedPortalView/)
  }
})

test('the browser clock is synchronised with the server clinical clock', () => {
  const clock = fs.readFileSync('src/lib/clock.ts', 'utf8')
  const auth = fs.readFileSync('src/state/auth.tsx', 'utf8')
  assert.match(clock, /export function syncClock/)
  assert.match(auth, /syncClock\(info\.clock\.now\)/)
})

test('clinic reference data comes from the API, not the code', () => {
  const types = fs.readFileSync('src/data/types.ts', 'utf8')
  const format = fs.readFileSync('src/lib/format.ts', 'utf8')
  assert.doesNotMatch(types, /export const DEPARTMENTS/)
  assert.doesNotMatch(format, /₹|en-IN|en-GB/)
  assert.match(format, /clinicConfig\(\)\?\.currency/)
  for (const page of pages) {
    const source = fs.readFileSync(`src/pages/${page}`, 'utf8')
    assert.doesNotMatch(source, /'Mobile money'|'Cash'|appointmentSlots = \[/, page)
  }
})
