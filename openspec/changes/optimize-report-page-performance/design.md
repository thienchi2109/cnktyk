# Design Document: Report Page Performance Optimization

## Context

The DonVi reporting system (implemented in `add-donvi-reporting-system`) provides comprehensive analytics across 4 report types:
- Performance Summary (unit-level KPIs)
- Compliance Report (practitioner compliance tracking)
- Activity Report (submission trends and metrics)
- Practitioner Detail Report (individual deep-dive)

### Current Performance Issues

**Audit Results** (as of 2025-11-20):

| Issue | Impact | Affected Routes |
|-------|--------|-----------------|
| Synchronous audit logging | +100ms per request | All 4 report APIs |
| Eager practitioner loading | +500ms initial load | reports-page-client.tsx |
| No query caching | +800ms per uncached request | All 4 report APIs |
| Large unfiltered datasets | +200ms serialization, 300KB payload | compliance, activities |
| Missing database indexes | +400ms query time (potential) | All database queries |

**Total Impact**: Initial page load takes 2.5-3 seconds; tab switching takes 1+ second.

### Constraints

1. **No Breaking Changes**: All optimizations must be backward compatible
2. **Cloudflare Workers**: Must be compatible with edge runtime (affects caching strategy)
3. **Multi-Tenant**: All caching must respect tenant isolation (`unitId`)
4. **Real-Time Requirements**: Reports should reflect data changes within 5 minutes
5. **Budget**: Prefer solutions that don't require new infrastructure (in-memory over Redis initially)

### Stakeholders

- **DonVi Users**: Expect fast, responsive reporting interface
- **Platform Engineers**: Maintain system performance and cost efficiency
- **Database Administrators**: Ensure database isn't overloaded by report queries

## Goals / Non-Goals

### Goals

1. **Reduce Initial Page Load Time**: 2.5s → 1.3s (48% improvement)
2. **Reduce Tab Switching Latency**: 1.0s → 0.4s (60% improvement for cached)
3. **Reduce Database Query Time**: 800ms → 300ms average (62% improvement)
4. **Reduce Payload Sizes**: 300KB → 120KB average (60% reduction)
5. **Maintain Data Freshness**: Max 5-minute stale data acceptable
6. **Zero Downtime**: All changes deployed without service interruption
7. **No Regressions**: Maintain existing functionality and data accuracy

### Non-Goals

1. **Real-Time Updates**: Not implementing WebSocket push updates (5-min staleness acceptable)
2. **Advanced Analytics**: No new report types or features in this change
3. **Historical Snapshots**: Not storing point-in-time report data (future enhancement)
4. **Export Functionality**: Not adding PDF/Excel export (deferred to Phase 5 of reporting system)
5. **Multi-Region Caching**: Not implementing distributed cache synchronization (single-region deployment)

## Technical Decisions

### Decision 1: Async Audit Logging Pattern

**Chosen Approach**: Fire-and-forget with error logging

```typescript
// lib/utils/async-audit.ts
export function asyncAuditLog(repo: NhatKyHeThongRepository, data: AuditLogData): void {
  repo.create(data).catch(err => {
    console.error('[Audit Log Failed]', {
      action: data.HanhDong,
      table: data.Bang,
      error: err.message,
    });
    // Consider: Send to error tracking service (Sentry, etc.)
  });
  // Returns immediately without awaiting
}
```

**Alternatives Considered**:
1. **Queue-Based (e.g., BullMQ)**: More robust, but requires Redis infrastructure and adds complexity. Rejected due to budget constraint and low risk of audit log failures in current system.
2. **Batch Writes**: Group audit logs and flush every N seconds. Rejected because adds complexity and state management without significant additional benefit.
3. **Separate Endpoint**: Client-side audit logging via separate API call. Rejected because increases client complexity and network requests.

**Rationale**: Fire-and-forget is simplest solution with minimal risk. Audit logs are important but non-critical (report still works if log fails). Current audit log repository is reliable (no known issues).

**Trade-offs**:
- ✅ **Pro**: Immediate 100ms improvement per request
- ✅ **Pro**: Simple implementation, no new dependencies
- ⚠️ **Con**: Lost audit logs if write fails (mitigated by error logging)
- ⚠️ **Con**: No backpressure mechanism if database slows down (acceptable risk)

### Decision 2: Caching Strategy

**Chosen Approach**: Start with in-memory caching, migrate to Redis if needed

