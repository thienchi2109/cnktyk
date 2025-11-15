## Why
Clicking “Xem chi tiết” in the SoYTe dashboard’s Unit Comparison grid navigates to a non-existent path (`/so-y-te/don-vi/[id]`), resulting in a 404 for valid units.

## What Changes
- Define a canonical Unit Detail route within the authenticated dashboard scope: `/dashboard/units/[unitId]`.
- Update the Unit Comparison grid action to link to the canonical route.
- Introduce a Unit Detail page for DoH context that displays basic unit info and key performance metrics.
- Enforce role guard and tenant scoping (SoYTe-only view; 403/404 for unauthorized/non-existent units).
- Add tests to prevent regressions on link targets and route existence.

## Impact
- Affected specs: `dashboard`
- Affected code:
  - `src/components/dashboard/unit-comparison-grid.tsx` (link target)
  - New: `src/app/(authenticated)/dashboard/units/[id]/page.tsx` (detail page)
  - Optional: `src/app/(authenticated)/dashboard/units/[id]/loading.tsx` (loading state)
  - Tests: `tests/components/unit-comparison-grid.test.tsx` (+ possible route smoke test)
- Risks: Route naming consistency; ensure role-based access and tenant filtering are applied.
