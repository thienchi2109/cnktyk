## 1. Implementation
- [x] 1.1 UX: Add Cohort Builder step in bulk assignment wizard (before Preview)
- [x] 1.2 Filters UI: Khoa/Phòng, Chức danh, Trạng thái “Đang làm việc” (default on), Tag; search box
- [x] 1.3 Select-all-across-pages + exclusion chips (persisted across pagination/sorts)
- [x] 1.4 Live counts: total filtered, selected, excluded; empty/error states
- [x] 1.5 Save/Load “Nhóm thông minh” (dynamic) per-Đơn vị
- [x] 1.6 Preview/Dry-run panel (create/skip/trùng) with sampled members

### Acceptance criteria
- 1.1 Wizard accessible at `/submissions/bulk` for roles DonVi/SoYTe; step indicator shows “1. Chọn Cohort” and “2. Xem trước”; Next disabled until selection count > 0.
- 1.2 Filters include search, Trạng thái default “DangLamViec”, Chức danh input, Tag (disabled placeholder); changing any filter resets page=1 and updates list p95 ≤ 2s.
- 1.3 “Chọn tất cả theo bộ lọc” selects across all filtered results; page checkbox toggles current page; exclusion chips persist across pagination/sorts and can be removed individually.
- 1.4 Live counters (Đã chọn/Tổng phù hợp/Bị loại trừ) update within 100ms after interactions; empty and error states render; pagination prev/next works without duplicates or gaps.
- 1.5 Preset save stores dynamic filter definition scoped to Đơn vị; load re-resolves against current roster; list/rename/delete available; RBAC prevents cross-unit access.
- 1.6 Preview shows create/skip/duplicate counts without writes; supports up to 2,000 practitioners with p95 ≤ 2s; shows sample (≥10) target IDs for audit.

## 2. API & Data
- [x] 2.1 Endpoint: POST /api/cohorts/resolve → { ids[], total, page } (RBAC: DonVi scope)
- [x] 2.2 Endpoint: POST /api/cohorts/preview → { createCount, skipCount, duplicateCount }
- [x] 2.3 Endpoint: POST /api/cohorts/presets (create/update), GET /api/cohorts/presets (list), GET /api/cohorts/presets/:id
- [x] 2.4 Idempotent application in bulk assignment: UNIQUE(event_id, nhan_vien_id) or batch_id upsert
- [x] 2.5 Indexes for filter fields (MaDonVi, Khoa/Phòng, ChucDanh, TrangThaiLamViec, Tag join)

### Acceptance criteria
- 2.1 `POST /api/cohorts/resolve` requires DonVi/SoYTe; DonVi is scoped to own unit; returns `{ ids, total, page, limit }`; invalid body → 400; unauthorized → 401; forbidden → 403.
- 2.2 `POST /api/cohorts/preview` accepts filters + selection + activity payload; returns `{ createCount, skipCount, duplicateCount }`; no writes; p95 ≤ 2s on 2k; unit scope enforced.
- 2.3 Presets APIs support create/update/list/get; presets are per‑Đơn vị; schema validated; actions audited (see 3.2).
- 2.4 Apply uses UNIQUE(event_id, nhan_vien_id) or `ON CONFLICT DO NOTHING`; re‑runs create zero duplicates; returns counts and IDs affected.
- 2.5 Indexes present and used by EXPLAIN (scans on MaDonVi, TrangThaiLamViec, ChucDanh); resolve/preview end‑to‑end p95 ≤ 2s on 2k.

## 3. Security & Audit
- [x] 3.1 Enforce tenancy on queries (WHERE MaDonVi = session.maDonVi)
- [x] 3.2 Audit: save preset create/update/delete with payload snapshot
- [x] 3.3 Rate limit resolve/preview endpoints to prevent abuse

### Acceptance criteria
- 3.1 DonVi cannot resolve/preview other units; attempts return 403; SoYTe can pass unitId; DonVi provided unitId is ignored in favor of session.
- 3.2 Audit records include action, actor, unitId, payload snapshot, timestamp, IP (if available); audit table remains immutable.
- 3.3 Per‑user rate limits applied (e.g., resolve ≤ 10 req/min, preview ≤ 5 req/min); on exceed respond 429; events logged.

## 4. QA & Validation
- [x] 4.1 Unit tests: filter resolution, select-all + exclusions logic
- [x] 4.2 Integration tests: preview idempotency, RBAC scoping
- [x] 4.3 UX tests: large list (1k) with select-all/exclusions, save & reuse preset
- [x] 4.4 Accessibility: keyboard navigation, screen reader labels

### Acceptance criteria
- 4.1 Unit tests cover: select‑all across pages, per‑row toggle, exclusion chips, counters; all pass in CI.
- 4.2 Integration tests verify RBAC (DonVi vs SoYTe), idempotent apply/preview, and 400/403/429 paths.
- 4.3 Manual UX runbook passes with 1k practitioners: select‑all, exclude 5, counts correct, Next enabled only when >0 selected.
- 4.4 a11y: All controls reachable via keyboard; inputs have labels; checkboxes have aria‑labels; color not sole signal.

## 5. Rollout
- [x] 5.1 Feature flag for DonVi role
- [x] 5.2 Docs: short guide + GIF in docs/feature-guides
- [x] 5.3 Metrics: capture usage and time-saved estimate

### Acceptance criteria
- 5.1 Feature flag gates UI and APIs; disabled → `/submissions/bulk` not accessible; enabled only for DonVi/SoYTe.
- 5.2 Docs include steps with screenshots/GIF; linked from unit admin area; reviewed for accuracy.
- 5.3 Metrics emitted (cohort_resolve, cohort_preview, wizard_step) with counts; visible in logs/telemetry dashboard.
