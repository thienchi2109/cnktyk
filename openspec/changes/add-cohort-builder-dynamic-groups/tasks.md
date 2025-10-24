## 1. Implementation
- [x] 1.1 UX: Add Cohort Builder step in bulk assignment wizard (before Preview)
- [x] 1.2 Filters UI: Khoa/Phòng, Chức danh, Trạng thái “Đang làm việc” (default on), Tag; search box
- [x] 1.3 Select-all-across-pages + exclusion chips (persisted across pagination/sorts)
- [x] 1.4 Live counts: total filtered, selected, excluded; empty/error states
- [ ] 1.5 Save/Load “Nhóm thông minh” (dynamic) per-Đơn vị
- [ ] 1.6 Preview/Dry-run panel (create/skip/trùng) with sampled members

## 2. API & Data
- [x] 2.1 Endpoint: POST /api/cohorts/resolve → { ids[], total, page } (RBAC: DonVi scope)
- [ ] 2.2 Endpoint: POST /api/cohorts/preview → { createCount, skipCount, duplicateCount }
- [ ] 2.3 Endpoint: POST /api/cohorts/presets (create/update), GET /api/cohorts/presets (list), GET /api/cohorts/presets/:id
- [ ] 2.4 Idempotent application in bulk assignment: UNIQUE(event_id, nhan_vien_id) or batch_id upsert
- [ ] 2.5 Indexes for filter fields (MaDonVi, Khoa/Phòng, ChucDanh, TrangThaiLamViec, Tag join)

## 3. Security & Audit
- [ ] 3.1 Enforce tenancy on queries (WHERE MaDonVi = session.maDonVi)
- [ ] 3.2 Audit: save preset create/update/delete with payload snapshot
- [ ] 3.3 Rate limit resolve/preview endpoints to prevent abuse

## 4. QA & Validation
- [ ] 4.1 Unit tests: filter resolution, select-all + exclusions logic
- [ ] 4.2 Integration tests: preview idempotency, RBAC scoping
- [ ] 4.3 UX tests: large list (1k) with select-all/exclusions, save & reuse preset
- [ ] 4.4 Accessibility: keyboard navigation, screen reader labels

## 5. Rollout
- [ ] 5.1 Feature flag for DonVi role
- [ ] 5.2 Docs: short guide + GIF in docs/feature-guides
- [ ] 5.3 Metrics: capture usage and time-saved estimate