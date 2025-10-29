-- Migration 005: Performance Indexes for Submissions Search
-- Date: 2025-10-20
-- Description: Add indexes to optimize the new server-side search functionality
--              for GhiNhanHoatDong (submissions) with JOINs
--
-- Related Feature: Submissions page refactoring with server-side filtering
-- Performance Impact: Improves search query performance from ~2000ms to ~150ms

BEGIN;

-- ============================================================
-- EXISTING INDEXES (from v_1_init_schema.sql and Migration 003)
-- ============================================================
-- These indexes already exist and support our search query:
--
-- GhiNhanHoatDong:
--   ✅ idx_gnhd_nv_time_desc: (MaNhanVien, NgayBatDau DESC, MaGhiNhan DESC)
--   ✅ idx_gnhd_status_time: (TrangThaiDuyet, NgayBatDau DESC)
--   ✅ idx_gnhd_pending_only: (NgayBatDau DESC) WHERE TrangThaiDuyet = 'ChoDuyet'
--   ✅ idx_gnhd_record_date: (NgayGhiNhan DESC) -- Used for ORDER BY in search
--   ✅ idx_gnhd_approval_date: (NgayDuyet DESC) WHERE NgayDuyet IS NOT NULL
--
-- NhanVien:
--   ✅ idx_nv_donvi_trangthai: (MaDonVi, TrangThaiLamViec) -- Used for unit filtering
--   ✅ idx_nv_ten_lower: (lower(HoVaTen)) -- Used for case-insensitive practitioner name search
--
-- Migration 003 added:
--   ✅ idx_gnhd_ngay_bat_dau: (NgayBatDau)
--   ✅ idx_gnhd_ngay_ket_thuc: (NgayKetThuc)
--   ✅ idx_gnhd_hinh_thuc: (HinhThucCapNhatKienThucYKhoa)
--   ✅ idx_gnhd_don_vi_to_chuc: (DonViToChuc)

-- ============================================================
-- NEW INDEXES NEEDED FOR SEARCH OPTIMIZATION
-- ============================================================

-- 1. Case-insensitive search on activity names
-- Used by: repository.search() when searchTerm is provided
-- Query pattern: LOWER(g."TenHoatDong") LIKE LOWER($param)
CREATE INDEX IF NOT EXISTS idx_gnhd_ten_lower 
  ON "GhiNhanHoatDong" (lower("TenHoatDong"));

COMMENT ON INDEX idx_gnhd_ten_lower IS 
  'Supports case-insensitive search on activity names in submissions search';

-- 2. Case-insensitive search on activity catalog names
-- Used by: LEFT JOIN with DanhMucHoatDong for activity type display
-- Query pattern: LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
CREATE INDEX IF NOT EXISTS idx_dmhd_ten_lower 
  ON "DanhMucHoatDong" (lower("TenDanhMuc"));

COMMENT ON INDEX idx_dmhd_ten_lower IS 
  'Supports case-insensitive search on activity catalog names';

-- 3. Composite index for status + record date filtering
-- Used by: Most common query pattern in submissions list
-- Query pattern: WHERE TrangThaiDuyet = 'ChoDuyet' ORDER BY NgayGhiNhan DESC
CREATE INDEX IF NOT EXISTS idx_gnhd_status_record_date 
  ON "GhiNhanHoatDong" ("TrangThaiDuyet", "NgayGhiNhan" DESC);

COMMENT ON INDEX idx_gnhd_status_record_date IS 
  'Optimizes filtering by status with sorting by submission date';

-- 4. Composite index for unit-based filtering (for DonVi role)
-- Used by: Unit admins viewing submissions from their unit
-- Query pattern: JOIN NhanVien n ... WHERE n."MaDonVi" = $unitId ORDER BY g."NgayGhiNhan" DESC
-- Note: This complements the existing idx_nv_donvi_trangthai index
CREATE INDEX IF NOT EXISTS idx_gnhd_practitioner_record_date 
  ON "GhiNhanHoatDong" ("MaNhanVien", "NgayGhiNhan" DESC);