**Phase 1** (Immediate): In-memory cache using `node-cache`
```typescript
// lib/cache/memory-cache.ts
import NodeCache from 'node-cache';

const reportCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Cleanup expired entries every 60s
  useClones: false, // Don't clone large objects
});

export function getCached<T>(key: string): T | undefined {
  return reportCache.get<T>(key);
}

export function setCached<T>(key: string, value: T): void {
  reportCache.set(key, value);
}

export function invalidatePattern(pattern: string): void {
  const keys = reportCache.keys().filter(k => k.startsWith(pattern));
  reportCache.del(keys);
}
```

**Phase 2** (If Needed): Migrate to Redis/Cloudflare KV
- Trigger: If cache hit rate < 70% OR multiple worker instances deployed
- Implementation: Redis adapter with same interface as memory cache

**Alternatives Considered**:
1. **Cloudflare KV**: Native Cloudflare solution, but eventual consistency (not suitable for 5-min freshness requirement). Rejected.
2. **Cloudflare Durable Objects**: Strong consistency, but higher latency and cost. Rejected for v1.
3. **Client-Side Only (TanStack Query)**: Already implemented, but not sufficient (still re-fetches every 30s). Augmenting, not replacing.

**Rationale**:
- In-memory cache is simplest and works for single-instance deployments (current state)
- Cloudflare Workers typically run as single instance per region
- Can migrate to Redis later if deployment scales to multiple instances

**Trade-offs**:
- ✅ **Pro**: Zero infrastructure cost, immediate implementation
- ✅ **Pro**: Sub-millisecond cache reads (in-process)
- ⚠️ **Con**: Cache not shared across workers (acceptable for single-instance)
- ⚠️ **Con**: Cache lost on worker restart (acceptable, warm up quickly)
- ❌ **Con**: Doesn't work for multi-region deployments (future concern)

**Cache Key Format**:
```typescript
// Pattern: report:{type}:{unitId}:{filters-hash}
const cacheKey = `report:compliance:${unitId}:${hashFilters(filters)}`;

// Invalidation pattern: report:*:{unitId}:*
const pattern = `report:*:${unitId}:*`;
```

### Decision 3: Database Indexing Strategy

**Chosen Approach**: Add composite and single-column indexes based on query patterns

**Indexes to Add**:
```sql
-- Composite index for most common query pattern (activity queries)
CREATE INDEX CONCURRENTLY idx_ghinhanhd_composite
  ON "GhiNhanHoatDong"("MaNhanVien", "TrangThaiDuyet", "NgayGhiNhan");

-- Single-column indexes for filtering and joins
CREATE INDEX CONCURRENTLY idx_nhanvien_madonvi
  ON "NhanVien"("MaDonVi");

CREATE INDEX CONCURRENTLY idx_ghinhanhd_ngayghinhan
  ON "GhiNhanHoatDong"("NgayGhiNhan");

-- Status index for approval queries
CREATE INDEX CONCURRENTLY idx_ghinhanhd_trangthai
  ON "GhiNhanHoatDong"("TrangThaiDuyet");
```

**Alternatives Considered**:
1. **Partial Indexes**: e.g., `WHERE "TrangThaiDuyet" = 'DaDuyet'`. Rejected because adds maintenance complexity and other statuses also filtered frequently.
2. **Covering Indexes**: Include all columns in index to avoid heap lookups. Rejected because indexes would be too large (multiple text columns).
3. **Materialized Views**: Pre-compute report aggregations. Rejected because adds complexity and refresh overhead; caching layer provides similar benefit.

**Rationale**:
- Composite index on `GhiNhanHoatDong` covers most common query pattern (join + filter by status + sort by date)
- Single-column indexes provide flexibility for queries that filter by only one column
- `CONCURRENTLY` flag ensures zero downtime during index creation

**Trade-offs**:
- ✅ **Pro**: 50-80% query time reduction (based on similar optimizations in other projects)
- ✅ **Pro**: Zero downtime with CONCURRENTLY
- ⚠️ **Con**: Increased write overhead (~5-10% slower INSERTs/UPDATEs)
- ⚠️ **Con**: Additional storage for indexes (~20% of table size)

**Verification Plan**:
```sql
-- Before: Check for sequential scans
EXPLAIN ANALYZE
SELECT ... FROM "GhiNhanHoatDong"
WHERE "MaNhanVien" = '...' AND "TrangThaiDuyet" = 'DaDuyet';

-- After: Verify index scan
EXPLAIN ANALYZE [same query];
-- Should show: "Index Scan using idx_ghinhanhd_composite"
```

