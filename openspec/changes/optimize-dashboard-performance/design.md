# Dashboard Performance Optimization Design

## Context

Current dashboard implementation has critical performance issues discovered through audit:
- Unit Metrics API executes 7 sequential database queries
- Practitioners list loads ALL records without pagination
- Practitioner dashboard makes 4 waterfalling API calls
- Client-side filtering downloads entire dataset then filters

**Constraints:**
- Must maintain backward compatibility for API consumers
- Cannot break existing dashboard functionality
- Must handle 1000+ practitioners per unit
- Database is PostgreSQL with support for CTEs and indexes

**Stakeholders:**
- Unit administrators (primary users affected)
- Practitioners (dashboard users)
- Database team (index management)
- DevOps (Redis deployment)

## Goals / Non-Goals

**Goals:**
- Reduce Unit Metrics API response time from 300-500ms to <100ms
- Reduce Practitioner Dashboard load time from 400-800ms to <300ms
- Implement pagination for practitioners list (10 items per page)
- Reduce database queries by 80%+ for dashboard loads
- Add caching layer for frequently accessed metrics

**Non-Goals:**
- Real-time updates (60s cache TTL is acceptable)
- Websocket connections for live data
- Complete dashboard redesign
- Migration of existing data format

## Decisions

### Decision 1: Use PostgreSQL CTEs for Query Optimization
**Why:** Combine 7 sequential queries into 1 with Common Table Expressions

**Alternatives considered:**
- Materialized views → Rejected: Adds complexity, stale data issues
- Separate cache table → Rejected: Cache invalidation complexity
- Keep separate queries → Rejected: Performance unacceptable

**Trade-offs:**
- ✅ Pro: Single database round-trip, parallel CTE execution
- ✅ Pro: Maintains transactional consistency
- ⚠️ Con: More complex SQL query
- ⚠️ Con: Harder to debug individual metrics

### Decision 2: Add Redis Caching Layer
**Why:** Reduce database load for frequently accessed dashboard metrics

**Configuration:**
- TTL: 60 seconds (balance freshness vs performance)
- Cache keys: `unit-metrics:{unitId}`, `practitioner-dashboard:{practitionerId}`
- Invalidation: Manual on data changes + TTL expiry

**Alternatives considered:**
- In-memory cache (node-cache) → Rejected: Not shared across instances
- No caching → Rejected: High database load
- Longer TTL (5 minutes) → Rejected: Too stale for user expectations

**Trade-offs:**
- ✅ Pro: 80-90% reduction in database load for repeat views
- ✅ Pro: <10ms response time on cache hits
- ⚠️ Con: Adds Redis dependency
- ⚠️ Con: Potential stale data (60s window)
- ⚠️ Con: Cache invalidation complexity

### Decision 3: Server-Side Pagination with 10 Items Per Page
**Why:** Current implementation loads ALL practitioners, causing memory and bandwidth issues

**Configuration:**
- Default limit: 10 items
- Maximum limit: 50 items
- Support offset and cursor-based pagination

**Alternatives considered:**
- Infinite scroll → Rejected: Complexity not justified
- Load all with virtualization → Rejected: Still transfers all data
- Larger page size (50) → Rejected: Slower initial load

**Trade-offs:**
- ✅ Pro: 90%+ reduction in data transfer
- ✅ Pro: Faster initial page load
- ✅ Pro: Scales to large units (10,000+ practitioners)
- ⚠️ Con: Extra clicks for users to see all data
- ⚠️ Con: Search requires pagination awareness

### Decision 4: Create Dedicated Practitioner Dashboard Endpoint
**Why:** Current implementation makes 4 sequential API calls with request waterfalling

**Approach:**
- New endpoint: `GET /api/dashboard/practitioner`
- Returns all dashboard data in single response
- Uses PostgreSQL CTEs to fetch all data in one query
- Includes: practitioner info, credit cycle, activities, notifications

**Alternatives considered:**
- Keep separate endpoints → Rejected: Request waterfalling
- GraphQL → Rejected: Adds framework complexity
- Batch API → Rejected: Still multiple round-trips

**Trade-offs:**
- ✅ Pro: 75% reduction in API calls (4 → 1)
- ✅ Pro: 2.5x faster initial load
- ✅ Pro: Eliminates request waterfalling
- ⚠️ Con: Larger response payload
- ⚠️ Con: Less granular caching

### Decision 5: Database Indexes
**Why:** Improve query performance for filtered columns

**Indexes to add:**
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_nhanvien_madonvi_trangthai 
  ON "NhanVien"("MaDonVi", "TrangThaiLamViec");

CREATE INDEX idx_ghinhan_manhanvien_trangthai 
  ON "GhiNhanHoatDong"("MaNhanVien", "TrangThaiDuyet");

