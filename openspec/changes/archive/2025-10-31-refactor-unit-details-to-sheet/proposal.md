## Why
The current SoYTe dashboard unit detail view navigates to a separate page (`/dashboard/units/[id]`), which disrupts the comparison workflow. SoYTe users need to quickly scan and compare multiple healthcare units, but the full-page navigation loses visual context of the comparison table and requires repeated back/forth navigation. Additionally, this pattern is inconsistent with other detail views in the codebase (practitioner-detail-sheet, activity-detail-sheet) which use Sheet overlays for quick preview workflows.

## What Changes
- Replace the separate Unit Detail page with a Sheet (slide-in panel) component that overlays the dashboard
- Add `UnitDetailSheet` component that displays unit metrics in an overlay from the right side
- Update `UnitComparisonGrid` to open the sheet instead of navigating to a separate page
- Preserve dashboard table context (dimmed background) while sheet is open
- Implement proper focus management, keyboard navigation (ESC to close), and accessibility (ARIA dialog attributes)
- Remove or deprecate the separate page route `/dashboard/units/[id]` (or keep for deep linking if needed)

**Performance Improvements:**
- Replace manual `useEffect` + `fetch` with TanStack Query (`useQuery`) for automatic caching, request deduplication, and background refetching
- Pass initial unit data from comparison grid to sheet to avoid redundant API calls (optimistic rendering)
- Implement hover prefetching on "Xem chi tiết" button so data is ready when user clicks
- Use dynamic import for Sheet component to reduce initial dashboard bundle size
- Leverage React Query's stale-while-revalidate strategy with 30s stale time (matching project defaults)

## Impact
- **Affected specs:** `dashboard`
- **Affected code:**
  - Modified: `src/components/dashboard/unit-comparison-grid.tsx` (replace Link with Sheet trigger)
  - New: `src/components/dashboard/unit-detail-sheet.tsx` (Sheet component with metrics)
  - Modified: `src/components/dashboard/doh-dashboard.tsx` (manage sheet state)
  - Modified or removed: `src/app/(authenticated)/dashboard/units/[id]/page.tsx` (separate page)
  - Modified or removed: `src/app/(authenticated)/dashboard/units/[id]/loading.tsx`
  - Modified or removed: `src/components/dashboard/unit-detail-client.tsx` (reuse logic in Sheet)
  - Tests: `tests/components/unit-comparison-grid.test.tsx`
- **Risks:**
  - Loss of deep linking capability (mitigated: internal tool, users navigate from dashboard)
  - Sheet width constraints may limit future metric additions (mitigated: similar to practitioner sheet which handles complex data)
  - Need proper focus management and keyboard navigation to maintain accessibility
- **Benefits:**
  - **Better comparison workflow:** Users can quickly scan multiple units without losing table context
  - **Pattern consistency:** Aligns with existing practitioner and activity detail patterns
  - **Perceived performance:** No page reload, feels faster and more responsive
  - **Context preservation:** Dashboard table remains visible (dimmed), reducing cognitive load
  - **Actual performance improvements:**
    - Eliminates redundant API calls by reusing grid data (80% of metrics already available)
    - Hover prefetching makes clicks feel instant
    - React Query caching reduces server load and improves response times
    - Code splitting reduces initial dashboard bundle by ~5-10KB
    - Request deduplication prevents multiple fetches if user rapidly clicks different units
