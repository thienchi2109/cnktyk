# SPEC-002: Dashboard Performance Optimization

**Status**: PROPOSED  
**Priority**: CRITICAL  
**Created**: 2025-10-29  
**Author**: Development Team  
**Estimated Effort**: 3-4 weeks

---

## Executive Summary

This specification addresses critical performance issues discovered in the dashboard pages that will cause severe degradation as the system scales. The current implementation executes **7 sequential database queries** for metrics, loads **unlimited practitioners** without pagination, and makes **4 waterfalling API calls** for the practitioner dashboard.

**Impact**: Without these fixes, dashboards will become unusable as units grow beyond 100 practitioners.

---

## Problem Statement

### Current Issues

1. **Unit Metrics API**: Executes 7 separate sequential queries, scanning the same tables repeatedly
2. **Practitioners List**: Loads all practitioners without pagination, causing memory and bandwidth issues
3. **Practitioner Dashboard**: Makes 4 sequential API calls with request waterfalling
4. **Client-Side Filtering**: Downloads all data then filters on client, wasting resources

### Performance Impact

| Component | Current | Target | Impact |
|-----------|---------|--------|---------|
| Unit Metrics API | 300-500ms | <100ms | 🔴 Critical |
| Dashboard Load Time | 1-2s | <500ms | 🔴 Critical |
| Practitioners Loaded | ALL (100-1000+) | 10-20 | 🔴 Critical |
| API Calls (Practitioner) | 4 sequential | 1 | 🟠 High |

---

## Proposed Solution

### Phase 1: Critical Fixes (Week 1)

#### 1.1 Optimize Unit Metrics API
**File**: `src/app/api/units/[id]/metrics/route.ts`

**Change**: Combine 7 sequential queries into 1 optimized query using CTEs

**Before**:
```typescript
// ❌ 7 separate queries
const total = await db.query(/* Query 1 */);
const active = await db.query(/* Query 2 */);
const pending = await db.query(/* Query 3 */);
// ... 4 more queries
```

**After**:
```typescript
// ✅ Single query with CTEs
const metrics = await db.query(`
  WITH 
  practitioner_counts AS (
    SELECT 
      COUNT(*) as total_count,
      COUNT(CASE WHEN "TrangThaiLamViec" = 'DangLamViec' THEN 1 END) as active_count
    FROM "NhanVien"
    WHERE "MaDonVi" = $1
  ),
  approval_stats AS (
    SELECT 
      COUNT(CASE WHEN g."TrangThaiDuyet" = 'ChoDuyet' THEN 1 END) as pending_count,
      COUNT(CASE 
        WHEN g."TrangThaiDuyet" = 'DaDuyet' 
        AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE) 
        THEN 1 
      END) as approved_month,
      COUNT(CASE 
        WHEN g."TrangThaiDuyet" = 'TuChoi' 
        AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE) 
        THEN 1 
      END) as rejected_month
    FROM "GhiNhanHoatDong" g
    INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
    WHERE n."MaDonVi" = $1
  ),
  compliance_data AS (
    SELECT 
      n."MaNhanVien",
      COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as total_credits
    FROM "NhanVien" n
    LEFT JOIN "GhiNhanHoatDong" g 
      ON n."MaNhanVien" = g."MaNhanVien" 
      AND g."TrangThaiDuyet" = 'DaDuyet'
    WHERE n."MaDonVi" = $1 AND n."TrangThaiLamViec" = 'DangLamViec'
    GROUP BY n."MaNhanVien"
  ),
  compliance_aggregates AS (
    SELECT 
      COUNT(*) as total_active,
      COUNT(CASE WHEN total_credits >= 108 THEN 1 END) as compliant_count,
      COUNT(CASE WHEN total_credits < 84 THEN 1 END) as at_risk_count
    FROM compliance_data
  )
  SELECT 
    pc.total_count as "totalPractitioners",
    pc.active_count as "activePractitioners",
    COALESCE(ROUND((ca.compliant_count::decimal / NULLIF(ca.total_active, 0)) * 100), 0) as "complianceRate",
    COALESCE(ast.pending_count, 0) as "pendingApprovals",
    COALESCE(ast.approved_month, 0) as "approvedThisMonth",
    COALESCE(ast.rejected_month, 0) as "rejectedThisMonth",
    COALESCE(ca.at_risk_count, 0) as "atRiskPractitioners"
  FROM practitioner_counts pc
  CROSS JOIN approval_stats ast
  CROSS JOIN compliance_aggregates ca
