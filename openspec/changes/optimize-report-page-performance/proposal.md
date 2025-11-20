# Proposal: Optimize Report Page Performance

## Why

The DonVi reporting system (implemented in `add-donvi-reporting-system`) is functional but exhibits performance bottlenecks that degrade user experience:

1. **Synchronous Audit Logging**: Every report request blocks the response while writing audit logs to the database, adding 50-200ms latency per request. With 4 report types per page, this means 200-800ms of unnecessary blocking per page visit.

2. **Eager Practitioner Loading**: The page fetches up to 1,000 practitioners on initial load (`/api/practitioners?limit=1000`), regardless of whether the user accesses the Practitioner Detail tab. This wastes 200-1000ms and 50-500KB of bandwidth for users who only view summary reports.

3. **No Query Result Caching**: Complex CTE queries (4+ joins) re-execute fully every 30 seconds per active user. For a unit with 100+ practitioners, compliance reports take 500-2000ms to execute, repeated unnecessarily.

4. **Large Unfiltered Datasets**: Reports return complete datasets without pagination. The Compliance Report returns all practitioners (100-1000+ records), resulting in 100-500KB JSON payloads and slow serialization.

5. **Missing Database Indexes**: Cannot verify if proper indexes exist on critical columns (`NhanVien.MaDonVi`, `GhiNhanHoatDong.MaNhanVien`, etc.). Without indexes, queries may perform full table scans.

**User Impact**: Initial page loads take 2-3 seconds; tab switching takes 1+ second even with client-side caching. For units with 500+ practitioners, the page feels sluggish and unresponsive.

## What Changes

### Priority 1: Async Audit Logging (HIGH IMPACT, LOW EFFORT)
- Make audit logging non-blocking in all report API routes
- Implement fire-and-forget pattern with error logging
- Expected improvement: **-100ms per request** (~400ms saved per page visit)

### Priority 2: Lazy Load Practitioners (MEDIUM IMPACT, LOW EFFORT)
- Only fetch practitioners list when Practitioner Detail tab is activated
- Add `enabled: selectedReport === 'practitioner'` to `useUnitPractitioners` hook
- Expected improvement: **-500ms initial page load** (for 500 practitioners)

### Priority 3: Add Server-Side Caching (HIGH IMPACT, MEDIUM EFFORT)
- Implement Redis/memory cache layer for report queries
- Cache report results for 5 minutes with unit-specific cache keys
- Expected improvement: **-800ms for cached requests** (90%+ hit rate expected)

### Priority 4: Add Pagination/Limits (MEDIUM IMPACT, MEDIUM EFFORT)
- Compliance Report: Paginate practitioner list (default 50, "Load More" button)
- Activity Report: Keep recent 10 activities, add "View All" expansion
- Timeline: Limit to 12 months (1 year) by default
- Expected improvement: **-60% payload size**, **-200ms serialization time**

### Priority 5: Verify/Add Database Indexes (CRITICAL IMPACT, HIGH EFFORT)
- Audit existing indexes on critical columns
- Add composite index: `(MaNhanVien, TrangThaiDuyet, NgayGhiNhan)` on `GhiNhanHoatDong`
- Add index on `NhanVien.MaDonVi` if missing
- Expected improvement: **-50-80% query time** (500ms → 100ms for large datasets)

### Priority 6: Optimize CTE Queries (MEDIUM IMPACT, HIGH EFFORT)
- Review `EXPLAIN ANALYZE` output for all report queries
- Refactor compliance report CTE to reduce subquery complexity
- Consider materialized views for credit calculations
- Expected improvement: **-20-40% query time**

### Priority 7: Request Deduplication (LOW IMPACT, LOW EFFORT)
- Configure TanStack Query to prevent refetch on mount/focus
- Deduplicate simultaneous requests during rapid tab switching
- Expected improvement: **-10-20ms** (edge cases only)

## Impact

### Affected Specs
- **dashboard**: Modifying performance requirements for DonVi reporting

### Affected Code

**Modified Files:**
- `src/app/api/reports/performance-summary/route.ts` - Async audit logging
- `src/app/api/reports/compliance/route.ts` - Async audit, caching, pagination
- `src/app/api/reports/activities/route.ts` - Async audit, caching, limits
- `src/app/api/reports/practitioner-details/route.ts` - Async audit, caching
- `src/components/reports/reports-page-client.tsx` - Lazy practitioner loading
- `src/hooks/use-unit-practitioners.ts` - Add enabled option
- `src/hooks/use-performance-summary.ts` - Configure caching behavior
- `src/hooks/use-compliance-report.ts` - Configure caching behavior
- `src/hooks/use-activity-report.ts` - Configure caching behavior
- `src/components/reports/compliance-report.tsx` - Add pagination UI
- `src/components/reports/activity-report.tsx` - Add "View All" expansion

**New Files:**
- `lib/cache/redis-client.ts` - Redis client singleton (if using Redis)
- `lib/cache/memory-cache.ts` - In-memory cache fallback (if not using Redis)
- `lib/utils/async-audit.ts` - Helper for non-blocking audit logging
- `migrations/add-report-indexes.sql` - Database index additions

**Database Changes:**
- Add index: `idx_nhanvien_madonvi` on `NhanVien(MaDonVi)`
- Add index: `idx_ghinhanhd_composite` on `GhiNhanHoatDong(MaNhanVien, TrangThaiDuyet, NgayGhiNhan)`
- Add index: `idx_ghinhanhd_ngayghinhan` on `GhiNhanHoatDong(NgayGhiNhan)`

### Dependencies Added
- `ioredis@^5.3.2` (optional, for Redis caching) - OR -
- `node-cache@^5.1.2` (for in-memory caching fallback)

### Breaking Changes
- None (performance optimizations only, backward compatible)

### Performance Targets
- **Initial page load**: 2.5s → 1.3s (**-48%**)
- **Tab switching (cached)**: 1.0s → 0.4s (**-60%**)
- **Report API response time**: 800ms → 300ms average (**-62%**)
- **Payload size (compliance)**: 300KB → 120KB (**-60%**)

### User Impact
- Dramatically faster report loading (2-3x improvement)
- Smoother tab switching experience
- Reduced bandwidth usage (especially on mobile)
- No visible changes to UI or functionality

### Timeline
- **Week 1** (Quick Wins): Priority 1 + Priority 2
- **Week 2** (Foundation): Priority 5 (Database Indexes)
- **Week 3** (Major Impact): Priority 3 (Caching Layer)
- **Week 4** (Polish): Priority 4 + Priority 6
