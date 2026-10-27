import type { Tx } from '../db.js'

// Human-readable, sequential identifiers (P-1009, INV-4477, MRN-48209). Counters are
// incremented atomically inside the caller's transaction, so concurrent inserts never
// collide and a rolled-back insert does not burn a number.
export async function nextId(tx: Tx, prefix: string): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value") VALUES (${prefix}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`
  return `${prefix}-${rows[0].value}`
}