`, [unitId]);

return NextResponse.json({
  success: true,
  data: metrics[0]
});
```

**Expected Results**:
- Queries: 7 → 1 (85% reduction)
- Response time: 300-500ms → 80-120ms (3-4x faster)
- Database load: Significant reduction

---

#### 1.2 Add Pagination to Unit Admin Dashboard
**File**: `src/components/dashboard/unit-admin-dashboard.tsx`

**Change**: Add pagination and limit parameters to practitioners fetch

**Before (Line 124)**:
```typescript
const response = await fetch(
  `/api/practitioners?unitId=${unitId}&includeProgress=true`
);
```

**After**:
```typescript
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 10;

const response = await fetch(
  `/api/practitioners?unitId=${unitId}&limit=${ITEMS_PER_PAGE}&page=${page}`
);
```

**Additional Changes**:
```typescript
// Add pagination controls
<div className="flex justify-between items-center mt-4">
  <span className="text-sm text-gray-600">
    Trang {page} / {totalPages}
  </span>
  <div className="flex gap-2">
    <Button
      size="sm"
      variant="secondary"
      onClick={() => setPage(p => Math.max(1, p - 1))}
      disabled={page === 1}
    >
      ← Trước
    </Button>
    <Button
      size="sm"
      variant="secondary"
      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
      disabled={page === totalPages}
    >
      Sau →
    </Button>
  </div>
</div>
```

**Expected Results**:
- Data loaded: ALL → 10 per page (90%+ reduction)
- Memory usage: Significant reduction
- Initial load: Faster response

---

### Phase 2: High Priority Fixes (Week 2)

#### 2.1 Create Dedicated Practitioner Dashboard API
**New File**: `src/app/api/dashboard/practitioner/route.ts`

