## Why
DonVi admins need to assign one activity to a subset (dozens–hundreds) of internal practitioners. Today they must attach the same activity to each person manually, which is slow and error‑prone. The approved approach is a fast “Cohort builder”: filter by Khoa/Phòng, Chức danh, Hợp đồng/Trạng thái “Đang làm việc”, Tag; “Select all across pages” then exclude individuals via chips; save dynamic “Nhóm thông minh” to reuse.

## What Changes
- Add Cohort Builder UI to the bulk assignment flow (step before preview):
  - Filters: Khoa/Phòng, Chức danh, Trạng thái làm việc (mặc định “Đang làm việc”), Tag.
  - “Select all across pages” with persistent selection + per‑person exclusions as removable chips.
  - Live counts (tổng, đã chọn, bị loại trừ) and search within filtered set.
  - Save/Load “Nhóm thông minh” (dynamic presets based on filters, not static members).
  - Preview/Dry‑run shows create/skip/trùng before confirm.
- Server endpoints to resolve filters → IDs (paginated), compute counts, and persist/retrieve dynamic groups (per‑Đơn vị).
- Idempotent application when used by bulk assignment (no trùng lặp; safe to rerun).
- RBAC/tenancy: DonVi can only see/select nhân viên trong đơn vị của mình.

## Impact
- Affected specs: cohort-builder (new capability), bulk-assignment (integration point).
- Affected code: UI (wizard step), API routes for cohort resolution and group presets, repository filters and indexes; audit logging.
- Non‑breaking: additive feature gated to DonVi role; existing reports remain unchanged.