### Decision 4: Pagination Strategy

**Chosen Approach**: Offset-based pagination with "Load More" pattern

**Compliance Report**:
```typescript
// API: /api/reports/compliance?page=1&limit=50
const offset = (page - 1) * limit;

const query = `
  SELECT * FROM practitioner_credits
  ORDER BY total_credits DESC
  LIMIT $1 OFFSET $2
`;

return {
  data: practitioners,
  pagination: {
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    hasMore: page < Math.ceil(totalCount / limit),
  },
};
```

**UI**: "Load More" button (not infinite scroll)

**Alternatives Considered**:
1. **Cursor-Based Pagination**: More efficient for large datasets, but complex to implement with arbitrary sorting. Rejected for v1.
2. **Infinite Scroll**: Better UX for mobile, but harder to navigate and track position. Rejected (users prefer explicit control for data analysis).
3. **Virtual Scrolling**: Renders only visible rows, excellent performance. Rejected due to implementation complexity with charts (would need major refactor).

**Rationale**:
- Offset pagination is simplest and works well for < 1000 practitioners
- "Load More" gives users control and clear indication of data boundaries
- Most units have < 200 practitioners, so pagination rarely needed beyond 2-3 pages

**Trade-offs**:
- ✅ **Pro**: Immediate payload reduction (300KB → 100KB for 50 practitioners)
- ✅ **Pro**: Simpler implementation than cursor-based
- ⚠️ **Con**: Offset queries get slower for high page numbers (acceptable for max ~20 pages)
- ⚠️ **Con**: Results can shift if data changes between pages (acceptable risk)

### Decision 5: Query Optimization Approach

**Chosen Approach**: Incremental CTE refactoring with EXPLAIN ANALYZE validation

**Process**:
1. Baseline: Run `EXPLAIN ANALYZE` on current queries, document costs
2. Identify: Find most expensive operations (usually sorts, aggregates, joins)
3. Refactor: Simplify CTEs by combining steps where possible
4. Validate: Re-run EXPLAIN ANALYZE, verify improvement
5. Test: Ensure results match original query (data accuracy)

**Example Optimization** (Compliance Report):
```sql
-- BEFORE: 4 separate CTEs
WITH practitioner_credits AS (...),
     categorized_practitioners AS (...),
     status_distribution AS (...),
     summary_stats AS (...)
SELECT ...

-- AFTER: Combine categorization with aggregation
WITH practitioner_stats AS (
  SELECT
    ...,
    CASE
      WHEN total_credits >= 108 THEN 'compliant'
      WHEN total_credits >= 84 THEN 'at_risk'
      ELSE 'critical'
    END as status,
    -- Aggregate immediately
    COUNT(*) OVER (PARTITION BY status) as status_count
  FROM ...
)
SELECT ...
```

**Alternatives Considered**:
1. **Rewrite with Subqueries**: CTEs can sometimes be optimized better as subqueries. Will test both approaches.
2. **Denormalization**: Store computed credits in `NhanVien` table. Rejected due to data consistency concerns (would need triggers).
3. **Summary Tables**: Separate table with pre-aggregated data. Rejected due to maintenance overhead and staleness.

**Rationale**:
- Incremental approach reduces risk of breaking changes
- EXPLAIN ANALYZE provides objective measurement
- CTEs are generally more readable than complex subqueries (unless performance difference is significant)

## Risks / Trade-offs

### Risk 1: Cache Invalidation Bugs
**Description**: Stale data shown in reports after activity approvals or practitioner updates.