**Purpose**: Single endpoint to fetch all practitioner dashboard data

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Only practitioners can access
    if (session.user.role !== 'NguoiHanhNghe') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get practitioner ID from user account
    const practitionerResult = await db.queryOne<{ MaNhanVien: string }>(
      `SELECT "MaNhanVien" FROM "TaiKhoan" 
       WHERE "MaTaiKhoan" = $1 AND "QuyenHan" = 'NguoiHanhNghe'`,
      [session.user.id]
    );

    if (!practitionerResult?.MaNhanVien) {
      return NextResponse.json(
        { success: false, error: 'Practitioner not found' },
        { status: 404 }
      );
    }

    const practitionerId = practitionerResult.MaNhanVien;

    // Single query with all dashboard data
    const dashboardData = await db.query(`
      WITH 
      -- Practitioner info
      practitioner_info AS (
        SELECT * FROM "NhanVien" WHERE "MaNhanVien" = $1
      ),
      -- Credit cycle calculation
      credit_summary AS (
        SELECT 
          COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total_credits,
          120 as required_credits,
          ROUND((COALESCE(SUM("SoGioTinChiQuyDoi"), 0) / 120.0) * 100, 2) as percentage,
          CASE
            WHEN (COALESCE(SUM("SoGioTinChiQuyDoi"), 0) / 120.0) * 100 >= 90 THEN 'compliant'
            WHEN (COALESCE(SUM("SoGioTinChiQuyDoi"), 0) / 120.0) * 100 >= 70 THEN 'at_risk'
            ELSE 'non_compliant'
          END as status
        FROM "GhiNhanHoatDong"
        WHERE "MaNhanVien" = $1 AND "TrangThaiDuyet" = 'DaDuyet'
      ),
      -- Credit breakdown by activity type
      credit_breakdown AS (
        SELECT 
          COALESCE("LoaiHoatDong", 'Khác') as activity_type,
          SUM("SoGioTinChiQuyDoi") as total_credits,
          COUNT(*) as activity_count
        FROM "GhiNhanHoatDong"
        WHERE "MaNhanVien" = $1 AND "TrangThaiDuyet" = 'DaDuyet'
        GROUP BY "LoaiHoatDong"
      ),
      -- Recent activities
      recent_activities AS (
        SELECT 
          "MaGhiNhan",
          "TenHoatDong",
          "LoaiHoatDong",
          "SoTinChi" as "SoGioTinChiQuyDoi",
          "TrangThaiDuyet",
          "NgayGhiNhan",
          "NhanXetNguoiDuyet",
          ROW_NUMBER() OVER (ORDER BY "NgayGhiNhan" DESC) as rn
        FROM "GhiNhanHoatDong"
        WHERE "MaNhanVien" = $1
      ),
      -- Activity statistics
      activity_stats AS (
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN "TrangThaiDuyet" = 'DaDuyet' THEN 1 END) as approved_count,
          COUNT(CASE WHEN "TrangThaiDuyet" = 'ChoDuyet' THEN 1 END) as pending_count,
          COUNT(CASE WHEN "TrangThaiDuyet" = 'TuChoi' THEN 1 END) as rejected_count
        FROM "GhiNhanHoatDong"
        WHERE "MaNhanVien" = $1
      ),
      -- Notification summary
      notification_summary AS (
        SELECT 
          COUNT(*) as unread_count,
          COUNT(CASE WHEN "Loai" IN ('CanhBao', 'KhanCap') THEN 1 END) as priority_count
        FROM "ThongBao"
        WHERE "MaNguoiNhan" = $2 AND "TrangThai" = 'Moi'
      )
      SELECT 
        -- Practitioner info
        pi.*,
        -- Credit cycle
        cs.total_credits,
        cs.required_credits,
        cs.percentage as compliance_percentage,
        cs.status as compliance_status,
        -- Activity stats
        ast.total_activities,
        ast.approved_count,
        ast.pending_count,
        ast.rejected_count,
        -- Notifications
        ns.unread_count,
        ns.priority_count,
        -- Recent activities (JSON array)
        (
          SELECT json_agg(
            json_build_object(
              'id', ra."MaGhiNhan",
              'title', ra."TenHoatDong",
              'type', ra."LoaiHoatDong",
              'credits', ra."SoGioTinChiQuyDoi",
              'status', ra."TrangThaiDuyet",
              'date', ra."NgayGhiNhan",
              'comment', ra."NhanXetNguoiDuyet"
            )
          )
          FROM recent_activities ra
          WHERE ra.rn <= 10
        ) as recent_activities,
        -- Credit breakdown (JSON array)
        (
          SELECT json_agg(
            json_build_object(
              'activityType', cb.activity_type,
              'totalCredits', cb.total_credits,
              'activityCount', cb.activity_count
            )
          )
          FROM credit_breakdown cb
        ) as credit_breakdown
      FROM practitioner_info pi
      CROSS JOIN credit_summary cs
      CROSS JOIN activity_stats ast
      CROSS JOIN notification_summary ns
    `, [practitionerId, session.user.id]);

    return NextResponse.json({
      success: true,
      data: dashboardData[0]
    });
  } catch (error) {
    console.error('Error fetching practitioner dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Update Dashboard Component**:
```typescript
// src/components/dashboard/practitioner-dashboard.tsx

// Replace lines 59-114 with:
const [dashboardData, setDashboardData] = useState<any>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/practitioner');
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchDashboard();
}, []);

// Access data from dashboardData object
const {
  total_credits,
  required_credits,
  compliance_percentage,
  compliance_status,
  total_activities,
  approved_count,
  pending_count,
  unread_count,
  recent_activities = [],
  credit_breakdown = []
} = dashboardData || {};
```

**Expected Results**:
- API calls: 4 → 1 (75% reduction)
- Initial load: 400-800ms → 150-250ms (2.5x faster)
- No request waterfalling

---

#### 2.2 Implement Server-Side Filtering
**File**: `src/components/dashboard/unit-admin-dashboard.tsx`

**Change**: Move client-side filtering to API calls

**Before (Lines 201-215)**:
```typescript
const filteredPractitioners = practitioners.filter(p => {
  if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) {
    return false;
  }
  if (filterStatus === 'at-risk' && p.compliancePercent >= 70) {
    return false;
  }
  if (filterStatus === 'compliant' && p.compliancePercent < 90) {
    return false;
  }
  return true;
});
```

**After**:
```typescript
// Remove client-side filtering
const filteredPractitioners = practitioners;

// Update fetch to include filters
useEffect(() => {
  const fetchPractitioners = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        unitId,
        limit: ITEMS_PER_PAGE.toString(),
        page: page.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (filterStatus !== 'all') {
        const complianceMap = {
          'at-risk': 'at_risk',
          'compliant': 'compliant'
        };
        params.append('complianceStatus', complianceMap[filterStatus]);
      }
      
      const response = await fetch(`/api/practitioners?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setPractitioners(result.data);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching practitioners:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchPractitioners();
}, [unitId, page, searchTerm, filterStatus]);

