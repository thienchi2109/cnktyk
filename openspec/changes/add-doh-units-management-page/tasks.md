## 1. Routing & Access Control

- [ ] 1.1 Create `src/app/(authenticated)/dashboard/doh/units/page.tsx` with `requireAuth` guard and SoYTe-only access redirect.
- [ ] 1.2 Update `/dashboard/units/[id]/page.tsx` to redirect to `/dashboard/doh/units?unit=<id>` after validating unit existence.
- [ ] 1.3 Add integration coverage ensuring `/dashboard/doh/units` returns 200 for SoYTe users and redirects others.

## 2. Page Composition

- [ ] 2.1 Implement the units page wrapper (header, summary cards) reusing existing glass UI components plus the `DohDashboard` grid for unit listings.
- [ ] 2.2 Persist search, sort, pagination, and unit selection state via URL query parameters for shareable deep links.
- [ ] 2.3 Ensure the `unit` query parameter automatically opens `UnitDetailSheet` inside the page with pre-fetched metrics.
- [ ] 2.4 Surface navigation from the SoYTe dashboard to `/dashboard/doh/units` (button/link or breadcrumb entry).

## 3. Data & Performance

- [ ] 3.1 Reuse `/api/system/units-performance` for list data; add helpers only if additional metrics are required for the page header.
- [ ] 3.2 Confirm React Query caching and prefetch behaviour continue to work when the grid renders outside the dashboard.
- [ ] 3.3 Validate tenant isolation, pagination bounds, and multi-sort behaviour through server-driven queries.

## 4. Observability & UX Polish

- [ ] 4.1 Log audit events when SoYTe users open unit details if mandated by compliance logging rules.
- [ ] 4.2 Mirror loading, empty, and error states from the dashboard grid to maintain consistent UX.
- [ ] 4.3 Localize any new labels or helper text in Vietnamese consistent with existing strings.

## 5. Testing & Validation

- [ ] 5.1 Unit-test any new hooks or utilities for query parameter synchronisation.
- [ ] 5.2 Add Playwright (or React Testing Library) coverage asserting the units page renders data, honours filters, and opens the detail sheet.
- [ ] 5.3 Regression-test the SoYTe dashboard to confirm existing cards and overlays continue to render and navigate correctly.
- [ ] 5.4 Run `openspec validate add-doh-units-management-page --strict` and resolve any spec issues prior to implementation handoff.
