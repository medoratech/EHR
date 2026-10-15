# Project Structure

## Classification

- **Project type:** frontend SPA prototype
- **Runtime entrypoint:** `src/main.tsx`
- **Routing:** React Router 7 inside `src/App.tsx`
- **Persistence:** none; synthetic records are held in memory in `src/data/mock.ts`
- **Deployable boundary:** one Vite-built browser application

## Top-level breakdown

| Area | Files | Responsibility |
| --- | ---: | --- |
| `src/pages` | 11 | Marketing, authentication, and seven role dashboards |
| `src/components/layout` | 4 | App shell, authentication shell, navigation, role/demo configuration |
| `src/components/ui` | 5 | Cards, metrics, status controls, tables, charts, illustrations, motion |
| `src/data` | 3 | Domain types, synthetic records, data-access/query seam |
| `src/lib` | 2 | Formatting and parallax behavior |
| `src` root | 2 | React bootstrap and route composition |

The repository contains 25 TypeScript/TSX source files under `src`, plus `index.html`, Vite configuration, TypeScript project configuration, and CSS-first Tailwind theme definitions.

## Layers

1. **Bootstrap and routing:** `src/main.tsx`, `src/App.tsx`
2. **Page/presentation layer:** `src/pages/*.tsx`
3. **Application shell and navigation:** `src/components/layout`
4. **Reusable presentation primitives:** `src/components/ui`
5. **Data access and domain model:** `src/data/api.ts`, `src/data/mock.ts`, `src/data/types.ts`
6. **Cross-cutting utilities:** `src/lib/format.ts`, `src/lib/parallax.ts`

## Entry points and routes

| Route | Entry component | Area |
| --- | --- | --- |
| `/` | `Landing` | Marketing landing page |
| `/get-started` | `GetStarted` | Onboarding choice |
| `/login` | `Login` | Demo sign-in |
| `/signup` | `SignUp` | Demo account creation |
| `/patient` | `PatientDashboard` | Patient self-service |
| `/doctor` | `DoctorDashboard` | Clinical work queue |
| `/staff` | `StaffDashboard` | Ward task and vitals workflow |
| `/laboratory` | `LaboratoryDashboard` | Diagnostics workflow |
| `/pharmacy` | `PharmacyDashboard` | Medication and inventory workflow |
| `/reception` | `ReceptionistDashboard` | Appointments and billing |
| `/admin` | `AdminPanel` | Administration and audit |
| other | `Navigate` | Redirect to `/` |

`AppShell` wraps the seven dashboard routes. There is no route guard or authentication state; the login form maps known demo emails to dashboard URLs and otherwise defaults to `/patient`.

## Functional areas

- Marketing and product discovery
- Onboarding and demo authentication
- Patient health overview, appointments, reports, prescriptions, notifications, glucose, and diet
- Doctor patient triage, AI-summary approval, report review, and task delegation
- Staff task execution, vitals visibility, and discharge verification
- Laboratory test analytics, report upload state, patient history, and catalogue
- Pharmacy inventory, reorder, dispensing, refills, and invoice context
- Reception patient flow, appointment approval, billing, printing, and discharge coordination
- Administration user access, configuration, data oversight, charts, and audit events

## Configuration and assets

- `package.json` defines Vite, React, TypeScript, Tailwind, lint, build, and preview commands.
- `vite.config.ts` registers the React and Tailwind Vite plugins.
- `tsconfig.app.json` enables strict unused checks, bundler resolution, JSX transform, and ES2023 browser libraries.
- `index.html` defines the browser mount point, metadata, favicon, Google Fonts preload, and `src/main.tsx` module.
- `src/index.css` defines the Tailwind theme, Medora palette, semantic status colors, typography, accessibility focus treatment, responsive utilities, and reduced-motion behavior.
- `public/` contains the favicon, SVG icon collection, and a screenshot asset.