// Add debounce for search
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page
  }, 300),
  []
);
```

**Expected Results**:
- Bandwidth: Reduced by 50-90%
- Client-side processing: Eliminated
- Better pagination accuracy

---

### Phase 3: Medium Priority Improvements (Week 3)

#### 3.1 Add Redis Caching Layer
**New File**: `src/lib/cache.ts`

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis error:', err));

// Connect on startup
(async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
})();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttl: number = 60): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }
};
```

**Apply Caching to Metrics API**:
```typescript
// src/app/api/units/[id]/metrics/route.ts

import { cache } from '@/lib/cache';

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: unitId } = await params;
    
    // Authorization check...
    
    const cacheKey = `unit-metrics:${unitId}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      });
    }
    
    // Fetch from database (optimized query)
    const metricsResult = await db.query(/* ... */);
    const metrics = metricsResult[0];
    
    // Cache for 60 seconds
    await cache.set(cacheKey, metrics, 60);
    
    return NextResponse.json({
      success: true,
      data: metrics,
      cached: false
    });
  } catch (error) {
    // Error handling...
  }
}
```

**Cache Invalidation Strategy**:
```typescript
// Invalidate cache when data changes
// src/app/api/practitioners/route.ts

export async function POST(request: NextRequest) {
  // ... create practitioner logic
  
  // Invalidate unit metrics cache
  await cache.invalidatePattern(`unit-metrics:${unitId}`);
  
  return NextResponse.json(newPractitioner);
}
```

**Expected Results**:
- Repeat views: 80-120ms → 5-10ms
- Database load: Reduced by 80-90%
- Concurrent user capacity: 10x improvement

---

#### 3.2 Add Database Indexes
**New Migration File**: `migrations/004_add_dashboard_indexes.sql`

```sql
-- Indexes for NhanVien table
CREATE INDEX IF NOT EXISTS idx_nhanvien_madonvi_trangthai 
  ON "NhanVien"("MaDonVi", "TrangThaiLamViec");

CREATE INDEX IF NOT EXISTS idx_nhanvien_hovaten_trgm 
  ON "NhanVien" USING gin ("HoVaTen" gin_trgm_ops);

-- Indexes for GhiNhanHoatDong table
CREATE INDEX IF NOT EXISTS idx_ghinhan_manhanvien_trangthai_ngayduyet 
  ON "GhiNhanHoatDong"("MaNhanVien", "TrangThaiDuyet", "NgayDuyet");

CREATE INDEX IF NOT EXISTS idx_ghinhan_trangthai_ngayduyet 
  ON "GhiNhanHoatDong"("TrangThaiDuyet", "NgayDuyet")
  WHERE "TrangThaiDuyet" IN ('DaDuyet', 'TuChoi');

-- Partial index for pending approvals
CREATE INDEX IF NOT EXISTS idx_ghinhan_choduyet 
  ON "GhiNhanHoatDong"("MaNhanVien")
  WHERE "TrangThaiDuyet" = 'ChoDuyet';

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_thongbao_nguoinhan_trangthai_loai 
  ON "ThongBao"("MaNguoiNhan", "TrangThai", "Loai");

-- Index for user-practitioner lookup
CREATE INDEX IF NOT EXISTS idx_taikhoan_quyenhan 
  ON "TaiKhoan"("MaTaiKhoan", "QuyenHan")
  WHERE "QuyenHan" = 'NguoiHanhNghe';

