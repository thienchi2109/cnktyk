## 1. Discovery & Design
- [x] 1.1 Audit current SoYTe comparison usage analytics (unit counts, required metrics, export needs).
- [x] 1.2 Draft responsive data-grid layout (columns, breakpoints, virtualization vs pagination) and review with design/UX.
- [x] 1.3 Confirm accessibility requirements (keyboard flow, screen-reader announcements, high contrast).
- [x] 1.4 Assess API capabilities and data volume to design server-side search/sort/filter/pagination contract (query params, caching, totals).
- [x] 1.5 Identify repository joins/aggregations required to avoid N+1 queries when retrieving per-unit metrics.

## 2. Implementation
- [x] 2.1 Scaffold reusable data grid component (or extend existing table) with sticky header and virtualized rows.
- [x] 2.2 Replace card-grid rendering in `DohDashboard` with the new grid, wiring up existing search/sort controls.
- [x] 2.3 Add per-row actions (detail link) and summary footer (totals / averages) without regressing current metrics.
- [x] 2.4 Ensure loading, empty, and error states align with dashboard skeleton patterns.
- [x] 2.5 Implement server-side endpoints / repository methods that accept search, multi-column sort, and pagination parameters with tenant isolation, returning total counts for filtered datasets.
- [x] 2.6 Update front-end data fetching to use server-side filtering/pagination, including optimistic/loading states for remote queries and cross-page filter persistence.
- [x] 2.7 Optimize data access patterns (batch queries, precomputed aggregates) to eliminate N+1 calls when loading practitioner counts, compliance metrics, and pending approvals per unit.

## 3. Validation
- [x] 3.1 Add Vitest / component tests covering high-volume datasets (60+ units) and search/sort combinations.
- [x] 3.2 Add integration tests (API or repository layer) ensuring server filter/sort/pagination respects tenant isolation, returns correct counts, and supports cross-page filtering.
- [x] 3.3 Add performance regression checks (profiling or query plan review) confirming no N+1 behavior for unit metrics.
- [x] 3.4 Validate responsive behavior manually (desktop, tablet, reduced motion) and document in release notes.
- [x] 3.5 Run `openspec validate refactor-doh-unit-comparison-grid --strict`
