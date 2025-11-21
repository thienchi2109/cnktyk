-- ============================================================================
-- Index Verification and Performance Testing
-- ============================================================================
-- Purpose: Verify that new indexes are being used by report queries
-- Run this after: add-report-performance-indexes.sql migration
--
-- Instructions:
-- 1. Replace placeholder values ($1, $2, etc.) with actual test data
-- 2. Run each query with EXPLAIN ANALYZE
-- 3. Look for "Index Scan" using new indexes in output
-- 4. Compare execution times before/after indexes
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Indexes Exist
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'GhiNhanHoatDong'
  AND indexname IN (
    'idx_ghinhan_nhanvien_duyet_ngay',
    'idx_ghinhan_ngayghinhan',
    'idx_ghinhan_nhanvien_duyet',  -- Existing index for comparison
    'idx_ghinhan_nhanvien'  -- Existing index for comparison
  )
ORDER BY indexname;

-- Expected output: 4 rows (2 new + 2 existing for reference)

-- ============================================================================
-- STEP 2: Check Index Sizes
-- ============================================================================

SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
  pg_size_pretty(pg_table_size(tablename::regclass)) as table_size
FROM pg_indexes
WHERE tablename = 'GhiNhanHoatDong'
  AND indexname IN (
    'idx_ghinhan_nhanvien_duyet_ngay',
    'idx_ghinhan_ngayghinhan'
  )
ORDER BY indexname;

-- Expected: idx_ghinhan_nhanvien_duyet_ngay ~2-3 MB
-- Expected: idx_ghinhan_ngayghinhan ~400-500 KB

-- ============================================================================
-- STEP 3: Test Query 1 - Compliance Report Pattern
-- ============================================================================

-- Replace placeholders:
-- $1: MaDonVi (e.g., '123e4567-e89b-12d3-a456-426614174000')
-- $2: startDate (e.g., '2024-01-01')
-- $3: endDate (e.g., '2024-12-31')

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH practitioner_credits AS (
  SELECT
    n."MaNhanVien",
    n."HoVaTen",
    COALESCE(SUM(
      CASE
        WHEN (
          g."MaDanhMuc" IS NULL
          OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
          OR (
            dm."YeuCauMinhChung" = TRUE
            AND g."FileMinhChungUrl" IS NOT NULL
            AND BTRIM(g."FileMinhChungUrl") <> ''
          )
        )
        THEN g."SoGioTinChiQuyDoi"
        ELSE 0
      END
    ), 0) as total_credits
  FROM "NhanVien" n
  LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien"
    AND g."TrangThaiDuyet" = 'DaDuyet'
    AND g."NgayGhiNhan" >= '2024-01-01'  -- Replace with $2
    AND g."NgayGhiNhan" <= '2024-12-31'  -- Replace with $3
  LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
  WHERE n."MaDonVi" = '123e4567-e89b-12d3-a456-426614174000'  -- Replace with $1
  GROUP BY n."MaNhanVien", n."HoVaTen"
)
SELECT * FROM practitioner_credits LIMIT 10;

-- LOOK FOR in output:
-- ✅ "Index Scan using idx_ghinhan_nhanvien_duyet_ngay on GhiNhanHoatDong"
-- ✅ "Index Cond: ((MaNhanVien = ...) AND (TrangThaiDuyet = 'DaDuyet'::text) AND ...)"
-- ❌ Should NOT see: "Seq Scan on GhiNhanHoatDong"
--
-- Execution Time: Should be < 300ms for 100-500 practitioners

-- ============================================================================
-- STEP 4: Test Query 2 - Activity Report Pattern
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH activity_data AS (
  SELECT
    g."MaGhiNhan",
    g."TenHoatDong",
    g."NgayGhiNhan",
    g."TrangThaiDuyet",
    g."SoGioTinChiQuyDoi",
    TO_CHAR(g."NgayGhiNhan", 'YYYY-MM') as "Month"
  FROM "GhiNhanHoatDong" g
  JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
  WHERE n."MaDonVi" = '123e4567-e89b-12d3-a456-426614174000'  -- Replace with $1
    AND g."NgayGhiNhan" >= '2024-01-01'  -- Replace with $2
    AND g."NgayGhiNhan" <= '2024-12-31'  -- Replace with $3
)
SELECT "Month", COUNT(*) as count
FROM activity_data
GROUP BY "Month"
ORDER BY "Month" ASC;

-- LOOK FOR in output:
-- ✅ "Index Scan using idx_ghinhan_ngayghinhan on GhiNhanHoatDong"
-- OR
-- ✅ "Index Scan using idx_ghinhan_nhanvien_duyet_ngay on GhiNhanHoatDong"
--
-- Execution Time: Should be < 150ms for 1000+ activities

