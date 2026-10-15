# Medora EHR

> **Better Care. Together.** — One shared patient record, seven focused workspaces.

Medora EHR is a unified electronic health record that connects **patients, clinicians, staff,
laboratories, pharmacy, reception and administration** through a single interface. Every role
gets a purpose-built dashboard over the same patient record, so context follows the patient
across the hospital instead of living in silos.

This repository is a **front-end prototype**: there is no backend and no database. All records
are synthetic and held **in memory** — reloading the page restores the seed data.

---

## Contents

- [Overview](#overview)
- [Feature highlights](#feature-highlights)
- [Portals & routes](#portals--routes)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Authentication & session](#authentication--session)
- [Project structure](#project-structure)
- [Data layer](#data-layer)
- [State & demo actions](#state--demo-actions)
- [Demo clock](#demo-clock)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Testing & quality](#testing--quality)
- [Configuration](#configuration)
- [Known limitations](#known-limitations)

---

## Overview

| Field | Value |
| ----- | ----- |
| **Product** | Medora EHR — unified hospital information system |
| **Type** | Front-end prototype (demo / pitch build) |
| **Data** | Synthetic, in-memory, deterministic |
| **Backend** | None |
| **Currency** | See [Known limitations](#known-limitations) |
| **Locale / context** | Ghanaian names, phone numbers and clinical scenarios (GH₵ intended) |

The experience is split into a small **public surface** (marketing landing, getting started,
sign in, sign up) and seven **role portals** behind a shared application shell.

---

## Feature highlights

- **One connected care experience** — patient context (demographics, risk, allergies, latest
  vitals) is pinned above every portal view via `PatientContextBar`.
- **Seven role-based portals** with dedicated navigation, KPIs, tables and charts.
- **Live, shared demo state** — actions taken in one portal (book a test, release a report,
  record vitals, take a payment, invite a user…) are reflected everywhere else instantly and
  appended to an audit trail.
- **Deterministic demo clock** so dates, "today" volumes and trends never look stale.
- **Full-page demo workspaces** — modals with validation for creating appointments, lab
  bookings, vitals, users, etc.
- **Accessible by default** — skip links, focus-visible rings, 44px touch targets, labelled
  controls and `prefers-reduced-motion` support.
- **Responsive** — clinical tables collapse to stacked cards below 768px; the sidebar becomes
  a focus-trapped mobile drawer.
- **Branded favicon + PWA manifest** — SVG heart-pulse mark, PNG fallbacks, Apple touch icon
  and a `site.webmanifest`.

---

### What each portal covers

| Portal | What it covers |
| ------ | -------------- |
| **Patient** | Symptom triage, appointments, reports, lab booking, prescriptions, notifications, diet plan and glucose trend |
| **Doctor** | Patient list, AI-assisted problem summaries, report review, task delegation, discharge sign-off |
| **Staff** | Task queue, vitals capture, discharge summaries, feedback loop |
| **Laboratory** | Test analytics, work queue, report uploads, patient history, bookable catalogue |
| **Pharmacy** | Inventory and expiry, prescription fulfilment, orders, refill reminders |
| **Reception** | Patient flow, appointment approval/check-in, billing and invoices, discharge coordination |
| **Admin** | User roles & access, data oversight, operational analytics, security audit log |

---

## Portals & routes

Public routes:

| Route | Page |
| ----- | ---- |
| `/` | Marketing landing page (hero, portal grid, ecosystem) |
| `/get-started` | Choose: create account or sign in |
| `/login` | Sign in with a demo account |
| `/signup` | Multi-field registration with role picker |

Authenticated workspace routes (rendered inside `AppShell`):

| Route | Portal | Accent | Views (sidebar sections) |
| ----- | ------ | ------ | ------------------------ |
| `/patient` | Patient portal | `patient` | My health · Appointments · Reports · Medicines |
| `/doctor` | Clinician portal | `clinical` | Clinical overview · My patients · Reports to review · Task delegation |
| `/staff` | Staff portal | `operations` | My workspace · Task queue · Vital updates · Discharges |
| `/laboratory` | Laboratory portal | `diagnostics` | Lab overview · Test queue · Report uploads · Test catalogue |
| `/pharmacy` | Pharmacy portal | `pharmacy` | Pharmacy overview · Inventory · Prescription queue · Refill reminders |
| `/reception` | Reception portal | `operations` | Front desk overview · Appointments · Billing · Discharges |
| `/admin` | Admin portal | `admin` | Admin overview · User access · Data oversight · Audit logs |

Each section is a **query-string view** (`?view=…`) handled by the page's own
`useSearchParams`. Nav items live in [`src/components/layout/nav.ts`](src/components/layout/nav.ts);
the header/sidebar render from that config, and a "Portals" switcher moves between workspaces.

> Routes are **not guarded** — for the demo any workspace is reachable directly by URL.

---

## Tech stack

| Concern | Choice |
| ------- | ------ |
| Build | [Vite 8](https://vite.dev) |
| UI | React 19 + TypeScript 6 |
| Styling | Tailwind CSS 4 (CSS-first `@theme`, no config file) |
| Routing | React Router 7 (`react-router`) |
| Icons | `lucide-react` |
| Lint | ESLint 10 (flat config) + typescript-eslint |
| Tests | Node's built-in `node:test` runner |

Runtime dependencies: `react`, `react-dom`, `react-router`, `lucide-react`,
`tailwindcss`, `@tailwindcss/vite`.
No UI component library and no state library — everything is hand-rolled.

---

## Getting started

**Requirements:** Node.js 20+ and npm.

```bash
npm install     # install dependencies
npm run dev     # start the dev server (http://localhost:5173)
```

Then open the printed URL, choose a portal, or sign in with a demo account.

### Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) then build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the project |
| `npm run typecheck` | Run `tsc -b` without emitting |
| `npm run test` | Run the smoke tests in `tests/` |

---

## Demo accounts

Sign in at `/login` with **any** listed email and the password **`medora`**. The login screen
lists the accounts as click-to-autofill chips.

| Role | Name | Email |
| ---- | ---- | ----- |
| Doctor | Dr. Adjoa Mensah | `doctor@medora.health` |
| Staff | Nurse Grace Owusu | `staff@medora.health` |
| Laboratory | Irene Quaye | `lab@medora.health` |
| Pharmacy | Kofi Boateng | `pharmacy@medora.health` |
| Reception | Yaa Asantewaa | `reception@medora.health` |
| Admin | Nana Adjei | `admin@medora.health` |
| Patient | Amara Osei | `patient@medora.health` |

The accounts are defined in [`src/components/layout/roles.ts`](src/components/layout/roles.ts).

---

## Authentication & session

Authentication is **demo-only** — there is no real auth, token or backend.

- Submitting the sign-in form checks the email against `demoAccounts` and requires the literal
  password `medora`.
- On success the chosen account is written to `sessionStorage` under `medora:demo-session` and
  the user is routed to the matching dashboard (`dashboardForEmail`).
- **Log out** clears that key and returns to the landing page.
- Registration (`/signup`) validates the form and routes to the selected role's dashboard but
  does not persist anything.
- SSO / passkey buttons are placeholders that raise a demo toast.

---

## Project structure

```
.
├─ public/                         Static assets served as-is
│  ├─ favicon.svg                  Primary SVG mark (teal heart-pulse)
│  ├─ favicon-16.png / favicon-32.png
│  ├─ apple-touch-icon.png         180×180 iOS home-screen icon
│  ├─ icon-192.png / icon-512.png  PWA icons
│  ├─ icon-maskable-512.png        Maskable PWA icon
│  └─ site.webmanifest             Web app manifest
├─ src/
│  ├─ main.tsx                     Entry: BrowserRouter + <App />
│  ├─ App.tsx                      Routes, DemoStoreProvider, demo toast
│  ├─ index.css                    Tailwind v4 @theme tokens + utilities
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ AppShell.tsx           Sidebar, header, search, notifications, drawer
│  │  │  ├─ AuthLayout.tsx         Split-screen auth shell + RoleSelector
│  │  │  ├─ nav.ts                 Portal + sidebar configuration
│  │  │  ├─ roles.ts               Role options and demo accounts
│  │  │  ├─ PatientContextBar.tsx  Shared patient context strip
│  │  │  └─ ScrollToTop.tsx        Resets scroll on route/view change
│  │  └─ ui/
│  │     ├─ primitives.tsx         Card, Button, Badge, StatusPill, MetricTile, …
│  │     ├─ Chart.tsx              BarChart, PieChart, LineChart (hand-built SVG)
│  │     ├─ Table.tsx              DataTable with responsive card fallback
│  │     ├─ DemoWorkspace.tsx      Modal workspace + WorkspaceField
│  │     ├─ FocusedPortalView.tsx  Generic section view for ?view= pages
│  │     ├─ Parallax.tsx           Parallax wrapper
│  │     └─ DoctorIllustration.tsx (unused — see Known limitations)
│  ├─ data/
│  │  ├─ types.ts                  Domain model (types & interfaces)
│  │  ├─ mock.ts                   Synthetic seed records + DEMO_NOW
│  │  └─ api.ts                    Read helpers / data-access seam
│  ├─ lib/
│  │  ├─ format.ts                 Currency, date and label formatters
│  │  ├─ demoClock.ts              Deterministic "now" helpers
│  │  ├─ demoActions.ts            Demo toast dispatcher
│  │  └─ parallax.ts               Scroll-linked parallax engine (rAF)
│  ├─ pages/                       Landing, GetStarted, Login, SignUp + 7 dashboards
│  └─ state/
│     ├─ demoStore.tsx             Provider holding mutable demo records
│     ├─ demoStoreContext.ts       Context + DemoStoreValue contract
│     └─ useDemoStore.ts           Consumer hook
├─ tests/demo-smoke.test.mjs       Smoke tests (structure + wiring)
├─ index.html                      App shell HTML + icon/manifest links
├─ vite.config.ts                  Vite + React + Tailwind plugins
├─ eslint.config.js                Flat ESLint config
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json
└─ package.json
```

---

## Data layer

Three files under `src/data/` describe and serve the demo data.

- **`types.ts`** — the domain model. Key entities:
  `Patient`, `Appointment`, `Vitals`, `Task`, `LabTest`, `Prescription`/`Medicine`,
  `InventoryItem`, `Invoice`, `DischargeSummary`, `User`, `AuditEvent`, `Notification`,
  `DietPlan`, `ProblemSummary`, `GlucoseReading`, plus shared unions
  (`Severity`, `Role`, `Department`, status unions).
- **`mock.ts`** — the synthetic dataset, generated relative to `DEMO_NOW`. Contains the patients,
  appointments (today + a generated 6-day history), vitals, tasks, lab tests, prescriptions,
  inventory, invoices, discharge summaries, users, audit events, notifications, problem
  summaries, diet plan and the bookable test catalogue. `CURRENT_PATIENT_ID = 'P-1001'`
  (Amara Osei) anchors the "my record" views.
- **`api.ts`** — the **data-access seam**. Every page imports read helpers from here
  (`getPatient`, `latestVitals`, `labsFor`, `appointmentsFor`, `dailyVolume`, `countBy`,
  derived collections such as `unpaidInvoices`, `newLabReports`, `revenueCollected`, …)
  rather than reaching into `mock.ts` directly.

> Replacing the mock with real HTTP calls is intended to be a **single-file change**
> (`api.ts`), plus the store's mutation methods.

---

## State & demo actions

Records that a user can change at runtime live in a React context, provided by
[`src/state/demoStore.tsx`](src/state/demoStore.tsx) and consumed via `useDemoStore()`.
The store deep-clones the seed data on init and exposes mutations that also emit a
**notification** and **audit event** on every action.

| Action | Effect |
| ------ | ------ |
| `addAppointment` / `updateAppointment` | Book or change appointment status |
| `addLabTest` / `releaseLabReport` | Book a test; release a completed report |
| `addVitals` | Record a new set of patient readings |
| `orderMedicine` | Mark a prescribed medicine as ordered |
| `updateInvoice` | Set invoice status/method (payments) |
| `updateTask` | Advance a care task |
| `addUser` / `updateUserStatus` | Invite staff or change access |
| `resetDemo` | Restore every record to the seed snapshot |

- **Reset demo data** is available in the sidebar footer and the profile menu.
- **Demo toasts** are raised by dispatching a `medora:demo-action` `CustomEvent` (see
  `lib/demoActions.ts`); `App.tsx` listens and shows a transient toast. Placeholder buttons use
  this so the UI feels responsive without a backend.

---

## Demo clock

The whole experience is pinned to a fixed instant so dates, "today" queues and trend charts are
deterministic and never look stale:

```ts
// src/data/mock.ts
export const DEMO_NOW = '2026-10-16T09:00:00.000Z'
```

`src/lib/demoClock.ts` exposes `demoNow()`, `demoNowIso()` and `demoDateKey(offsetDays)` built on
that constant. New records created through the store are stamped with the demo time, not the
wall clock.

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

- **Smoke tests** — [`tests/demo-smoke.test.mjs`](tests/demo-smoke.test.mjs) asserts that all
  seven dashboards exist, that each renders focused query views (`useSearchParams` +
  `FocusedPortalView`), that the shared store is wired into the app
  (`addAppointment`, `releaseLabReport`, `updateInvoice`), and that the deterministic demo clock
  is used. Run with `npm run test`.
- **Type safety** — strict project references; `npm run typecheck` runs `tsc -b`.
- **Lint** — `npm run lint` (ESLint flat config, `dist` ignored).
- `npm run build` runs the type-check before bundling, so a green build implies clean types.

---

## Configuration

- **`vite.config.ts`** — registers `@vitejs/plugin-react` and `@tailwindcss/vite`. No aliases or
  proxies; everything is relative imports.
- **`index.html`** — holds the app shell, the Google Fonts link, `theme-color` (`#1a9b84`), and
  the favicon / Apple touch icon / `site.webmanifest` links. Title: `Medora EHR`.
- **`tsconfig.json`** — project references to `tsconfig.app.json` (browser code, `target: es2023`)
  and `tsconfig.node.json`.
- **`eslint.config.js`** — flat config extending `@eslint/js`, `typescript-eslint`,
  `react-hooks` and `react-refresh`.
- **`.gitignore`** — ignores `node_modules`, `dist`, editor/OS files.

---

## Known limitations

- **No backend or persistence.** Data resets on reload; "Reset demo data" restores the seed.
- **No route protection.** Auth is cosmetic — any workspace URL is reachable.
- **Currency mismatch.** Money is rendered by `formatCurrency()` in
  [`src/lib/format.ts`](src/lib/format.ts), which currently formats as **Indian Rupees (`₹`,
  `en-IN`)** even though the rest of the demo (Ghanaian names, `+233` phone numbers) implies
  **GH₵**. Change the locale and symbol there to `en-GH` / `GH₵` to match the data.
- **Unused leftovers.** `src/components/ui/DoctorIllustration.tsx` is not imported anywhere, and
  `public/icons.svg` and `public/Screenshot 2026-10-13 023402.png` are unused template assets —
  safe to delete.
- **Some `src/data/api.ts` exports are no longer referenced** (e.g. `recordVolume`,
  `revenueCollected` variants) after screens were switched to read live store data.

---

_Medora EHR — a focused demo of connected care._
