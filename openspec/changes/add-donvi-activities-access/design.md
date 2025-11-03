# Design: DonVi Access to Activities Catalog

## Data Model
- Extend `DanhMucHoatDong` with:
  - `MaDonVi UUID NULL REFERENCES DonVi(MaDonVi) ON DELETE CASCADE`
  - `NguoiTao UUID NULL REFERENCES TaiKhoan(MaTaiKhoan) ON DELETE SET NULL`
  - `NguoiCapNhat UUID NULL REFERENCES TaiKhoan(MaTaiKhoan) ON DELETE SET NULL`
  - `TaoLuc TIMESTAMPTZ DEFAULT now()`
  - `CapNhatLuc TIMESTAMPTZ DEFAULT now()`
  - `TrangThai activity_catalog_status DEFAULT 'Draft'`
  - `DaXoaMem BOOLEAN NOT NULL DEFAULT false`
- Indexes: `idx_dmhd_donvi` (`MaDonVi`), `idx_dmhd_donvi_hieuluc` (`MaDonVi`,`HieuLucTu`,`HieuLucDen`), `idx_dmhd_unique_name_unit` (`MaDonVi`,`lower(TenDanhMuc)`), `idx_dmhd_soft_delete` (`DaXoaMem`).
- Migration backfills legacy rows with `MaDonVi = NULL`, provenance defaults (`NguoiTao = soyte_service_id`, timestamps = `now()`), and `DaXoaMem = false`.

## Repository Layer
- `findGlobal()`: `WHERE "MaDonVi" IS NULL AND "DaXoaMem" = false`.
- `findByUnit(unitId)`: `WHERE "MaDonVi" = $1 AND "DaXoaMem" = false`.
- `findAccessible(unitId)`: return `{ global, unit }` pair for the UI.
- `createForUser(user, payload)`: injects `MaDonVi` for DonVi; allows SoYTe to assign or adopt (set `MaDonVi = NULL`).
- `assertCanMutate(user, activityId)`: loads activity, ensures not soft deleted, enforces unit ownership.
- `softDelete(id, user)`: sets `DaXoaMem = true`, records `NguoiCapNhat` / `CapNhatLuc`, logs action; separate hard-delete utility for SoYTe maintenance scripts.
- All write methods emit audit events through `nhatKyHeThongRepo.logCatalogChange` including scope transitions (unit → global) and soft-delete metadata.

## API Contracts
- `GET /api/activities?scope=all|global|unit&limit=&page=`  
  Response: `{ global: Activity[], unit: Activity[], permissions: { canCreateGlobal, canCreateUnit, canEditGlobal, canEditUnit, canAdoptToGlobal, canRestoreSoftDeleted } }`.
- `POST /api/activities`  
  Body: existing fields; `MaDonVi` ignored for DonVi; SoYTe may supply `null` to create global entries or adopt a unit entry by updating later.
- `PUT /api/activities/:id`  
  Reject DonVi when activity is global or belongs to another unit; allow SoYTe to adopt (`MaDonVi -> NULL`), reassign units, and update soft-deleted entries after restoration.
- `DELETE /api/activities/:id`  
  DonVi: soft delete only within their unit. SoYTe: soft delete any entry, with optional hard delete exposed via separate admin endpoint/tooling.
- `POST /api/activities/:id/restore` (new)  
  Restores a soft-deleted activity; SoYTe may restore any, DonVi only their unit items.

## Frontend
- Activities page consumes scoped payload and renders tabs for global vs unit activities, including soft-deleted list for SoYTe maintenance view.
- `ActivitiesList` presents scope badges (`He thong`, `Don vi`), shows adopt-to-global action for SoYTe on unit rows, and indicates soft-deleted state with recovery affordances.
- `ActivityForm` hides scope picker for DonVi (unit implied). SoYTe sees scope selector with options: keep unit scoped, adopt to global, or reassign to another unit. Soft-deleted entries render read-only warning until restored.
- Confirmation dialogs guard soft delete and adopt actions; DonVi receives immediate feedback when attempting disallowed operations.

## Audit & Telemetry
- Audit payload example for creation:
  ```json
  {
    "scope": "unit",
    "unitId": "unit-123",
    "activityId": "uuid",
    "action": "CREATE",
    "actorRole": "DonVi"
  }
  ```
- Adoption payload includes scope transition:
  ```json
  {
    "action": "ADOPT_TO_GLOBAL",
    "activityId": "uuid",
    "scopeBefore": "unit",
    "scopeAfter": "global",
    "unitId": "unit-123"
  }
  ```
- Soft-delete payload:
  ```json
  {
    "action": "SOFT_DELETE",
    "activityId": "uuid",
    "scope": "unit",
    "unitId": "unit-123",
    "actorRole": "DonVi"
  }
  ```
- Metrics: `activities.catalog.count{scope=global|unit}`, `activities.catalog.denied{reason=scope_mismatch}`, `activities.catalog.soft_deleted`, `activities.catalog.adopted_to_global`.

## Testing Strategy
- Vitest: repository filters, scope enforcement, soft delete behavior, adoption guardrails, provenance fields.
- API contract tests: role based matrix (SoYTe vs DonVi vs unauthorized) covering create, adopt, soft delete, restore, and forbidden scenarios.
- Playwright: DonVi flows (tab switch, create/edit/delete/restore own activity) and SoYTe flows (adopt unit activity, restore soft-deleted entries, hard delete blocked in UI).
- Migration tests: verify forward/backward migrations maintain data integrity and default values.

## Deployment
- Run migration during maintenance window; verify new indexes and defaults.
- No feature flag; release once staging smoke tests pass.
- Provide SoYTe operations runbook for periodic cleanup of soft-deleted activities and adoption workflow.
