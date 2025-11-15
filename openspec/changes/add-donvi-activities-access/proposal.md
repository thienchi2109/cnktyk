# Change Proposal: Add DonVi Activities Access

**Change ID:** `add-donvi-activities-access`  
**Type:** Feature Addition  
**Status:** Draft  
**Created:** 2025-11-02  
**Author:** AI Assistant (for review)

---

## Why

### Problem Statement
Only SoYTe administrators can curate the activities catalog today, forcing every unit-level activity to be routed centrally. DonVi users need to maintain local training catalogs for their practitioners while still consuming DoH curated global activities. Without unit scoping we risk accidental cross-unit edits and cannot audit who owns a catalog entry.

### Current State
- Middleware already allows both SoYTe and DonVi to visit `/activities`, but the UI (`src/components/activities/activities-list.tsx`) hides all action controls unless the user role is SoYTe.
- API routes (`src/app/api/activities/route.ts`, `src/app/api/activities/[id]/route.ts`) only authorize SoYTe and return unfiltered global lists; `DanhMucHoatDong` stores no unit ownership or provenance.
- There is no audit trail for catalog CRUD operations, and DonVi cannot distinguish unit scoped activities from global ones.

### Business Impact
- DonVi teams cannot respond quickly to unit training needs; SoYTe must handle every catalog edit.
- Missing ownership metadata blocks compliance audits that ask who created or modified an activity.
- Exposing the page without proper isolation would leak other units’ programs and open privilege-escalation bugs.

---

## What Changes

1. **Data Model & Migration**
   - Add nullable `MaDonVi` (FK `DonVi`), `NguoiTao`, `NguoiCapNhat`, `TaoLuc`, `CapNhatLuc`, `TrangThai`, and `DaXoaMem` columns to `DanhMucHoatDong`, with covering indexes on `(MaDonVi, HieuLucTu, HieuLucDen)` and `(MaDonVi, lower(TenDanhMuc))`.
   - Backfill legacy rows as global scope (`MaDonVi NULL`, `DaXoaMem = false`) and seed provenance fields via migration hooks.

2. **Repository & Service Layer**
   - Extend `DanhMucHoatDongRepository` with helpers (`findGlobal`, `findByUnit`, `findAccessible`, `assertCanMutate`, `softDelete`) that enforce tenant isolation and soft-delete semantics.
   - Log every mutation through `nhatKyHeThongRepo.logCatalogChange` including scope and actor metadata.

3. **API Updates**
   - GET `/api/activities`: accept `scope` (`global|unit|all`) and return `{ global, unit, permissions }`, filtering `DaXoaMem = false` and applying authenticated unit scope.
   - POST `/api/activities`: allow DonVi, auto-injecting their `unitId`; SoYTe may optionally adopt a unit activity into global scope (`MaDonVi = NULL`).
   - PUT `/api/activities/[id]`: block DonVi when the activity is global or belongs to another unit; allow SoYTe to adopt or reassign scope.
   - DELETE `/api/activities/[id]`: implement soft delete (`DaXoaMem = true`) with optional hard delete reserved for SoYTe maintenance scripts.

4. **Frontend Experience**
   - Update the Activities page to render tabbed sections for global versus unit activities with clear scope badges.
   - Adjust `ActivitiesList` and `ActivityForm` to respect permissions, hide scope controls for DonVi, and surface adopt-to-global workflow for SoYTe.

5. **Telemetry, Docs, and Guardrails**
   - Emit metrics for catalog counts by scope and permission denials.
   - Document the workflow for DonVi administrators and the SoYTe adoption/soft-delete process.
   - Expand automated tests (Vitest and Playwright) to cover role specific flows.

---

## Impact

### Affected Specifications
- **New:** `specs/activities-catalog/spec.md` (activities catalog scope and permissions).
- **Modified:** `specs/activity-submission/spec.md` (reference to unit scoped activities), `specs/user-management/spec.md` (DonVi permission summary).

### Code Areas
- Database migration (`migrations/2025-11-02_add_donvi_scope_to_danh_muc_hoat_dong.sql`).
- Repository: `src/lib/db/repositories.ts` plus new tests under `tests/repositories/danh-muc-hoat-dong.test.ts`.
- API: `src/app/api/activities/route.ts`, `src/app/api/activities/[id]/route.ts`.
- UI: `src/app/(authenticated)/activities/page.tsx`, `src/components/activities/activities-list.tsx`, `src/components/activities/activity-form.tsx`.
- Logging & telemetry: `src/lib/db/audit/nkht-repository.ts`, analytics event emitters.

### User Impact
- **SoYTe:** Retains global control, gains explicit adopt-to-global workflow and soft-delete recovery window.
- **DonVi:** Gains full CRUD over unit activities, read access to global catalog.
- **NguoiHanhNghe / Auditor:** No direct UI change; they consume catalog through submission flows.

### Performance & Reliability
- New indexes keep unit filtered queries performant (<50 ms at 50k records).
- API responses split global/unit arrays to avoid client side overfetch.
- Soft delete prevents accidental data loss while keeping historical audit intact.

---

## Non-Goals
- No automated synchronization between units.
- No bulk import/export tooling.
- No change to practitioner submission workflow beyond consuming scoped catalog data.
- No hard delete UI; physical cleanup remains a SoYTe maintenance task.

---

## Security Considerations
- Enforce multi layer checks (middleware, API guards, repository filters) to preserve tenant isolation.
- Block DonVi attempts to modify global or other unit activities; log all denied actions with scope metadata.
- Validate payloads with Zod and ignore `MaDonVi` from DonVi input to prevent privilege escalation.
- Soft delete status prevents data exposure after deletion and enables recovery audits.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DonVi attempts to edit global activity | High | Repository guard, API 403, audit log entry |
| Missing backfill metadata for legacy rows | Medium | Migration seeds provenance defaults, verified in staging |
| UI confusion between scopes | Medium | Tabbed layout, scope badges, contextual empty states |
| Query regression under load | Low | Covering indexes, monitor analytics |
| Soft delete backlog grows indefinitely | Medium | Add SoYTe maintenance script guidance, dashboards on `DaXoaMem` counts |

---

## Open Questions
1. Should SoYTe be able to adopt a DonVi activity into global scope? **Yes** – expose adoption workflow for SoYTe in UI/API.
2. Do we need feature flags for a phased rollout? **No** – ship directly after verification.
3. Should we introduce soft delete rather than immediate hard delete? **Yes** – default to soft delete with separate cleanup tooling.

---

## Next Steps
1. Finalize migration and dry-run in staging.
2. Implement repository, API, and UI changes with corresponding tests.
3. Run `openspec validate add-donvi-activities-access --strict` prior to review.
4. Obtain stakeholder approval, then proceed with implementation in a dedicated branch.

---

## References
- `docs/add-donvi-activities-access.md`
- `docs/plans/2025-11-02-activities-donvi-access-implementation.md`
- `openspec/specs/activity-submission/spec.md`
- `docs/2025-10-03/v_1_init_schema.sql`
