-- Migration: Add indexes to support bulk submission workflow
-- Date: 2025-11-10
-- Purpose: Improve duplicate detection and credit evidence queries
-- Verified against: cnktyklt Neon project (br-snowy-rain-adpgprgx)

-- ============================================================
-- GHINHANHOATDONG TABLE INDEXES
-- ============================================================

-- Unique partial index to enforce practitioner/activity catalog pairs
-- Supports bulk submission ON CONFLICT clause and duplicate detection queries
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gnhd_madanhmuc_nhanvien
ON "GhiNhanHoatDong" ("MaDanhMuc", "MaNhanVien")
WHERE "MaDanhMuc" IS NOT NULL;

-- Composite filtered index for credit evidence lookups
-- Optimizes queries that fetch approved submissions with attached evidence
CREATE INDEX IF NOT EXISTS idx_gnhd_trangthai_fileminhchung
ON "GhiNhanHoatDong" ("TrangThaiDuyet", "FileMinhChungUrl")
WHERE "FileMinhChungUrl" IS NOT NULL;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Confirm both indexes exist after migration
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'GhiNhanHoatDong'
  AND indexname IN (
    'uniq_gnhd_madanhmuc_nhanvien',
    'idx_gnhd_trangthai_fileminhchung'
  )
ORDER BY indexname;
