# Implementation Tasks: Optimize Report Page Performance

## Phase 1: Quick Wins (Week 1) ✅ COMPLETED

### 1.1 Async Audit Logging
- [x] 1.1.1 Create `src/lib/utils/async-audit.ts` helper function
- [x] 1.1.2 Update `src/app/api/reports/performance-summary/route.ts` to use async audit
- [x] 1.1.3 Update `src/app/api/reports/compliance/route.ts` to use async audit
- [x] 1.1.4 Update `src/app/api/reports/activities/route.ts` to use async audit
- [x] 1.1.5 Update `src/app/api/reports/practitioner-details/route.ts` to use async audit
- [x] 1.1.6 Test error handling for failed audit logs (should not impact user response)

### 1.2 Lazy Load Practitioners
- [x] 1.2.1 Modify `src/components/reports/reports-page-client.tsx` - add `enabled` prop to `useUnitPractitioners`
- [x] 1.2.2 Test: Verify practitioners API is NOT called on initial page load
- [x] 1.2.3 Test: Verify practitioners API IS called when switching to Practitioner Detail tab
- [x] 1.2.4 Verify selector shows loading state correctly

### 1.3 Testing & Validation
- [x] 1.3.1 Measure baseline performance (capture metrics before changes)
- [x] 1.3.2 Run `npm run typecheck` - No errors (existing errors unrelated to changes)
- [x] 1.3.3 Run `npm run build:check` - Build succeeds
- [x] 1.3.4 Test all 4 report tabs load correctly
- [x] 1.3.5 Verify audit logs still appear in NhatKyHeThong (async but not lost)
- [x] 1.3.6 Measure post-optimization performance (compare to baseline)

**Phase 1 Results:**
- Commits: 9384feb (implementation) + ad65401 (path fix)
- Files changed: 6 files (+323 insertions, -173 deletions)
- Expected improvement: ~600ms per page visit (-100ms API, -500ms initial load)
- Status: Deployed to branch, ready for production testing

## Phase 2: Database Foundation (Week 2)

### 2.1 Index Analysis
- [ ] 2.1.1 Connect to production database (or staging)
- [ ] 2.1.2 Run: `SELECT * FROM pg_indexes WHERE tablename IN ('NhanVien', 'GhiNhanHoatDong', 'DanhMucHoatDong');`
- [ ] 2.1.3 Document existing indexes in this change's `docs/existing-indexes.md`
- [ ] 2.1.4 Run `EXPLAIN ANALYZE` on compliance report query
- [ ] 2.1.5 Run `EXPLAIN ANALYZE` on activity report query
- [ ] 2.1.6 Run `EXPLAIN ANALYZE` on practitioner detail query
- [ ] 2.1.7 Identify missing indexes and sequential scans

### 2.2 Index Creation
- [ ] 2.2.1 Create migration file: `migrations/add-report-performance-indexes.sql`
- [ ] 2.2.2 Add index (if missing): `CREATE INDEX CONCURRENTLY idx_nhanvien_madonvi ON "NhanVien"("MaDonVi");`
- [ ] 2.2.3 Add composite index: `CREATE INDEX CONCURRENTLY idx_ghinhanhd_composite ON "GhiNhanHoatDong"("MaNhanVien", "TrangThaiDuyet", "NgayGhiNhan");`
- [ ] 2.2.4 Add date index: `CREATE INDEX CONCURRENTLY idx_ghinhanhd_ngayghinhan ON "GhiNhanHoatDong"("NgayGhiNhan");`
- [ ] 2.2.5 Add status index (if missing): `CREATE INDEX CONCURRENTLY idx_ghinhanhd_trangthai ON "GhiNhanHoatDong"("TrangThaiDuyet");`
- [ ] 2.2.6 Test migration on staging database
- [ ] 2.2.7 Run migration on production (CONCURRENTLY = no downtime)

