# Architecture Index

This index is a navigation aid for implementation work. **This index is not the full contract. Do not implement from this file alone; follow the artifact paths below.**

## Global artifacts

- `unit_graph.yaml` — all route units, source anchors, signatures, dependencies, and shared-reference subset whitelists. Filter by assigned `name`.
- `wire_contracts.yaml` — frozen browser-route and form contracts. Filter by `unit`.
- `shared_modules.yaml` — shared code registry and allowed fields. Filter by `used_by_units`.
- `cross_unit_state.yaml` — implicit state flows; currently empty because no paired cross-unit state writes/read were found.
- `project-structure.md` — functional areas, layers, entrypoints, and project classification.
- `tech-stack.md` — existing frameworks, versions, configuration, and runtime constraints.
- `data-model.md` — synthetic in-memory entities and relationships.
- `units/<unit>/unit_decomposition.yaml` — advisory split candidates only; `commit: false`.

No `migration_boundary.yaml` or `seams.yaml` is emitted: this was an analysis-only request with no target rewrite, user-declared cut point, or inferred partial-migration bridge.

## Implementation Guide

Every worker must read `unit_graph.yaml`, `wire_contracts.yaml`, `shared_modules.yaml`, and the assigned unit's three files before changing code. Filter shared-module rows by `used_by_units`, wire rows by `unit`, and cross-unit rows by writer/reader when flows are added.

### Unit: landing

- external trigger: page `GET /`
- read `units/landing/behavior.yaml` for navigation, scroll, and motion behavior.
- read `units/landing/bindings.yaml` for route and browser event wiring.
- read `units/landing/unit_decomposition.yaml` only for advisory split candidates.
- completion evidence: list artifacts read, preserved landing interactions, unresolved contracts, and build/typecheck evidence.

### Unit: get_started

- external trigger: page `GET /get-started`
- read `units/get_started/behavior.yaml`, `units/get_started/bindings.yaml`, and `units/get_started/unit_decomposition.yaml`.
- filter shared modules for `used_by_units: get_started`.
- completion evidence: same artifact/read and verification report.

### Unit: login

- external trigger: page/form `GET /login` and sign-in submission
- read `units/login/behavior.yaml`, `units/login/bindings.yaml`, and `units/login/unit_decomposition.yaml`.
- filter wire contracts by `unit: login` and shared modules by `used_by_units`.
- completion evidence: preserve validation, demo-account mapping, fallback, and verification evidence.

### Unit: signup

- external trigger: page/form `GET /signup` and account submission
- read `units/signup/behavior.yaml`, `units/signup/bindings.yaml`, and `units/signup/unit_decomposition.yaml`.
- filter wire contracts and shared modules by `unit`/`used_by_units`.
- completion evidence: preserve role selection, password mismatch branch, and verification evidence.

### Unit: patient_dashboard

- external trigger: page `GET /patient`
- read `units/patient_dashboard/behavior.yaml`, `units/patient_dashboard/bindings.yaml`, and `units/patient_dashboard/unit_decomposition.yaml`.
- filter shared modules by `used_by_units`; cross-unit state is currently empty.
- completion evidence: preserve patient overview, filters, symptom analysis, and local action states plus verification evidence.

### Unit: doctor_dashboard

- external trigger: page `GET /doctor`
- read `units/doctor_dashboard/behavior.yaml`, `units/doctor_dashboard/bindings.yaml`, and `units/doctor_dashboard/unit_decomposition.yaml`.
- filter wire and shared rows by unit membership.
- completion evidence: preserve urgency sorting, approval, delegation, note, and verification evidence.

### Unit: staff_dashboard

- external trigger: page `GET /staff`
- read `units/staff_dashboard/behavior.yaml`, `units/staff_dashboard/bindings.yaml`, and `units/staff_dashboard/unit_decomposition.yaml`.
- filter shared rows by `used_by_units`.
- completion evidence: preserve task state transitions and verification evidence.

### Unit: laboratory_dashboard

- external trigger: page `GET /laboratory`
- read `units/laboratory_dashboard/behavior.yaml`, `units/laboratory_dashboard/bindings.yaml`, and `units/laboratory_dashboard/unit_decomposition.yaml`.
- filter wire/shared rows by unit membership.
- completion evidence: preserve status analytics, upload state, and verification evidence.

### Unit: pharmacy_dashboard

- external trigger: page `GET /pharmacy`
- read `units/pharmacy_dashboard/behavior.yaml`, `units/pharmacy_dashboard/bindings.yaml`, and `units/pharmacy_dashboard/unit_decomposition.yaml`.
- filter shared rows by `used_by_units`.
- completion evidence: preserve inventory thresholds, expiry handling, dispense/reorder, and verification evidence.

### Unit: reception_dashboard

- external trigger: page `GET /reception`
- read `units/reception_dashboard/behavior.yaml`, `units/reception_dashboard/bindings.yaml`, and `units/reception_dashboard/unit_decomposition.yaml`.
- filter shared rows by `used_by_units`.
- completion evidence: preserve time-based patient flow, appointment approval, payment, printing, and verification evidence.

### Unit: admin_panel

- external trigger: page `GET /admin`
- read `units/admin_panel/behavior.yaml`, `units/admin_panel/bindings.yaml`, and `units/admin_panel/unit_decomposition.yaml`.
- filter wire/shared rows by unit membership.
- completion evidence: preserve role filtering, access-save feedback, metrics, and verification evidence.