-- ============================================================================
-- STEP 5: Test Query 3 - Practitioner Detail Pattern
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  g."MaGhiNhan",
  dm."TenDanhMuc",
  g."NgayGhiNhan",
  g."TrangThaiDuyet",
  g."SoGioTinChiQuyDoi"
FROM "GhiNhanHoatDong" g
LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
WHERE g."MaNhanVien" = '123e4567-e89b-12d3-a456-426614174000'  -- Replace with practitioner ID
  AND g."TrangThaiDuyet" = 'DaDuyet'
  AND g."NgayGhiNhan" >= '2024-01-01'  -- Replace with start date
  AND g."NgayGhiNhan" <= '2024-12-31'  -- Replace with end date
ORDER BY g."NgayGhiNhan" DESC;

-- LOOK FOR in output:
-- ✅ "Index Scan using idx_ghinhan_nhanvien_duyet_ngay on GhiNhanHoatDong"
-- ✅ "Index Cond: ((MaNhanVien = ...) AND (TrangThaiDuyet = ...) AND (NgayGhiNhan >= ...) AND (NgayGhiNhan <= ...))"
--
-- Execution Time: Should be < 100ms for single practitioner

-- ============================================================================
-- STEP 6: Compare Index Usage Statistics
-- ============================================================================

-- Run this before testing
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans_before,
  idx_tup_read as tuples_read_before,
  idx_tup_fetch as tuples_fetched_before
FROM pg_stat_user_indexes
WHERE tablename = 'GhiNhanHoatDong'
  AND indexname IN (
    'idx_ghinhan_nhanvien_duyet_ngay',
    'idx_ghinhan_ngayghinhan'
  )
ORDER BY indexname;

-- Run report queries from browser
-- Then run this again to see difference:

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans_after,
  idx_tup_read as tuples_read_after,
  idx_tup_fetch as tuples_fetched_after
FROM pg_stat_user_indexes
WHERE tablename = 'GhiNhanHoatDong'
  AND indexname IN (
    'idx_ghinhan_nhanvien_duyet_ngay',
    'idx_ghinhan_ngayghinhan'
  )
ORDER BY indexname;

-- Expected: idx_scan should increment after each report query

-- ============================================================================
-- STEP 7: Check for Unused Indexes (Monitoring)
-- ============================================================================

-- Run this after 1 week in production to identify unused indexes

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
  CASE
    WHEN idx_scan = 0 THEN '⚠️ Never used'
    WHEN idx_scan < 100 THEN '⚠️ Rarely used'
    WHEN idx_scan < 1000 THEN '✅ Occasionally used'
    ELSE '✅ Frequently used'
  END as usage_status
FROM pg_stat_user_indexes
WHERE tablename = 'GhiNhanHoatDong'
  AND indexname LIKE 'idx_ghinhan%'
ORDER BY idx_scan DESC;

-- If an index shows "Never used" after 1 week, investigate why

-- ============================================================================
-- STEP 8: Identify Missing Statistics (if queries slow)
-- ============================================================================

-- Check if table statistics are up to date
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE tablename = 'GhiNhanHoatDong';

-- If last_analyze is old (> 1 day) or dead_rows > 10% of live_rows:
-- ANALYZE "GhiNhanHoatDong";

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================

-- ✅ Both new indexes appear in pg_indexes
-- ✅ Index sizes are reasonable (~2.5 MB total)
-- ✅ EXPLAIN ANALYZE shows "Index Scan using idx_ghinhan_nhanvien_duyet_ngay"
-- ✅ EXPLAIN ANALYZE shows NO "Seq Scan" on GhiNhanHoatDong
-- ✅ Query execution time < 300ms for compliance report
-- ✅ Query execution time < 150ms for activity timeline
-- ✅ Query execution time < 100ms for practitioner detail
-- ✅ idx_scan counter increments after running queries
-- ✅ Index usage status shows "Frequently used" after 1 week

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- Problem: EXPLAIN still shows "Seq Scan" instead of "Index Scan"
-- Solution 1: Run ANALYZE "GhiNhanHoatDong"
-- Solution 2: Check if query matches index columns exactly
-- Solution 3: Increase random_page_cost in postgres.conf (if SSD)
-- Solution 4: Check if table is very small (< 1000 rows) - Seq Scan might be faster

-- Problem: Index not being used even though it exists
-- Solution 1: Check query conditions match index column order
-- Solution 2: Verify data types match (no implicit casts)
-- Solution 3: Check if WHERE clause uses functions (breaks index usage)
-- Solution 4: Use ANALYZE to update statistics

-- Problem: Queries still slow after indexes
-- Solution 1: Check if issue is in JOIN or aggregation, not filtering
-- Solution 2: Verify network latency (not database)
-- Solution 3: Check if caching layer is working
-- Solution 4: Profile query with EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
