# Optimize Dashboard Performance

## Why

Dashboard pages currently execute **7 sequential database queries** for unit metrics, load **unlimited practitioners** without pagination, and make **4 waterfalling API calls** for practitioner dashboard. This causes 1-2 second load times and will become unusable as units grow beyond 100 practitioners.

Performance audit revealed critical N+1 query issues that severely impact user experience and system scalability.

## What Changes

- **BREAKING**: Unit Metrics API response time reduced from 300-500ms to <100ms by combining 7 queries into 1
- Add pagination to unit admin dashboard practitioners list (currently loads ALL practitioners)
- Create dedicated practitioner dashboard API endpoint (reduces 4 API calls to 1)
- Move client-side filtering to server-side (reduces bandwidth by 50-90%)
- Add Redis caching layer for dashboard metrics (TTL: 60s)
- Add database indexes for dashboard queries

## Impact

**Affected specs:**
- `dashboard-api` (new capability)

**Affected code:**
- `src/app/api/units/[id]/metrics/route.ts` - Query optimization
- `src/components/dashboard/unit-admin-dashboard.tsx` - Add pagination
- `src/app/api/dashboard/practitioner/route.ts` - New endpoint
- `src/components/dashboard/practitioner-dashboard.tsx` - Use new endpoint
- `src/lib/cache.ts` - New Redis cache layer
- `migrations/004_add_dashboard_indexes.sql` - New database indexes

**Performance improvements:**
- Unit Metrics API: 300-500ms → 80-120ms (3-4x faster)
- Practitioner Dashboard: 400-800ms → 150-250ms (2.5x faster)
- Data transfer: ALL practitioners → 10 per page (90%+ reduction)
- Database queries: 7 → 1 per metrics request (85% reduction)
