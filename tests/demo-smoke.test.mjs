import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('all presentation-critical portal pages exist', () => {
  for (const page of [
    'PatientDashboard.tsx',
    'DoctorDashboard.tsx',
    'StaffDashboard.tsx',
    'LaboratoryDashboard.tsx',
    'PharmacyDashboard.tsx',
    'ReceptionistDashboard.tsx',
    'AdminPanel.tsx',
  ]) {
    assert.equal(fs.existsSync(`src/pages/${page}`), true, `${page} should exist`)
  }
})

test('shared demo state is wired into the application', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8')
  const store = fs.readFileSync('src/state/demoStore.tsx', 'utf8')
  assert.match(app, /DemoStoreProvider/)
  assert.match(store, /addAppointment/)
  assert.match(store, /releaseLabReport/)
  assert.match(store, /updateInvoice/)
})

test('portal navigation renders focused workspaces for query views', () => {
  for (const page of [
    'PatientDashboard.tsx',
    'DoctorDashboard.tsx',
    'StaffDashboard.tsx',
    'LaboratoryDashboard.tsx',
    'PharmacyDashboard.tsx',
    'ReceptionistDashboard.tsx',
    'AdminPanel.tsx',
  ]) {
    const source = fs.readFileSync(`src/pages/${page}`, 'utf8')
    assert.match(source, /useSearchParams/)
    assert.match(source, /FocusedPortalView/)
  }
})

test('presentation data uses a deterministic demo clock', () => {
  const clock = fs.readFileSync('src/lib/demoClock.ts', 'utf8')
  const api = fs.readFileSync('src/data/api.ts', 'utf8')
  assert.match(clock, /DEMO_NOW/)
  assert.match(api, /new Date\(DEMO_NOW\)/)
})