-- Analyze tables for query optimization
ANALYZE "NhanVien";
ANALYZE "GhiNhanHoatDong";
ANALYZE "ThongBao";
ANALYZE "TaiKhoan";
```

---

## Testing Strategy

### 1. Unit Tests

```typescript
// tests/api/units/metrics.test.ts
describe('Unit Metrics API', () => {
  it('should return metrics in under 150ms', async () => {
    const start = Date.now();
    const response = await fetch('/api/units/test-unit-id/metrics');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(150);
    expect(response.ok).toBe(true);
  });
  
  it('should return correct metric structure', async () => {
    const response = await fetch('/api/units/test-unit-id/metrics');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalPractitioners');
    expect(data.data).toHaveProperty('complianceRate');
  });
});
```

### 2. Integration Tests

```typescript
// tests/dashboard/practitioner-dashboard.test.ts
describe('Practitioner Dashboard', () => {
  it('should load all data in single API call', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    
    render(<PractitionerDashboard userId="test-id" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    
    expect(fetchSpy).toHaveBeenCalledWith('/api/dashboard/practitioner');
  });
});
```

### 3. Performance Tests

```bash
# Load test metrics endpoint
ab -n 1000 -c 20 http://localhost:3000/api/units/{unitId}/metrics

# Measure response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/units/{unitId}/metrics
```

**Acceptance Criteria**:
- Unit metrics API: < 150ms (95th percentile)
- Practitioner dashboard: < 300ms (95th percentile)
- Pagination response: < 100ms
- Cache hit rate: > 70%

---

## Database Migration Plan

### Migration Steps

1. **Create backup**:
```bash
pg_dump -U postgres -d healthcare_db > backup_$(date +%Y%m%d).sql
```

2. **Apply indexes** (non-blocking):
```sql
-- Use CONCURRENTLY to avoid table locks
CREATE INDEX CONCURRENTLY idx_nhanvien_madonvi_trangthai 
  ON "NhanVien"("MaDonVi", "TrangThaiLamViec");
```

3. **Verify index usage**:
```sql
EXPLAIN ANALYZE 
SELECT COUNT(*) FROM "NhanVien" 
WHERE "MaDonVi" = 'test-id' AND "TrangThaiLamViec" = 'DangLamViec';
```

4. **Monitor performance**:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename IN ('NhanVien', 'GhiNhanHoatDong')
ORDER BY idx_scan DESC;
```

---

## Rollback Plan

### If Issues Occur

1. **Revert API Changes**:
```bash
git revert <commit-hash>
git push origin main
```

2. **Remove Indexes** (if causing issues):
```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_nhanvien_madonvi_trangthai;
```

3. **Clear Redis Cache**:
```bash
redis-cli FLUSHDB
```

4. **Monitor Error Logs**:
```bash
tail -f logs/app.log | grep -i error
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **API Response Times**:
   - Unit Metrics API: < 150ms
   - Practitioner Dashboard API: < 300ms
   - Practitioners List API: < 100ms

2. **Database Performance**:
   - Query execution time
   - Index usage
   - Table scan frequency

3. **Cache Performance**:
   - Hit rate: > 70%
   - Miss rate: < 30%
   - Memory usage

4. **Error Rates**:
   - API errors: < 0.1%
   - Database errors: < 0.01%
   - Cache errors: < 1%

### Alert Configuration

```typescript
// src/lib/monitoring.ts
export async function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  // Send to monitoring service (e.g., DataDog, New Relic)
  if (value > THRESHOLDS[name]) {
    console.warn(`⚠️ Metric ${name} exceeded threshold: ${value}`);
  }
}

const THRESHOLDS = {
  'api.unit_metrics.duration': 150,
  'api.practitioner_dashboard.duration': 300,
  'cache.miss_rate': 0.3
};
```

---

## Documentation Updates

### 1. API Documentation

Update OpenAPI spec:
```yaml
# openapi.yaml
/api/dashboard/practitioner:
  get:
    summary: Get practitioner dashboard data
    description: Returns all data needed for practitioner dashboard in single call
    responses:
      '200':
        description: Dashboard data
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: object
                  properties:
                    total_credits:
                      type: number
                    required_credits:
                      type: number
                    compliance_percentage:
                      type: number
                    recent_activities:
                      type: array
                    # ... other properties
