-- Phase 1 Performance Testing Script
-- Test the optimized Unit Metrics API query

-- ============================================================
-- IMPORTANT: Replace the UUID below with an actual unit ID from your database
-- ============================================================

\timing on

-- Get a sample unit ID (run this first to get a real unit ID)
SELECT "MaDonVi", "TenDonVi" 
FROM "DonVi" 
WHERE "CapQuanLy" IN ('BenhVien', 'TrungTam')
LIMIT 3;

-- ============================================================
-- TEST 1: Optimized Single CTE Query (NEW - Phase 1)
-- Expected: <100ms for small units, <150ms for large units
-- ============================================================

EXPLAIN ANALYZE
WITH 
-- CTE 1: Practitioner counts by status
practitioner_counts AS (
  SELECT 
    COUNT(*) as total_practitioners,
    COUNT(*) FILTER (WHERE "TrangThaiLamViec" = 'DangLamViec') as active_practitioners
  FROM "NhanVien"
  WHERE "MaDonVi" = '00000000-0000-0000-0000-000000000003' -- REPLACE THIS
),
-- CTE 2: Activity approval counts
approval_counts AS (
  SELECT 
    COUNT(*) FILTER (WHERE g."TrangThaiDuyet" = 'ChoDuyet') as pending_approvals,
    COUNT(*) FILTER (
      WHERE g."TrangThaiDuyet" = 'DaDuyet' 
      AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE)
    ) as approved_this_month,
    COUNT(*) FILTER (
      WHERE g."TrangThaiDuyet" = 'TuChoi' 
      AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE)
    ) as rejected_this_month
  FROM "GhiNhanHoatDong" g
  INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
  WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003' -- REPLACE THIS
),
-- CTE 3: Credit calculations for compliance
practitioner_credits AS (
  SELECT 
    n."MaNhanVien",
    COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as total_credits
  FROM "NhanVien" n
  LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien" 
    AND g."TrangThaiDuyet" = 'DaDuyet'
  WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003' -- REPLACE THIS
    AND n."TrangThaiLamViec" = 'DangLamViec'
  GROUP BY n."MaNhanVien"
),
-- CTE 4: Compliance aggregations
compliance_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE total_credits >= 108) as compliant_count,
    COUNT(*) FILTER (WHERE total_credits < 84) as at_risk_count,
    COUNT(*) as total_count
  FROM practitioner_credits
)
-- Final SELECT: Combine all CTEs into single result
SELECT 
  pc.total_practitioners,
  pc.active_practitioners,
  COALESCE(ac.pending_approvals, 0) as pending_approvals,
  COALESCE(ac.approved_this_month, 0) as approved_this_month,
  COALESCE(ac.rejected_this_month, 0) as rejected_this_month,
  cs.compliant_count,
  cs.at_risk_count,
  cs.total_count
FROM practitioner_counts pc
CROSS JOIN approval_counts ac
CROSS JOIN compliance_stats cs;

-- ============================================================
-- TEST 2: Old Sequential Queries (BASELINE for comparison)
-- Expected: 300-500ms total across all 7 queries
-- ============================================================

-- Query 1: Total practitioners
EXPLAIN ANALYZE
SELECT COUNT(*) as count FROM "NhanVien" WHERE "MaDonVi" = '00000000-0000-0000-0000-000000000003';

-- Query 2: Active practitioners
EXPLAIN ANALYZE
SELECT COUNT(*) as count FROM "NhanVien" 
WHERE "MaDonVi" = '00000000-0000-0000-0000-000000000003' 
AND "TrangThaiLamViec" = 'DangLamViec';

-- Query 3: Pending approvals
EXPLAIN ANALYZE
SELECT COUNT(*) as count FROM "GhiNhanHoatDong" g
INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003' 
AND g."TrangThaiDuyet" = 'ChoDuyet';

-- Query 4: Approved this month
EXPLAIN ANALYZE
SELECT COUNT(*) as count FROM "GhiNhanHoatDong" g
INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003'
AND g."TrangThaiDuyet" = 'DaDuyet'
AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE);

-- Query 5: Rejected this month
EXPLAIN ANALYZE
SELECT COUNT(*) as count FROM "GhiNhanHoatDong" g
INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003'
AND g."TrangThaiDuyet" = 'TuChoi'
AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE);

-- Query 6: Compliance calculation
EXPLAIN ANALYZE
SELECT 
  COUNT(CASE WHEN total_credits >= 108 THEN 1 END) as compliant_count,
  COUNT(*) as total_count
FROM (
  SELECT 
    n."MaNhanVien",
    COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as total_credits
  FROM "NhanVien" n
  LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien" 
    AND g."TrangThaiDuyet" = 'DaDuyet'
  WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003' 
    AND n."TrangThaiLamViec" = 'DangLamViec'
  GROUP BY n."MaNhanVien"
) as practitioner_credits;

-- Query 7: At-risk practitioners
EXPLAIN ANALYZE
SELECT COUNT(*) as count
FROM (
  SELECT 
    n."MaNhanVien",
    COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as total_credits
  FROM "NhanVien" n
  LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien" 
    AND g."TrangThaiDuyet" = 'DaDuyet'
  WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003' 
    AND n."TrangThaiLamViec" = 'DangLamViec'
  GROUP BY n."MaNhanVien"
  HAVING COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) < 84
) as at_risk_practitioners;

-- ============================================================
-- TEST 3: Index Usage Verification
-- Check that existing indexes are being used effectively
-- ============================================================

-- Verify NhanVien index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "NhanVien" 
WHERE "MaDonVi" = '00000000-0000-0000-0000-000000000003' 
AND "TrangThaiLamViec" = 'DangLamViec';

-- Verify GhiNhanHoatDong index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT g.* FROM "GhiNhanHoatDong" g
INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
WHERE n."MaDonVi" = '00000000-0000-0000-0000-000000000003';

-- ============================================================
-- RESULTS SUMMARY
-- ============================================================

-- Compare execution times:
-- OLD: Query 1 + Query 2 + Query 3 + Query 4 + Query 5 + Query 6 + Query 7 = TOTAL ms
-- NEW: Single CTE Query = TOTAL ms
-- IMPROVEMENT: (OLD - NEW) / OLD * 100 = X% faster

\echo ''
\echo '========================================='
\echo 'Performance Test Complete!'
\echo 'Expected improvements:'
\echo '- 85% reduction in database queries (7 → 1)'
\echo '- 3-5x faster response time'
\echo '- Target: <150ms for p95'
\echo '========================================='
