import { EventEmitter } from 'node:events'

// In-process change feed. Payloads carry only resource names, never record data, so
// every subscriber can receive every event; clients refetch what they may read.
// Running several API instances needs a shared bus (e.g. Postgres LISTEN/NOTIFY).
export type Resource =
  | 'patients'
  | 'appointments'
  | 'vitals'
  | 'tasks'
  | 'labTests'
  | 'labCatalogue'
  | 'prescriptions'
  | 'inventory'
  | 'invoices'
  | 'dischargeSummaries'
  | 'problemSummaries'
  | 'clinicalNotes'
  | 'dietPlans'
  | 'glucoseReadings'
  | 'users'
  | 'auditEvents'
  | 'notifications'
  | 'systemSettings'
  | 'clinic'
  | 'triageAssessments'
  | 'healthTips'

const bus = new EventEmitter()
bus.setMaxListeners(0)

export function publish(resources: Resource[]) {
  if (resources.length > 0) bus.emit('change', [...new Set(resources)])
}

export function subscribe(listener: (resources: Resource[]) => void): () => void {
  bus.on('change', listener)
  return () => bus.off('change', listener)
}
