import { z } from 'zod'
import { db, type Tx } from '../db.js'
import { publish, type Resource } from './events.js'

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data ?? {})
}

/**
 * Runs a write in one transaction, then tells connected clients which collections
 * changed. Audit events and notifications are always assumed to change.
 */
export async function mutate<T>(resources: Resource[], work: (tx: Tx) => Promise<T>): Promise<T> {
  const result = await db.$transaction(work, { isolationLevel: 'ReadCommitted', timeout: 15_000 })
  publish([...resources, 'auditEvents', 'notifications'])
  return result
}

export const idParams = z.object({ id: z.string().min(1).max(64) })
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the HH:mm format')
export const text = (max = 500) => z.string().trim().min(1).max(max)
export const money = z.coerce.number().nonnegative().max(10_000_000).multipleOf(0.01)