**Mitigation**:
- Comprehensive cache invalidation in all mutation endpoints
- Clear cache key patterns (easy to wipe entire unit's cache)
- 5-minute TTL provides automatic recovery
- Add `?nocache=1` query parameter for debugging (bypass cache)

**Monitoring**: Track complaints about "data not updating" via audit logs and support tickets.

### Risk 2: Database Index Overhead
**Description**: New indexes slow down writes (activity submissions, practitioner updates).

**Mitigation**:
- Use `CONCURRENTLY` to avoid locking during creation
- Monitor write latency before/after index addition
- Indexes are on low-write tables (activities submitted less frequently than read)

**Rollback Plan**: Drop indexes if write latency increases > 20%.

### Risk 3: Memory Cache Exhaustion
**Description**: In-memory cache grows too large, causes worker to crash or restart.

**Mitigation**:
- Set TTL (5 minutes) to auto-expire entries
- Estimate max cache size: 4 reports × 100 units × 200KB = 80MB (acceptable)
- `node-cache` has built-in memory limits (can configure max keys)

**Monitoring**: Track worker memory usage in Cloudflare dashboard.

### Risk 4: Async Audit Log Loss
**Description**: Failed audit logs are lost silently.

**Mitigation**:
- Log errors to console (captured by Cloudflare Logs)
- Consider adding Sentry integration for critical errors
- Audit logs are non-critical (nice-to-have, not required for functionality)

**Acceptance**: Some audit log loss is acceptable trade-off for 100ms latency reduction.

## Migration Plan

### Phase 1: Quick Wins (Week 1)
1. Deploy async audit logging - **No migration needed**
2. Deploy lazy practitioner loading - **No migration needed**
3. **Rollback**: Revert commits if issues arise (no data changes)

### Phase 2: Database Indexes (Week 2)
1. **Pre-deployment**: Take database snapshot/backup
2. **Deployment Window**: Run migrations during low-traffic hours (2-4 AM)
3. **Monitoring**: Watch query performance for 24 hours
4. **Rollback**: Drop indexes if write latency increases significantly
   ```sql
   DROP INDEX CONCURRENTLY idx_ghinhanhd_composite;
   -- etc.
   ```

### Phase 3: Caching (Week 3)
1. Deploy cache implementation - **No migration needed**
2. **Warm-up Period**: Cache starts empty, fills organically over 1-2 hours
3. **Monitoring**: Track cache hit/miss rates via logs
4. **Rollback**: Set `CACHE_ENABLED=false` in environment variables

### Phase 4: Pagination (Week 4)
1. Deploy pagination endpoints - **Backward compatible** (default to limit=1000 if not specified)
2. Deploy UI changes - **Graceful degradation** (works with old API)
3. **Rollback**: Revert frontend changes, keep backend pagination (harmless)

### Zero-Downtime Guarantee
- All database operations use `CONCURRENTLY`
- No table locks or schema changes
- API changes are backward compatible (new query params optional)
- Frontend changes are progressive enhancements

## Open Questions

### Q1: Redis vs In-Memory for Production?
**Status**: Deferred to after Phase 3 deployment.

**Decision Criteria**:
- If cache hit rate < 70% → Investigate Redis
- If multiple worker instances deployed → Migrate to Redis
- If memory usage > 100MB → Migrate to Redis

### Q2: Should we add report scheduling/email delivery?
**Status**: Out of scope for this change.

**Reasoning**: Focus on interactive report performance first. Email delivery is separate feature (future enhancement).

### Q3: What about mobile app performance?
**Status**: In scope - all optimizations benefit mobile.

**Notes**: Reduced payload sizes especially beneficial for mobile networks. Consider adding `?mobile=1` param for even more aggressive limits (future).

### Q4: How to handle cache warming on deployment?
**Status**: Acceptable to start cold.

**Reasoning**: First few requests will be slow (cache miss), but fills quickly. Most units only access reports occasionally (not real-time).

## Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Baseline | Target | How to Measure |
|--------|----------|--------|----------------|
| Initial Page Load | 2.5s | 1.3s | Chrome DevTools Network tab (finish time) |
| Tab Switch (cached) | 1.0s | 0.4s | Network tab (304 or cache hit) |
| API Response Time | 800ms | 300ms | Server logs (time from request to response) |
| Payload Size | 300KB | 120KB | Network tab (response size) |
| Database Query Time | 500ms | 150ms | PostgreSQL logs or EXPLAIN ANALYZE |
| Cache Hit Rate | N/A | > 80% | Application logs (cache.get success rate) |

### Monitoring Plan

**Week 1-2**: Baseline measurements
- Capture current performance metrics
- Document user complaints about slowness

**Week 3-4**: Post-optimization measurements
- Re-capture all metrics
- Calculate improvements
- Document in `docs/performance-optimization-results.md`

**Ongoing**: Production monitoring
- Cloudflare Analytics (page load times)
- Database slow query logs
- Cache hit/miss rates in application logs
- User feedback via support tickets

### Success Criteria

**Must Have** (Required for success):
- ✅ Initial page load < 1.5s (target: 1.3s)
- ✅ Zero data accuracy regressions
- ✅ Zero downtime during deployment
- ✅ All report types still functional

**Should Have** (Nice to have):
- ✅ Cache hit rate > 80%
- ✅ Database query time < 200ms
- ✅ Reduced user complaints about slowness

**Could Have** (Bonus):
- ✅ Even better performance on mobile
- ✅ Improved SEO scores (faster page loads)
