## 1. Implementation
- [ ] 1.1 Update Unit Comparison link target to canonical route
  - File: `src/components/dashboard/unit-comparison-grid.tsx`
  - Change: `/so-y-te/don-vi/${row.id}` → `/dashboard/units/${row.id}`
- [ ] 1.2 Add Unit Detail route (SoYTe context)
  - File: `src/app/(authenticated)/dashboard/units/[id]/page.tsx`
  - Guard: SoYTe role; tenant scoping
  - Display: Unit name + key metrics (compliant/active/pending/credits)
- [ ] 1.3 Optional loading state
  - File: `src/app/(authenticated)/dashboard/units/[id]/loading.tsx`
- [ ] 1.4 Tests
  - Update/extend `tests/components/unit-comparison-grid.test.tsx` to assert correct href
  - Add smoke test for `/dashboard/units/[id]` route existence (valid → 200; invalid → 404/403)

## 2. Validation
- [ ] 2.1 Manual QA: From `/dashboard/doh`, "Xem chi tiết" opens detail page (no 404 for valid unit)
- [ ] 2.2 Back navigation returns to comparison grid with filters/sorts intact

## 3. Rollout
- [ ] 3.1 Document canonical route in developer docs
- [ ] 3.2 Verify role/tenant enforcement in production logs post-deploy