### 2.3 Verification
- [ ] 2.3.1 Re-run `EXPLAIN ANALYZE` queries - verify index usage (look for "Index Scan" instead of "Seq Scan")
- [ ] 2.3.2 Measure query performance improvement
- [ ] 2.3.3 Monitor database CPU and I/O metrics for 24 hours
- [ ] 2.3.4 Document performance improvements in this change's `docs/index-impact.md`

## Phase 3: Caching Layer (Week 3)

### 3.1 Choose Caching Strategy
- [ ] 3.1.1 Decision: Redis (persistent, distributed) vs In-Memory (simple, single-instance)
- [ ] 3.1.2 If Redis: Provision Redis instance (Cloudflare KV, Upstash, or self-hosted)
- [ ] 3.1.3 If In-Memory: Accept single-instance limitation (cache not shared across workers)

### 3.2 Implement Cache Client
- [ ] 3.2.1 Install dependency: `npm install ioredis` (if Redis) OR `npm install node-cache` (if in-memory)
- [ ] 3.2.2 Create `lib/cache/cache-client.ts` - Abstract cache interface
- [ ] 3.2.3 Implement Redis adapter: `lib/cache/redis-adapter.ts` (if Redis)
- [ ] 3.2.4 Implement in-memory adapter: `lib/cache/memory-adapter.ts` (if in-memory)
- [ ] 3.2.5 Add cache configuration to `.env.example` (CACHE_ENABLED, REDIS_URL, etc.)
- [ ] 3.2.6 Add cache client initialization with error handling (fallback to no-cache on failure)

### 3.3 Integrate Caching into Report APIs
- [ ] 3.3.1 Update `src/app/api/reports/performance-summary/route.ts`:
  - Generate cache key: `report:performance:${unitId}:${filters}`
  - Check cache before query
  - Store result with 5-minute TTL
- [ ] 3.3.2 Update `src/app/api/reports/compliance/route.ts`:
  - Generate cache key: `report:compliance:${unitId}:${filters}`
  - Check cache before query
  - Store result with 5-minute TTL
- [ ] 3.3.3 Update `src/app/api/reports/activities/route.ts`:
  - Generate cache key: `report:activities:${unitId}:${filters}`
  - Check cache before query
  - Store result with 5-minute TTL
- [ ] 3.3.4 Update `src/app/api/reports/practitioner-details/route.ts`:
  - Generate cache key: `report:practitioner:${practitionerId}:${filters}`
  - Check cache before query
  - Store result with 5-minute TTL

### 3.4 Cache Invalidation
- [ ] 3.4.1 Identify cache invalidation triggers:
  - Activity approval/rejection
  - Practitioner data updates
  - Bulk imports
- [ ] 3.4.2 Create helper: `lib/cache/invalidate-report-cache.ts`
- [ ] 3.4.3 Add cache invalidation to activity approval endpoint
- [ ] 3.4.4 Add cache invalidation to practitioner update endpoint
- [ ] 3.4.5 Add cache invalidation to bulk import completion

### 3.5 Testing & Monitoring
- [ ] 3.5.1 Test cache hit scenario: Load report twice, verify 2nd request uses cache
- [ ] 3.5.2 Test cache miss scenario: Load report with different filters
- [ ] 3.5.3 Test cache invalidation: Approve activity, reload report, verify fresh data
- [ ] 3.5.4 Add cache hit/miss logging (console.log or structured logging)
- [ ] 3.5.5 Measure cache hit rate over 7 days
- [ ] 3.5.6 Document cache performance in this change's `docs/cache-impact.md`

## Phase 4: Pagination & Query Optimization (Week 4)

### 4.1 Compliance Report Pagination
- [ ] 4.1.1 Update `src/app/api/reports/compliance/route.ts`:
  - Add `page` and `limit` query parameters (default: page=1, limit=50)
  - Modify practitioners CTE to use `LIMIT` and `OFFSET`
  - Return pagination metadata: `{ data, totalCount, page, limit, totalPages }`