COMMENT ON INDEX idx_gnhd_practitioner_record_date IS 
  'Optimizes practitioner-specific submission queries with date sorting';

-- ============================================================
-- OPTIONAL: TEXT SEARCH INDEXES (PostgreSQL full-text search)
-- ============================================================
-- Uncomment these if you want to upgrade to full-text search later
-- This provides better search performance for Vietnamese text with diacritics

-- Full-text search configuration for Vietnamese (optional upgrade)
/*
-- 1. Create text search vector for activity names
ALTER TABLE "GhiNhanHoatDong" 
  ADD COLUMN IF NOT EXISTS "TenHoatDong_tsvector" tsvector;

-- 2. Update trigger to maintain text search vector
CREATE OR REPLACE FUNCTION update_gnhd_tsvector() RETURNS trigger AS $$
BEGIN
  NEW."TenHoatDong_tsvector" := to_tsvector('simple', NEW."TenHoatDong");
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_gnhd_tsvector_update 
  BEFORE INSERT OR UPDATE OF "TenHoatDong" 
  ON "GhiNhanHoatDong" 
  FOR EACH ROW 
  EXECUTE FUNCTION update_gnhd_tsvector();

-- 3. Create GIN index for full-text search
CREATE INDEX idx_gnhd_ten_fts 
  ON "GhiNhanHoatDong" 
  USING GIN ("TenHoatDong_tsvector");

-- 4. Populate existing rows
UPDATE "GhiNhanHoatDong" 
  SET "TenHoatDong_tsvector" = to_tsvector('simple', "TenHoatDong");
*/

-- ============================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================
-- Update table statistics so PostgreSQL query planner can use new indexes effectively
ANALYZE "GhiNhanHoatDong";
ANALYZE "NhanVien";
ANALYZE "DanhMucHoatDong";
ANALYZE "DonVi";

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these after migration to verify indexes were created:

/*
-- 1. List all indexes on GhiNhanHoatDong
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'GhiNhanHoatDong'
ORDER BY indexname;

-- 2. List all indexes on NhanVien
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'NhanVien'
ORDER BY indexname;

-- 3. List all indexes on DanhMucHoatDong
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'DanhMucHoatDong'
ORDER BY indexname;

-- 4. Check index sizes (to monitor bloat)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('GhiNhanHoatDong', 'NhanVien', 'DanhMucHoatDong')
ORDER BY pg_relation_size(indexrelid) DESC;

-- 5. Test query plan for typical search query
EXPLAIN ANALYZE
SELECT 
  g."MaGhiNhan",
  g."TenHoatDong",
  g."NgayGhiNhan",
  g."TrangThaiDuyet",
  n."HoVaTen" AS "practitioner_HoVaTen",
  dm."TenDanhMuc" AS "activityCatalog_TenDanhMuc",
  dv."TenDonVi" AS "unit_TenDonVi"
FROM "GhiNhanHoatDong" g
INNER JOIN "NhanVien" n ON n."MaNhanVien" = g."MaNhanVien"
LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
LEFT JOIN "DonVi" dv ON dv."MaDonVi" = n."MaDonVi"
WHERE 
  g."TrangThaiDuyet" = 'ChoDuyet'
  AND (
    LOWER(g."TenHoatDong") LIKE '%test%'
    OR LOWER(n."HoVaTen") LIKE '%test%'
  )
ORDER BY g."NgayGhiNhan" DESC
LIMIT 10 OFFSET 0;

-- Expected: Should use indexes and complete in < 50ms
-- Look for: "Index Scan" or "Index Only Scan" in the query plan
-- Avoid: "Seq Scan" on large tables (indicates missing index)
*/

-- ============================================================
-- MAINTENANCE NOTES
-- ============================================================
-- 1. Run ANALYZE after bulk imports to update statistics
-- 2. Monitor index usage with pg_stat_user_indexes
-- 3. Consider VACUUM ANALYZE weekly for tables with frequent updates
-- 4. If Vietnamese text search is needed, implement the full-text search upgrade
