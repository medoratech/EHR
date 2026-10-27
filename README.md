# Medora EHR

> **Better Care. Together.** — One shared patient record, seven focused workspaces.

Medora EHR is a unified electronic health record that connects **patients, clinicians, staff,
laboratories, pharmacy, reception and administration** through a single interface. Every role
gets a purpose-built dashboard over the same patient record, so context follows the patient
across the hospital instead of living in silos.

The repository holds two applications:

| Part | Location | Stack |
| ---- | -------- | ----- |
| **Web app** | `src/` | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7 |
| **API** | `server/` | Node 22, Fastify 5, Prisma 6, PostgreSQL 17, zod, argon2, JWT |

All records are synthetic. Demo deployments seed a deterministic dataset (Ghanaian names,
`+233` numbers) and can be reset from the UI.

---

## Contents

- [Getting started](#getting-started)
- [Architecture](#architecture)
- [Portals & routes](#portals--routes)
- [Authentication & access control](#authentication--access-control)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Live updates](#live-updates)
- [Clinical clock](#clinical-clock)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Testing & quality](#testing--quality)
- [Configuration](#configuration)
- [Deploying](#deploying)
- [Known limitations](#known-limitations)

---

## Getting started

**Requirements:** Node.js 22.9+, npm, Docker (for PostgreSQL).

```bash
npm install && npm --prefix server install   # dependencies for both apps
npm run db:up                                # PostgreSQL 17 on localhost:5433
cp server/.env.example server/.env           # then set JWT_SECRET (openssl rand -base64 48)
npm --prefix server run db:deploy            # apply migrations
npm --prefix server run db:seed              # load the demo dataset
npm run dev:api                              # API on http://127.0.0.1:4000
npm run dev                                  # web app on http://localhost:5173 (proxies /api)
```

The Compose database listens on **5433** so it does not clash with a local PostgreSQL on 5432.
The container also creates `medora_test` for the API test suite.

### Demo accounts

With `DEMO_MODE=true` the login page lists these accounts as click-to-fill chips. The password
for all of them is **`medora`**.

| Role | Name | Email |
| ---- | ---- | ----- |
| Doctor | Dr. Adjoa Mensah | `doctor@medora.health` |
| Staff | Nurse Grace Owusu | `staff@medora.health` |
| Laboratory | Lab Tech Irene Quaye | `lab@medora.health` |
| Pharmacy | Pharmacy Tech Leo Amoah | `pharmacy@medora.health` |
| Reception | Reception Sena Aidoo | `reception@medora.health` |
| Admin | Nana Adjei | `admin@medora.health` |
| Patient | Amara Osei (chart `P-1001`) | `patient@medora.health` |

Other seeded staff (for example `k.amankwah@medora.health` or `p.ofori@medora.health`) use the
same password. `k.bediako@` is suspended and `i.saleh@` is an invite that has not been accepted,
so neither can sign in.

### Scripts

| Root script | Purpose |
| ----------- | ------- |
| `npm run dev` / `build` / `preview` | Web app dev server, production build, preview |
| `npm run dev:api` | API with reload (`server/`) |
| `npm run db:up` | Start PostgreSQL in Docker |
| `npm run lint` / `typecheck` | Web app checks |
| `npm test` | Web app smoke tests |
| `npm run test:api` | API integration tests (needs the database) |

| `server/` script | Purpose |
| ---------------- | ------- |
| `db:migrate` | Create and apply a migration during development |
| `db:deploy` | Apply pending migrations (CI / production) |
| `db:seed` | Replace all records with the demo dataset |
| `db:reset` | Drop, re-migrate and re-seed |
| `create-admin` | Create the first administrator on a non-demo database |
| `build` / `start` | Bundle to `dist/` and run it |
| `typecheck` / `test` | Strict TypeScript check; Vitest suite |

---

## Architecture

```
Browser (React SPA)                         API (Fastify)                    PostgreSQL
──────────────────                          ─────────────                    ──────────
AuthProvider ── /api/auth/* ──────────────▶ auth routes ─┐
  access token in memory                    (argon2, JWT, │
  refresh token = httpOnly cookie            rotation)    │
EhrProvider ─── GET /api/<collection> ────▶ resource routes ── Prisma ───▶ tables + CHECKs
  role-filtered collections                  zod validation   (one tx per   append-only audit
  actions → POST/PATCH/PUT                   RBAC + scoping    write, with  trigger
  live feed ◀── GET /api/events (SSE) ◀──── change bus         audit + notifications)
```

- **`src/lib/http.ts`** is the API client. It attaches the bearer token, refreshes once on a
  401, and turns error responses into `ApiError` with the server's message.
- **`src/state/auth.tsx`** restores the session on load, syncs the clinical clock and exposes
  `login`, `logout`, `register` and `setPassword`.
- **`src/state/ehrStore.tsx`** loads every collection the signed-in role may read. It exposes
  each write as an action (`bookAppointment`, `releaseLabReport`, `payInvoice` and so on) and
  refetches when the live feed reports a change. If the API refuses an action, the store shows
  the reason as a toast and resolves the action to `null`.
- **`src/data/api.ts`** holds pure helpers (`latestVitals`, `dailyVolume`, `countBy` and so on).
  Pages never import data directly.
- **`server/src/routes/*`** has one module per area. Every write runs in one transaction that
  also records an audit event and notifies the affected users.

---

## Portals & routes

Public routes: `/` (landing), `/get-started`, `/login`, `/signup`, and `/set-password?token=…`
(the invite link).

Workspace routes require sign-in, and each role can only open its own portal (`RequireAuth`).
Administrators can also open every staff portal, but the API still enforces each role's
write rights there.

| Route | Portal | Who may open it | Views (`?view=`) |
| ----- | ------ | --------------- | ---------------- |
| `/patient` | Patient | patient | health · appointments · reports · medicines |
| `/doctor` | Clinician | doctor, admin | overview · patients · reports · tasks |
| `/staff` | Staff | staff, admin | workspace · tasks · vitals · discharges |
| `/laboratory` | Laboratory | lab, admin | overview · queue · reports · catalogue |
| `/pharmacy` | Pharmacy | pharmacy, admin | overview · inventory · prescriptions · refills |
| `/reception` | Reception | receptionist, admin | overview · appointments · billing · discharges |
| `/admin` | Admin | admin | overview · access · oversight · audit |

What each portal can now do against the API:

| Portal | Actions |
| ------ | ------- |
| Patient | Run an OLDCARTS symptom check, read health tips chosen for their conditions, request or cancel appointments, book catalogue lab tests, share external reports, order prescribed medicines, pay invoices, read notifications |
| Doctor | Review symptom checks (urgent and unreviewed first), register patients, delegate and reassign tasks, send completed tasks back, approve or edit problem summaries, mark lab reports reviewed, save clinical notes, manage the health tip library (API) |
| Staff | Start or complete their own tasks, record vitals (severity is classified on the server), edit and verify discharge summaries |
| Laboratory | Advance tests through booked → sample-collected → processing, release results |
| Pharmacy | Dispense medicines, raise stock reorders, send refill reminders, generate invoices |
| Reception | Register walk-ins straight into today's queue, approve and check out appointments, record payments |
| Admin | Invite staff (one-time setup link), approve, suspend or reactivate accounts, edit clinic settings and departments, read the audit trail |

---

## Authentication & access control

- **Passwords** are hashed with argon2id. An unknown email takes as long to reject as a wrong
  password, and both return the same message.
- **Lockout:** five failed attempts lock the account for 15 minutes. Every failure is audited,
  and from the third onwards it is flagged critical.
- **Sessions:** a 15-minute HS256 access token is kept only in memory. The refresh token is
  opaque, stored as a SHA-256 hash in the database, and sent in an `httpOnly`, `SameSite=Strict`
  cookie scoped to `/api/auth`. "Keep me signed in" makes the cookie last 30 days; otherwise it
  is a browser-session cookie with a 12-hour server limit.
- **Rotation and reuse detection:** every refresh issues a new token. A rotated token still works
  for 30 seconds, so parallel tabs don't sign each other out. After that, presenting it again
  revokes every session for that user and records a critical audit event.
- **Live revocation:** each request re-reads the user, so a suspension or role change applies
  immediately, and both also revoke refresh tokens.
- **Registration:** patients who sign up get a new chart (`P-…`, `MRN-…`) and are signed in.
  Staff sign-ups are created as `invited` and cannot sign in until an admin approves them.
- **Invites:** when an admin invites someone, the API returns a 72-hour one-time
  `/set-password` link for the admin to share.
- **Authorisation:** all of it happens on the server. Patients only ever see their own chart in
  any collection. Each write checks the caller's role (for example, only lab staff release
  reports, only a nurse verifies a discharge and only a doctor approves one, and only a doctor
  reassigns tasks). Status changes follow the transition tables in `server/src/domain.ts`.

---

## API reference

Every route is under `/api`. Errors look like `{ "error": { "code", "message", "issues?" } }`.
Everything except `system/*`, `healthz` and `auth/*` needs `Authorization: Bearer <token>`.

| Area | Endpoints |
| ---- | --------- |
| System | `GET healthz` · `GET system/info` (demo mode, clock, demo accounts) · `GET system/settings` · `PUT system/settings/:key` |
| Clinic | `GET clinic` (public: settings and departments) · `PUT clinic` · `POST departments` · `PATCH departments/:name` (`active`, `rename`) — admin only |
| Auth | `POST auth/login` · `POST auth/refresh` · `POST auth/logout` · `POST auth/register` · `POST auth/set-password` · `GET auth/me` |
| Patients | `GET/POST patients` · `GET/PATCH patients/:id` · `POST walk-ins` |
| Clinical | `GET problem-summaries` · `PUT problem-summaries/:patientId` · `POST problem-summaries/:patientId/approve` · `GET/POST clinical-notes` · `GET diet-plans` · `PUT diet-plans/:patientId` · `GET/POST glucose-readings` |
| Scheduling | `GET/POST appointments` · `PATCH appointments/:id` |
| Ward | `GET/POST vitals` · `GET/POST tasks` · `PATCH tasks/:id` · `GET/POST discharge-summaries` · `PATCH discharge-summaries/:id` |
| Laboratory | `GET/POST lab-tests` · `POST lab-tests/uploads` · `PATCH lab-tests/:id` · `POST lab-tests/:id/release` · `POST lab-tests/:id/acknowledge` · `GET/POST lab-catalogue` · `PATCH lab-catalogue/:id` |
| Pharmacy | `GET/POST prescriptions` · `POST prescriptions/:id/medicines/:medicineId/order` · `…/dispense` · `POST prescriptions/:id/refill-reminder` · `GET/POST inventory` · `PATCH inventory/:id` · `POST inventory/:id/reorder` |
| Billing | `GET/POST invoices` · `PATCH invoices/:id` |
| Admin | `GET/POST users` · `PATCH users/:id` · `POST users/:id/setup-link` · `GET audit-events` |
| Symptom checks | `POST triage-assessments` (OLDCARTS answers) · `GET triage-assessments` · `POST triage-assessments/:id/review` (doctor) |
| Health tips | `GET health-tips` (for a patient; staff pass `?patientId=`) · `GET health-tips/library` · `POST health-tips` · `PATCH health-tips/:id` (doctor, admin) |
| Me | `GET notifications` · `POST notifications/:id/read` · `POST notifications/read-all` · `GET events` (SSE) |
| Demo | `POST demo/reset` (only when `DEMO_MODE=true`) |

---

## Data model

The schema lives in `server/prisma/schema.prisma`, and migrations in `server/prisma/migrations/`.
The main tables are Patient, User, Appointment, Vitals, Task, LabTest, LabCatalogueItem,
Prescription and Medicine, InventoryItem, Invoice, DischargeSummary, ProblemSummary,
ClinicalNote, DietPlan, GlucoseReading, AuditEvent, Notification and SystemSetting. Supporting
tables are RefreshToken, SetupToken and Counter.

- **IDs are readable and sequential** (`P-1009`, `INV-4477`, `MRN-48209`). They come from the
  `Counter` table, incremented atomically inside each write's transaction.
- **Enumerated columns** (roles, statuses, kinds, severities) are checked by zod at the API
  boundary and by PostgreSQL `CHECK` constraints. Both are built from `server/src/domain.ts`.
- **Clinic reference data is stored in the database, not in code.** The `Department` table
  is referenced by patients and appointments through foreign keys, and renames cascade. The
  single-row `Clinic` table holds the clinic name, currency, locale, time zone, bookable
  appointment times, accepted payment methods and the label for unassigned bookings. Admins
  edit both on the Admin overview. Closed departments keep their history but accept no new
  patients or bookings. Patient self-bookings must use a configured time, and payments must use
  a configured method.
- **The audit trail is append-only.** A trigger rejects any `UPDATE` or `DELETE`. The only
  exception is the foreign key clearing `actorId` when a user is deleted.
- **Money** is stored as `numeric` and returned as a number. Dates without a time are returned
  as `YYYY-MM-DD`, and timestamps as ISO-8601.
- **Seed data** (`server/src/seed/data.ts`) is built relative to the clinical clock, so "today"
  always has a full queue.

---

## Symptom checks (OLDCARTS triage)

The patient answers a guided history: **O**nset, **L**ocation, **D**uration, **C**haracter,
**A**ggravating and relieving factors, **R**adiation, **T**iming, **S**everity (0–10), plus other
symptoms. The API then works in three layers (`server/src/triage/`):

1. **Safety rules (`rules.ts`), always run.** A deterministic red-flag screen covers chest pain
   with breathlessness or spread, severe breathing difficulty, stroke signs, thunderclap
   headache, collapse or seizure, heavy bleeding, suicidal thoughts, anaphylaxis, fever with
   stiff neck, bleeding in pregnancy, very high severity, recent critical vitals, and fever in
   infants. Patterns match whole words and ignore negated mentions ("no chest pain"). The
   result is a **floor**: the model can raise the urgency but never lower it.
2. **LLM assessment: Gemini by default (`gemini.ts`), or Claude (`claude.ts`) with
   `TRIAGE_PROVIDER=claude`.** One request with a JSON-schema-constrained response, using the
   same prompt and schema for both providers (`prompt.ts`). It returns urgency (emergency,
   urgent, soon, routine, self-care), one department from the clinic's open departments, a
   clinician-facing OLDCARTS summary, things to rule out, red flags, and plain-language advice.
   The output is validated against a zod schema. Blocked, truncated or refused responses count
   as failures. The model receives age, sex, conditions, allergies and latest vitals, and
   **never names, MRNs or phone numbers**. The patient's answers are passed as delimited data,
   not instructions.
3. **Fallback.** If the model is disabled, unconfigured, refuses or fails, the check still
   completes on the safety rules alone, with urgency never below "routine", and is marked
   "safety rules only".

Emergency and rule-escalated results always show the clinic's emergency number (a clinic
setting) with a call button. Emergency and urgent checks notify doctors. Patients never see the
clinician summary or the "rule out" list. Each check is saved, audited, and can be marked
reviewed by a doctor, which the patient sees live.

Configure it with `TRIAGE_AI` and `TRIAGE_PROVIDER` (`gemini` or `claude`). For Gemini, set
`GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `GEMINI_MODEL` (default `gemini-flash-latest`) and,
optionally, `GEMINI_THINKING_LEVEL`. For Claude, set `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` and
`CLAUDE_EFFORT`. The endpoint is rate-limited to 10 checks per
minute per client. Tests replace the model with a fake (`setTriageModel`) and never call the
network.

## Health tips

Tips are a curated library in the `HealthTip` table. Each tip lists condition terms (for
example `diabetes`, `hypertension`, `copd`) that are matched as whole words against the
conditions on the patient's record. A patient sees up to five tips, taking matched conditions
in turn so each of their conditions is covered, then general advice. Each tip shows which
condition it was chosen for. Doctors and admins manage the library through the API. Tips are
written content and are not generated by a model.

---

## Live updates

`GET /api/events` is a server-sent event stream. Each `change` event lists the collections that
changed, never the records themselves, and the browser refetches only those it is allowed to
read. The client connects with `fetch` so the token goes in a header, and it reconnects with
backoff. The patient context bar shows **Live sync** or **Reconnecting…**.

The change bus runs inside the API process. Running more than one API instance would need a
shared bus, for example PostgreSQL `LISTEN/NOTIFY`.

---

## Clinical clock

With `CLOCK_START_AT=2026-10-16T09:00:00Z`, the API clock starts at that instant when the
process boots and then runs in real time. The browser syncs to it from `/api/system/info`
(`src/lib/clock.ts`). This keeps seeded queues, greetings and expiry countdowns consistent in
demos. Remove the variable to use real time. Calendar days ("today") and wall times are
reckoned in the clinic's configured time zone (`Africa/Accra` in the seed), on both the server
and the browser.

---

## Design system

Styling is **Tailwind CSS v4, configured in CSS** via the `@theme` block in
[`src/index.css`](src/index.css). There is no `tailwind.config.js`.

### Brand palette

| Token | Value | Use |
| ----- | ----- | --- |
| `--color-primary` | `#1a9b84` | Primary teal |
| `--color-primary-dark` | `#0f6b5b` | Dark teal |
| `--color-primary-light` | `#1a9b8414` | Translucent tint |
| `--color-accent` | `#3bae9b` | Accent teal |
| `--color-accent-light` | `#3bae9b1f` | Translucent tint |
| `--color-accent-dark` | `#2d8b7a` | Accent, darker |

The app-wide teal ramp is authored under the **`cyan-*`** scale (so existing utility classes pick
it up automatically):

| Shade | `cyan-50` | `cyan-100` | `cyan-200` | `cyan-300` | `cyan-400` | `cyan-500` | `cyan-600` | `cyan-700` | `cyan-800` | `cyan-900` | `cyan-950` |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hex | `#edfaf6` | `#d3f2ea` | `#abe6da` | `#7bd5c5` | `#4ec1ae` | `#3bae9b` | `#1a9b84` | `#147a68` | `#0f6b5b` | `#0b5044` | `#073a31` |

Semantic status colours are reserved for clinical meaning and are **not** part of the brand
ramp: `status-normal` `#059669`, `status-abnormal` `#d97706`, `status-critical` `#dc2626`
(mirrored by `emerald` / `amber` / `red` utilities in status pills).

### Other tokens

- **Typography** — `Figtree` (loaded from Google Fonts) as `--font-sans`, with tightened
  letter spacing and tuned line heights.
- **Radii** — `--radius-xs` … `--radius-2xl` plus `--radius-card`.
- **Shadows** — `--shadow-xs` … `--shadow-xl` and the `card-shadow` utility, all tinted with the
  brand dark green.
- **Motion** — easing (`--ease-out-soft`, `--ease-spring`, …) and duration tokens, plus a
  one-shot `reveal` entrance animation.

### Utilities & components

- **Utilities** (`src/index.css`): `app-canvas`, `patient-context`, `card-shadow`, `lift`,
  `tabular`, `skip-link`, `reveal`, and per-portal accent classes
  (`portal-patient`, `portal-clinical`, `portal-operations`, `portal-diagnostics`,
  `portal-pharmacy`, `portal-admin`).
- **Primitives** (`components/ui/primitives.tsx`): `Card`, `CardHeader`, `PageHeader`,
  `StatusPill`, `Badge`, `Avatar`, `MetricTile`, `ProgressBar`, `EmptyState`, `Button`.
- **Charts** (`components/ui/Chart.tsx`): `BarChart` (vertical/horizontal), `PieChart`
  (interactive SVG donut) and `LineChart` (area line with hover points) — no chart library.
- **Tables** (`components/ui/Table.tsx`): `DataTable<T>` with a responsive card fallback.
- **Layout**: `AppShell` (deep-teal sidebar, sticky header, global search, notifications and a
  portal switcher), `AuthLayout`, `PatientContextBar`, `FocusedPortalView`, `DemoWorkspace`.

---

## Accessibility

Built to WCAG-AAA-oriented targets:

- Skip links to main content / form on every layout.
- Visible `:focus-visible` rings (brand teal) and 44px minimum touch targets.
- Status is **never colour-only** — severity pills always carry a text label.
- Clinical tables switch to a stacked definition-list layout below 768px.
- Mobile navigation is a `role="dialog"` drawer with focus trapping, `Escape` to close and
  focus restoration; modals also close on `Escape` and backdrop click.
- `prefers-reduced-motion` disables animations, transitions, smooth scrolling and parallax.
- Verified at 375px, 768px, 1024px and 1440px.

---

## Testing & quality

- **API integration tests** (`server/test/`, Vitest, 41 tests) run against the real
  `medora_test` database, which is reset before every test. They cover sign-in, lockout,
  refresh rotation and reuse detection, logout, suspension, registration, invites, patient
  isolation, the role matrix, status transitions, server-side vitals classification, the
  audit trail (including the database trigger and CHECK constraints) and demo reset.
  Run `npm run test:api`.
- **Web app smoke tests** (`tests/demo-smoke.test.mjs`) check the API wiring, that pages no
  longer read seed data directly, and the clock sync. Run `npm test`.
- **Strict TypeScript** in both apps (`npm run typecheck`, `npm --prefix server run typecheck`)
  and ESLint for the web app.

---

## Configuration

API settings come from environment variables, validated at startup by `server/src/config.ts`.
See `server/.env.example`.

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | At least 32 characters; signs access tokens |
| `HOST` / `PORT` | `127.0.0.1` / `4000` | Listen address |
| `ACCESS_TOKEN_TTL` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Lifetime of "keep me signed in" sessions |
| `SESSION_TTL_HOURS` | `12` | Lifetime of browser-session sign-ins |
| `CORS_ORIGIN` | empty | Comma-separated origins, only needed when the SPA is on another origin |
| `COOKIE_SECURE` | `true` in production | Marks cookies `Secure` |
| `DEMO_MODE` | `false` | Shows demo accounts and enables `POST /demo/reset` |
| `CLOCK_START_AT` | unset | Pins the clinical clock's starting instant |
| `LOG_LEVEL` | `info` | Pino log level. Authorization headers and cookies are redacted. |

The web app reads `VITE_API_URL` (optional) to call an API on another origin. By default it
calls `/api` on its own origin. Vite proxies `/api` to `:4000` for both `dev` and `preview`.

---

## Deploying

1. Provision PostgreSQL and set `DATABASE_URL`, a strong `JWT_SECRET` and `NODE_ENV=production`.
2. `npm --prefix server ci && npm --prefix server run db:deploy && npm --prefix server run build`
3. Create the first administrator:
   `ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… npm --prefix server run create-admin`.
   The demo seed refuses to run against production unless `DEMO_MODE=true`.
4. Start the API with `npm --prefix server start`, behind TLS.
5. Build the SPA (`npm run build`) and serve `dist/` from the same origin, routing `/api` to
   the API. Otherwise set `VITE_API_URL` and `CORS_ORIGIN`.

---

## Known limitations

- **No file storage.** Report "uploads" record the file name and a summary; the file itself is
  not stored.
- **No email or SMS.** Invite links are shown to the admin to share, and "Forgot password" asks
  the user to contact an admin. Notifications are in-app only.
- **No payment gateway.** Paying an invoice records the method and marks it paid.
- **Dispensing does not change stock levels.** Pharmacists adjust stock with
  `PATCH /inventory/:id`.
- **No doctor-to-patient assignment.** "My patients" lists every chart.
- **SSO and passkey buttons** are placeholders that explain they are not configured.
- **Symptom checks are decision support, not diagnosis.** The red-flag rules and the prompt
  need clinical sign-off and an evaluation set before real patients use them. Check your
  data-processing terms (for example a BAA or zero data retention) before sending patient
  context to the model in production.
- **No UI yet for managing the health tip library**; use the API.
- **Single API instance** for live updates and the cached clinic settings (see
  [Live updates](#live-updates)).
- **Audit:** `npm audit` reports a high-severity `deepmerge-ts` advisory in the Prisma 6 CLI's
  config loader. It is a development tool that only reads local config. The fix requires
  Prisma 7.

---

_Medora EHR — connected care, end to end._
