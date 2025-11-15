## Why
DonVi administrators see stale and inconsistent results on the activities page because filters run entirely on the client using cached datasets. Large catalogs and cross-tab navigation cause mismatched counts and force full dataset downloads, hurting performance.

## What Changes
- Move DonVi activities filtering, searching, and pagination to server-side APIs with explicit query parameters.
- Update the activities page and list components to request filtered results from the server and persist filter state in the URL.
- Add server validation and audit coverage for filter inputs to ensure tenant isolation and accurate totals.

## Impact
- Affected specs: `dashboard`
- Affected code: `/api/activities` query handlers, `src/components/activities/activities-list.tsx`, `src/app/(authenticated)/activities/page.tsx`, related hooks and tests.
