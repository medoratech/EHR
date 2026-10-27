import argon2 from 'argon2'

const options = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 }

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, options)
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password).catch(() => false)
}

// Verified against when an email is unknown, so response time does not reveal
// which accounts exist.
let dummyHash: Promise<string> | null = null
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('medora-timing-equaliser')
  await verifyPassword(await dummyHash, password)
}
