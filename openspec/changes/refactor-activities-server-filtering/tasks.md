## 1. Discovery
- [ ] 1.1 Document current client-side filtering logic in `activities-list.tsx` and associated hooks.
- [ ] 1.2 Capture required filter parameters (scope, status, search, pagination) and gaps in existing API contracts.

## 2. API Updates
- [ ] 2.1 Extend `GET /api/activities` to accept validated filter, search, and pagination parameters scoped to the authenticated tenant.
- [ ] 2.2 Add unit tests and integration coverage ensuring filtered queries return correct records and totals.

## 3. UI Refactor
- [ ] 3.1 Update activities data hooks/components to call the server with filter parameters and remove local filtering code.
- [ ] 3.2 Persist active filters in the URL/query state and hydrate from the URL on load.
- [ ] 3.3 Ensure loading, empty, and error states reflect server responses per filter combination.

## 4. Validation
- [ ] 4.1 Run end-to-end checks (typecheck, tests) and verify analytics/audit logging still capture filter usage.
- [ ] 4.2 Update documentation or runbooks if filter usage impacts monitoring dashboards.
