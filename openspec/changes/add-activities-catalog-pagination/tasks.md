## 1. Activities Catalog Enhancements
- [ ] 1.1 Audit current ActivitiesList interactions to document missing pagination/search/filter coverage for both SoYTe and DonVi
- [ ] 1.2 Implement server-driven pagination UI (page selector + page size) syncing to query params and `/api/activities`
- [ ] 1.3 Ensure debounced (>=300 ms) server search updates carry through URL params and preserve active scope/type/status filters
- [ ] 1.4 Ensure scope/type/status filter changes trigger server fetches with consistent totals and reset pagination appropriately
- [ ] 1.5 Add loading/empty/error states for pagination transitions and pages beyond available results
- [ ] 1.6 Update TanStack Query caches/tests (Vitest) covering pagination/search/filter logic for both roles with mocked API layer

## 2. Spec and Validation
- [ ] 2.1 Add `activities-catalog` spec deltas for pagination/search/filter requirements
- [ ] 2.2 Run `openspec validate add-activities-catalog-pagination --strict` and fix findings
