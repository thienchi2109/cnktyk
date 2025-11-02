# Implementation Tasks: Add DonVi Activities Access

## 1. Database & Schema
- [x] Create migration `2025-11-02_add_donvi_scope_to_danh_muc_hoat_dong.sql` adding unit ownership, provenance, and soft-delete columns with indexes.
- [x] Backfill legacy rows (`MaDonVi = NULL`, provenance defaults, `DaXoaMem = false`) and verify rollback drops columns cleanly.
- [x] Update Zod schemas (`CreateDanhMucHoatDongSchema`, `UpdateDanhMucHoatDongSchema`) to reflect new fields, forbid DonVi overriding `MaDonVi`, and surface `DaXoaMem` only via server logic.

## 2. Repository & Service Layer
- [ ] Implement `findGlobal`, `findByUnit`, `findAccessible`, `assertCanMutate`, `softDelete`, and `restore` helpers in `DanhMucHoatDongRepository` with unit isolation.
- [ ] Wire audit logging for create/update/adopt/soft-delete/restore paths in the repository layer.
- [ ] Add Vitest coverage for repository queries, adoption guardrails, and soft-delete lifecycle.

## 3. API Layer
- [ ] Update `GET /api/activities` to return scoped payload with permissions map and exclude soft-deleted records by default.
- [ ] Allow DonVi POST/PUT/DELETE with automatic unit assignment and scope validation; enable SoYTe adoption and cross-unit reassignment.
- [ ] Add soft-delete (`DELETE`) and restore (`POST /api/activities/:id/restore`) endpoints, ensuring audit events and permission denials are logged.
- [ ] Extend API tests to cover DonVi, SoYTe, and unauthorized access patterns, including adoption and restore scenarios.

## 4. Frontend
- [ ] Refactor Activities page to consume scoped payload, render tabs (global, unit, soft-deleted for SoYTe), and display scope badges.
- [ ] Update `ActivitiesList` actions for permission-aware create/edit/delete/adopt/restore flows with confirmation dialogs.
- [ ] Update `ActivityForm` to hide scope controls for DonVi, expose adopt-to-global options for SoYTe, and display soft-delete warnings.
- [ ] Add Playwright coverage for DonVi CRUD (within unit) and SoYTe adoption/restore flows.

## 5. Docs & Telemetry
- [ ] Update `docs/add-donvi-activities-access.md` and unit admin guides with adoption and soft-delete procedures.
- [ ] Document SoYTe operations runbook for periodic hard delete of soft-deleted entries.
- [ ] Emit metrics (`activities.catalog.*`) and ensure dashboards capture adoption/soft-delete trends.

## 6. Rollout
- [ ] Smoke test staging with sample SoYTe and DonVi accounts, verifying adoption and soft-delete restore flows.
- [ ] Coordinate production deployment without feature flag; monitor logs and metrics post release.
- [ ] After acceptance, archive change and reference new spec in `openspec/specs/activity-submission/spec.md` updates.
