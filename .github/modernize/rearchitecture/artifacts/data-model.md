# Data Model

## Persistence status

The application has no database or ORM. `src/data/mock.ts` defines synthetic in-memory collections, and `src/data/api.ts` exposes read/query helpers over those collections. Data is lost on reload and dashboard actions update local component state rather than persisted records.

## Entity inventory

| Entity | Source | Key fields and relationships |
| --- | --- | --- |
| `Patient` | `src/data/types.ts:10` | `id`, MRN, demographics, conditions, allergies, department, risk; referenced by appointments, vitals, tasks, labs, prescriptions, invoices, discharge summaries, diet, and problem summaries |
| `Appointment` | `src/data/types.ts:32` | `patientId`, doctor, department, date/time, type, status, source, reason |
| `Vitals` | `src/data/types.ts:42` | `patientId`, recorded metadata, blood pressure, heart rate, temperature, SpO2, weight, severity |
| `Task` | `src/data/types.ts:54` | `patientId`, assigning/assigned users, kind, due date, status, severity |
| `LabTest` | `src/data/types.ts:69` | `patientId`, test/category, price, lifecycle status, result, upload/new flags |
| `Prescription` | `src/data/types.ts:83` | `patientId`, doctor, refills, notes, nested `Medicine[]` |
| `InventoryItem` | `src/data/types.ts:94` | stock, reorder threshold, expiry, price; medicine lookup is name-based |
| `Invoice` | `src/data/types.ts:104` | `patientId`, amount, payment status, issued date, method |
| `DischargeSummary` | `src/data/types.ts:113` | `patientId`, admission/discharge dates, diagnosis, workflow status, completedBy |
| `User` | `src/data/types.ts:121` | role, email, access status, last activity |
| `AuditEvent` | `src/data/types.ts:131` | actor/role, action, target, timestamp, severity |
| `Notification` | `src/data/types.ts:141` | title/body, timestamp, severity, read state |
| `DietPlan` | `src/data/types.ts:159` | `patientId`, goal, calorie target, restrictions, nested meal entries |
| `ProblemSummary` | `src/data/types.ts:171` | `patientId`, headline/issues, AI flag, approval, update time |

Additional read-only dashboard datasets include `GlucoseReading`, bookable test catalogue entries, and system configuration entries.

## Relationships

- `Patient 1:N Appointment`, `Vitals`, `Task`, `LabTest`, `Prescription`, `Invoice`, and `DischargeSummary`
- `Prescription 1:N Medicine`
- `Patient 1:1` current `DietPlan` in the demo
- `Patient 1:1` or absent `ProblemSummary`
- `User` is referenced by task assignment and audit actor text, but no foreign-key enforcement exists

## Key entities

1. **Patient:** shared clinical record and lookup root for nearly every dashboard.
2. **Appointment:** scheduled care encounter and reception patient-flow input.
3. **Prescription:** doctor-issued medicine plan consumed by pharmacy and patient views.
4. **LabTest:** diagnostic order and report lifecycle shared by laboratory, doctor, and patient views.
5. **Task:** delegated operational work shared by doctor and staff views.
6. **Invoice:** billing record consumed by reception, pharmacy context, and admin metrics.
7. **User:** role/access directory managed by the admin view.
8. **DischargeSummary:** staff verification and doctor/reception coordination record.

