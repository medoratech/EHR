import type { TaskKind, Urgency } from './types'

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  'vitals-check': 'Vitals check',
  'discharge-summary': 'Discharge summary',
  'med-delivery': 'Medicine delivery',
  'report-collection': 'Report collection',
  'room-prep': 'Room preparation',
}


export const URGENCY_LABELS: Record<Urgency, { label: string; timeframe: string; tone: 'danger' | 'warning' | 'brand' | 'neutral' | 'positive' }> = {
  emergency: { label: 'Emergency', timeframe: 'Get emergency care now', tone: 'danger' },
  urgent: { label: 'Urgent', timeframe: 'Be seen today', tone: 'danger' },
  soon: { label: 'Soon', timeframe: 'Be seen within 1–3 days', tone: 'warning' },
  routine: { label: 'Routine', timeframe: 'Book a regular appointment', tone: 'brand' },
  self_care: { label: 'Self-care', timeframe: 'Manage at home and watch for changes', tone: 'positive' },
}

export const URGENCY_ORDER: Urgency[] = ['emergency', 'urgent', 'soon', 'routine', 'self_care']