-- Partial indexes for specific states
CREATE INDEX idx_ghinhan_choduyet 
  ON "GhiNhanHoatDong"("MaNhanVien")
  WHERE "TrangThaiDuyet" = 'ChoDuyet';
```

**Alternatives considered:**
- No indexes → Rejected: Table scans too slow
- Full-text search indexes → Rejected: Not needed for current use case
- Covering indexes → Deferred: Add if needed after monitoring

**Trade-offs:**
- ✅ Pro: 50-80% faster filtered queries
- ✅ Pro: Reduces table scan overhead
- ⚠️ Con: Increases write overhead (small impact)
- ⚠️ Con: Additional storage space

## Risks / Trade-offs

### Risk 1: Cache Invalidation Bugs
**Risk:** Stale data shown to users if cache not invalidated properly

**Mitigation:**
- Short TTL (60s) limits staleness window
- Manual invalidation on all data-modifying operations
- Cache bypass option for critical operations
- Monitoring for cache staleness reports

### Risk 2: Redis Availability
**Risk:** Redis downtime breaks dashboards

**Mitigation:**
- Graceful fallback to database queries
- Cache errors logged but don't fail requests
- Health checks for Redis connectivity
- Consider Redis Sentinel for HA (future)

### Risk 3: Breaking Changes
**Risk:** API response structure changes break existing clients

**Mitigation:**
- Maintain exact response structure for Unit Metrics API
- New practitioner dashboard endpoint doesn't affect existing endpoints
- Comprehensive integration tests
- Version API if needed in future

### Risk 4: Database Index Overhead
**Risk:** Indexes slow down write operations

**Mitigation:**
- Use `CREATE INDEX CONCURRENTLY` to avoid locks
- Monitor write performance before/after
- Can drop indexes if overhead too high
- Most dashboards are read-heavy, writes less frequent

### Risk 5: Query Complexity
**Risk:** Single complex CTE query harder to debug and maintain

**Mitigation:**
- Extensive query comments
- Query performance logging
- `EXPLAIN ANALYZE` tests in CI/CD
- Fallback to separate queries if needed

## Migration Plan

### Phase 1: Critical Fixes (Week 1)
1. Deploy optimized Unit Metrics API
2. Add pagination to unit admin dashboard
3. Monitor performance improvements
4. **Rollback:** Revert to 7 separate queries if issues

### Phase 2: High Priority (Week 2)  
1. Deploy practitioner dashboard API
2. Update practitioner dashboard component
3. Implement server-side filtering
4. **Rollback:** Keep using separate endpoints if issues

### Phase 3: Optimizations (Week 3)
1. Deploy Redis caching layer
2. Apply database indexes using `CONCURRENTLY`
3. Monitor cache hit rates and query performance
4. **Rollback:** Drop indexes if write overhead too high, disable cache if errors

### Database Migration Steps
```bash
# 1. Backup
pg_dump -U postgres -d healthcare_db > backup_$(date +%Y%m%d).sql

# 2. Apply indexes (non-blocking)
CREATE INDEX CONCURRENTLY idx_nhanvien_madonvi_trangthai 
  ON "NhanVien"("MaDonVi", "TrangThaiLamViec");

# 3. Verify index usage
EXPLAIN ANALYZE SELECT ...

# 4. Monitor
SELECT * FROM pg_stat_user_indexes 
WHERE tablename = 'NhanVien';
```

### Rollback Procedures
**Code rollback:**
```bash
git revert <commit-hash>
git push origin main
```

**Index rollback:**
```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_nhanvien_madonvi_trangthai;
```

**Cache rollback:**
```bash
# Disable caching via environment variable
REDIS_ENABLED=false
# Or clear cache
redis-cli FLUSHDB
```

## Open Questions

- [ ] What is acceptable cache staleness for unit metrics? (Proposed: 60s)
  - **Decision needed by:** Week 1, Day 1
  - **Blocker for:** Cache implementation

- [ ] Should we add monitoring/alerting for query performance?
  - **Decision needed by:** Week 3, Day 1
  - **Blocker for:** Production deployment

- [ ] Do we need WebSocket updates for real-time dashboard data?
  - **Decision:** NO for initial implementation, defer to future if needed

- [ ] Should pagination support cursor-based instead of offset?
  - **Decision needed by:** Week 1, Day 3
  - **Blocker for:** Pagination implementation

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Unit Metrics API p95 | 300-500ms | <150ms | APM monitoring |
| Practitioner Dashboard p95 | 400-800ms | <300ms | APM monitoring |
| DB queries per dashboard load | 9+ | 2-3 | Query logging |
| Cache hit rate | 0% | >70% | Redis metrics |
| Data transfer per page | ALL | 10 items | Network logs |
| User-reported slow dashboards | 5+/week | <1/week | Support tickets |
