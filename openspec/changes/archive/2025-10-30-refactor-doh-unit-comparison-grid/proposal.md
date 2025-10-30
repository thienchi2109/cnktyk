## Why
The DoH comparison area currently renders every unit as an individual glass card. Provinces like Ho Chi Minh already operate 60+ units, and future growth will continue to increase that count. The card grid causes excessive scrolling, layout jank, and makes cross-unit analysis impossible once the list exceeds a handful of tiles. We need a scalable data-grid presentation that keeps the view performant and scannable regardless of unit volume.

## What Changes
- Replace the card-based “So sánh đơn vị” layout with a responsive data grid that can display dozens of units without overflowing the page.
- Introduce virtualization or pagination plus sticky headers so large datasets stay performant and readable on desktop and tablet breakpoints.
- Preserve existing filters (search + sort) and extend them with multi-column sorting cues and column-level quick filters across paginated results.
- Support row-level deep links/actions (e.g., “Xem chi tiết”) without relying on per-card buttons.
- Move searching, sorting, filtering, and pagination logic to server-backed queries so large datasets do not download the full unit list up front.
- Ensure accessibility: keyboard navigation, table semantics, and live region updates when filters change.
- Keep empty/error/loading states aligned with the skeleton / error patterns introduced earlier.

## Impact
- Specs: `dashboard`
- Code: `src/components/dashboard/doh-dashboard.tsx`, potential shared data grid component under `src/components/datagrid/*`, server route/controllers serving filtered/paginated unit data
- Risks: need to ensure virtualization works with tenant scoping, pagination stays consistent with filters, and repository queries avoid N+1 lookups.
