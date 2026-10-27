import type { PrismaClient } from '@prisma/client'
import { loadClinic } from '../lib/clinic.js'
import { now } from '../lib/clock.js'
import { hashPassword } from '../lib/passwords.js'
import { buildSeed, DEMO_PASSWORD } from './data.js'

// Tables wiped on every reset. Users, refresh tokens and setup tokens are reconciled
// instead, so whoever pressed "Reset demo data" stays signed in.
const DOMAIN_TABLES = [
  'TriageAssessment', 'HealthTip', 'Notification', 'AuditEvent', 'ClinicalNote', 'GlucoseReading', 'DietPlan', 'ProblemSummary',
  'DischargeSummary', 'Invoice', 'InventoryItem', 'Medicine', 'Prescription', 'LabCatalogueItem',
  'LabTest', 'Task', 'Vitals', 'Appointment', 'Counter', 'SystemSetting',
]

/** Replaces every record with the demo dataset, anchored to the clinical clock. */
export async function resetDemoData(db: PrismaClient): Promise<void> {
  const seed = buildSeed(now())
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const seedUserIds = seed.users.map((user) => user.id)

  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `TRUNCATE ${DOMAIN_TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY`,
      )
      await tx.user.deleteMany({ where: { id: { notIn: seedUserIds } } })
      await tx.user.updateMany({ data: { patientId: null } })
      await tx.patient.deleteMany()
      await tx.department.deleteMany()

      await tx.clinic.upsert({ where: { id: 1 }, create: { id: 1, ...seed.clinic }, update: seed.clinic })
      await tx.department.createMany({ data: seed.departments })
      await tx.patient.createMany({ data: seed.patients })

      for (const { noPassword, ...user } of seed.users as (typeof seed.users[number] & { noPassword?: boolean })[]) {
        const data = {
          ...user,
          patientId: 'patientId' in user ? user.patientId : null,
          passwordHash: noPassword ? null : passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        }
        await tx.user.upsert({ where: { id: user.id }, create: data, update: data })
      }
      await tx.setupToken.deleteMany({ where: { usedAt: null } })

      await tx.appointment.createMany({ data: seed.appointments })
      await tx.vitals.createMany({ data: seed.vitals })
      await tx.task.createMany({ data: seed.tasks })
      await tx.labTest.createMany({ data: seed.labTests })
      await tx.labCatalogueItem.createMany({ data: seed.labCatalogue })
      for (const { medicines, ...prescription } of seed.prescriptions) {
        await tx.prescription.create({ data: { ...prescription, medicines: { create: medicines } } })
      }
      await tx.inventoryItem.createMany({ data: seed.inventory })
      await tx.invoice.createMany({ data: seed.invoices })
      await tx.dischargeSummary.createMany({ data: seed.dischargeSummaries })
      await tx.problemSummary.createMany({ data: seed.problemSummaries })
      await tx.dietPlan.createMany({ data: seed.dietPlans })
      await tx.glucoseReading.createMany({ data: seed.glucoseReadings })
      await tx.auditEvent.createMany({ data: seed.auditEvents })
      await tx.notification.createMany({ data: seed.notifications })
      await tx.systemSetting.createMany({ data: seed.systemSettings })
      await tx.healthTip.createMany({ data: seed.healthTips })

      // Continue each identifier sequence after the highest seeded number.
      const ids = [
        ...seed.patients.flatMap((p) => [p.id, p.mrn]),
        ...seed.users.map((u) => u.id),
        ...seed.appointments.map((a) => a.id),
        ...seed.vitals.map((v) => v.id),
        ...seed.tasks.map((t) => t.id),
        ...seed.labTests.map((l) => l.id),
        ...seed.labCatalogue.map((c) => c.id),
        ...seed.prescriptions.flatMap((p) => [p.id, ...p.medicines.map((m) => m.id)]),
        ...seed.inventory.map((i) => i.id),
        ...seed.invoices.map((i) => i.id),
        ...seed.dischargeSummaries.map((d) => d.id),
        ...seed.auditEvents.map((a) => a.id),
        ...seed.notifications.map((n) => n.id),
        ...seed.healthTips.map((t) => t.id),
      ]
      const counters = new Map<string, number>()
      for (const id of ids) {
        const match = /^([A-Z]+)-(\d+)$/.exec(id)
        if (!match) continue
        counters.set(match[1], Math.max(counters.get(match[1]) ?? 0, Number(match[2])))
      }
      await tx.counter.createMany({
        data: [...counters].map(([key, value]) => ({ key, value })),
      })
    },
    { timeout: 30_000 },
  )
  await loadClinic(db)
}