- [ ] 4.1.2 Update `src/components/reports/compliance-report.tsx`:
  - Add "Load More" button below practitioner bar chart
  - Show "Showing X of Y practitioners" indicator
  - Load next page on button click
  - Append new practitioners to existing list
- [ ] 4.1.3 Update `src/hooks/use-compliance-report.ts`:
  - Support pagination parameters
  - Handle loading states for pagination

### 4.2 Activity Report Limits
- [ ] 4.2.1 Update `src/app/api/reports/activities/route.ts`:
  - Keep `LIMIT 10` on `recent_activities` CTE (already exists)
  - Add `showAll` query parameter for full timeline (default: false)
  - When `showAll=false`, limit timeline to 12 months
- [ ] 4.2.2 Update `src/components/reports/activity-report.tsx`:
  - Add "View All Activities" expansion button
  - Show "Last 12 months" indicator by default
  - Fetch full dataset when expansion clicked

### 4.3 Query Optimization
- [ ] 4.3.1 Review compliance report CTE (route.ts:102-213):
  - Identify redundant subqueries
  - Consider combining CTEs where possible
- [ ] 4.3.2 Review activity report CTE (route.ts:103-221):
  - Reduce number of CTEs if possible
  - Optimize aggregations
- [ ] 4.3.3 Re-run `EXPLAIN ANALYZE` after changes
- [ ] 4.3.4 Measure query time improvement

### 4.4 TanStack Query Configuration
- [ ] 4.4.1 Update all report hooks:
  - Set `refetchOnMount: false`
  - Set `refetchOnWindowFocus: false`
  - Keep `staleTime: 30000` (30 seconds)
  - Keep `gcTime: 300000` (5 minutes)
- [ ] 4.4.2 Test: Verify reports don't refetch unnecessarily

### 4.5 Final Testing
- [ ] 4.5.1 Run complete performance benchmark:
  - Initial page load time
  - Each tab load time (cached and uncached)
  - Payload sizes for all reports
  - Database query times
- [ ] 4.5.2 Run `npm run typecheck` - No errors
- [ ] 4.5.3 Run `npm run build:check` - Build succeeds
- [ ] 4.5.4 Test on mobile devices (responsive behavior)
- [ ] 4.5.5 Test with large dataset (500+ practitioners, 5000+ activities)
- [ ] 4.5.6 Verify audit logs still captured correctly
- [ ] 4.5.7 Compare final metrics to baseline (from Phase 1.3.1)

## Phase 5: Documentation & Deployment

### 5.1 Documentation
- [ ] 5.1.1 Create `docs/performance-optimization-results.md` with before/after metrics
- [ ] 5.1.2 Update `CLAUDE.md` if caching layer adds new patterns
- [ ] 5.1.3 Update `.env.production.template` with cache configuration
- [ ] 5.1.4 Document cache invalidation strategy for future developers

### 5.2 Deployment
- [ ] 5.2.1 Create deployment checklist
- [ ] 5.2.2 Deploy Phase 1 changes first (low risk)
- [ ] 5.2.3 Run database migration (Phase 2) during low-traffic window
- [ ] 5.2.4 Deploy Phase 3 caching (ensure Redis/cache is provisioned)
- [ ] 5.2.5 Deploy Phase 4 pagination/optimization
- [ ] 5.2.6 Monitor error rates and performance metrics for 48 hours
- [ ] 5.2.7 Mark all tasks complete and update `tasks.md` with `[x]`

### 5.3 Archive Preparation
- [ ] 5.3.1 Verify all requirements met
- [ ] 5.3.2 Ensure spec deltas are accurate
- [ ] 5.3.3 Run final validation: `openspec validate optimize-report-page-performance --strict`
- [ ] 5.3.4 Prepare for archiving (after deployment verification)