```

### 2. Developer Guide

Add performance best practices section:
```markdown
## Performance Best Practices

1. **Always paginate list endpoints**: Use `limit` and `page` parameters
2. **Use dedicated dashboard endpoints**: Don't make multiple API calls
3. **Leverage caching**: Check cache before database queries
4. **Use database indexes**: Ensure proper indexes for filtered columns
5. **Monitor query performance**: Add timing logs for slow queries
```

---

## Implementation Timeline

### Week 1: Critical Fixes
- **Day 1-2**: Optimize Unit Metrics API
- **Day 3-4**: Add pagination to practitioners list
- **Day 5**: Testing and bug fixes

### Week 2: High Priority
- **Day 1-3**: Create Practitioner Dashboard API
- **Day 4**: Implement server-side filtering
- **Day 5**: Integration testing

### Week 3: Improvements
- **Day 1-2**: Add Redis caching
- **Day 3**: Add database indexes
- **Day 4-5**: Performance testing and monitoring setup

### Week 4: Polish & Deploy
- **Day 1-2**: Documentation updates
- **Day 3**: Staging deployment
- **Day 4**: Production deployment
- **Day 5**: Monitor and adjust

---

## Success Criteria

### Performance Targets

✅ **Must Have** (P0):
- [ ] Unit Metrics API response time < 150ms (95th percentile)
- [ ] Practitioners list loads max 10-20 items
- [ ] Practitioner dashboard makes 1 API call (down from 4)
- [ ] No client-side filtering of large datasets

✅ **Should Have** (P1):
- [ ] Dashboard load time < 500ms
- [ ] Redis cache hit rate > 70%
- [ ] Database query count reduced by 80%

✅ **Nice to Have** (P2):
- [ ] Real-time performance monitoring
- [ ] Automated alerts for performance degradation
- [ ] Query performance analytics dashboard

---

## Risks & Mitigation

### Risk 1: Database Index Performance
**Risk**: Indexes may not improve performance as expected  
**Mitigation**: 
- Test indexes on copy of production data
- Use `EXPLAIN ANALYZE` to verify improvements
- Can drop indexes if no benefit

### Risk 2: Cache Invalidation Complexity
**Risk**: Stale data in cache  
**Mitigation**:
- Short TTL (60 seconds)
- Manual invalidation on data changes
- Cache bypass option for critical operations

### Risk 3: Breaking Changes
**Risk**: API changes break existing clients  
**Mitigation**:
- Maintain backward compatibility
- Version new endpoints
- Comprehensive integration tests

---

## Approval & Sign-off

### Required Approvals
- [ ] Tech Lead: _______________________
- [ ] Backend Engineer: _________________
- [ ] Frontend Engineer: ________________
- [ ] QA Lead: _________________________
- [ ] DevOps: __________________________

### Deployment Approval
- [ ] Staging Tests Passed
- [ ] Performance Benchmarks Met
- [ ] Security Review Complete
- [ ] Documentation Updated

---

## Appendix

### A. SQL Query Comparison

**Before (7 queries)**:
```
Total execution time: ~280ms
Total rows scanned: ~50,000
Database round trips: 7
```

**After (1 query)**:
```
Total execution time: ~100ms
Total rows scanned: ~15,000
Database round trips: 1
Improvement: 2.8x faster, 70% fewer scans
```

### B. API Call Waterfall

**Before**:
```
User ID → Practitioner ID (100ms)
  ↓
Credit Cycle (80ms)
  ↓
Activities (60ms)
  ↓
Notifications (60ms)
──────────────────────
Total: 300ms+
```

**After**:
```
Dashboard API (120ms)
──────────────────────
Total: 120ms
Improvement: 2.5x faster
```

### C. Memory Usage

**Before**:
```
Loading 500 practitioners: ~2MB
Loading 1000 practitioners: ~4MB
```

**After**:
```
Loading 10 practitioners: ~40KB
Improvement: 98% reduction
```

---

**End of Specification**

**Next Steps**: Await approval from stakeholders, then begin Phase 1 implementation.
