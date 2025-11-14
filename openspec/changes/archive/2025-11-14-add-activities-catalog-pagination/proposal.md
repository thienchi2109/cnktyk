## Why
The `/activities` data grid that both SoYTe and DonVi rely on can only ever display the first 50 rows that the API returns. Although the backend already exposes pagination metadata, the UI never surfaces page controls, so operators cannot navigate large catalogs or verify totals. This leads to missing records, inconsistent audits, and forces staff to rely on ad-hoc search queries that may still silently truncate results. Formal requirements are also missing for the existing debounced server search and scoped filtering, so these behaviors are effectively accidental and could regress.

## What Changes
- Add server-driven pagination controls (page selector + page size) wired to `/api/activities` so both roles can traverse the entire catalog with scope-aware totals.
- Codify debounced server search (≥300 ms debounce, URL-synced query params) so it is preserved across future refactors.
- Codify server-driven filtering for scope/type/status so every filter change results in parameterized API calls with matching totals/per-page information.
- Update ActivitiesList, ActivitiesPage, and associated hooks/tests to cover DonVi + SoYTe paths, including empty states for pages beyond the last result and loading placeholders while page transitions occur.

## Impact
- **Affected specs:** `activities-catalog` (new requirements for pagination, search debounce, filtering fidelity).
- **Affected code:** `src/components/activities/activities-list.tsx`, `src/app/(authenticated)/activities/page.tsx`, `src/hooks/use-activities.ts`, `/api/activities` route + repository helpers, TanStack Query caches, Vitest coverage around Activities catalog interactions.
