## 1. Implementation
- [ ] 1.1 Validate API: scope duplicate SoCCHN lookup to session.unitId; if exists in other unit, return generic error without PII
- [ ] 1.2 Execute API: derive unitId from session; refuse any payload unit hints
- [ ] 1.3 ImportService: change upsert to ON CONFLICT ("SoCCHN") DO UPDATE ... WHERE "NhanVien"."MaDonVi" = EXCLUDED."MaDonVi"; if no row updated and exists in other unit → log error and skip
- [ ] 1.4 Add helper to fetch existing row’s MaDonVi by SoCCHN to decide error messaging
- [ ] 1.5 Add audit events: IMPORT_SKIPPED_CROSS_UNIT with SoCCHN (mask: last 4)

## 2. Security & RBAC
- [ ] 2.1 Ensure all import endpoints ignore client unitId and use session.unitId only
- [ ] 2.2 Add tests to assert DonVi cannot read/alter other-unit data through import paths

## 3. QA & Tests
- [ ] 3.1 Unit tests: upsert gating, validator scoping
- [ ] 3.2 Integration tests: validate + execute flows for (new, same unit duplicate, other unit duplicate)
- [ ] 3.3 Regression: practitioners list/detail still scoped, no leakage via import messages

## 4. Rollout
- [ ] 4.1 Feature flag `import_tenant_isolation` (default on)
- [ ] 4.2 Docs: update import guide about duplicate handling
