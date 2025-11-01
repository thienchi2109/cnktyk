## Why

SoYTe (Department of Health) operators need a dedicated Units management experience to audit and drill into subordinate units outside of the analytics dashboard overlay. At present `/dashboard/doh/units` and `/dashboard/units` return 404 because only the `[id]` dynamic route exists. Deep links are force-routed through the dashboard sheet overlay, offering no page-level discoverability or breadcrumb entry, which blocks compliance workflows that require an accessible list view.

## What Changes

- Add a guarded Next.js page at `/dashboard/doh/units` that renders a full-page units management surface for SoYTe users, reusing existing data grid and detail sheet components.
- Keep `/dashboard/units/[id]` as the deep-link entry but redirect through the new page (`/dashboard/doh/units?unit=<id>`) and return 404 for unknown units.
- Provide navigation from the SoYTe dashboard into the new page and ensure the query-string controlled state (search, sort, pagination, selected unit) stays shareable.
- Preserve tenant isolation and server-driven filtering by continuing to leverage `/api/system/units-performance` and related repository methods.

## Impact

- Affected specs: `dashboard`
- Affected code:
  - New page component: `src/app/(authenticated)/dashboard/doh/units/page.tsx`
  - Optional layout helpers under `src/app/(authenticated)/dashboard/doh/units/*`
  - Updates to SoYTe dashboard navigation (`src/components/dashboard/doh-dashboard.tsx` or related menu)
  - Adjusted redirect logic in `src/app/(authenticated)/dashboard/units/[id]/page.tsx`
- Testing:
  - Vitest/RTL coverage for routing guards and query sync helpers
  - Playwright (or equivalent) integration ensuring SoYTe users reach the new page and detail sheet opens for `unit` query links
- No breaking API changes; reuse existing `/api/system/units-performance` and unit metrics endpoints.
