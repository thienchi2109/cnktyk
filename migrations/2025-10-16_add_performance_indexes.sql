-- Migration: Add Performance Indexes for Practitioners Page
-- Date: 2025-10-16
-- Purpose: Optimize server-side pagination and filtering queries
-- Verified against: cnktyk-syt database schema

-- ============================================================
-- NHANVIEN TABLE INDEXES
-- ============================================================

-- Index for name search and ordering (ILIKE performance + ORDER BY)
-- This enables fast sorting and searching by practitioner name
CREATE INDEX IF NOT EXISTS idx_nhanvien_hoten 
ON "NhanVien"("HoVaTen");

-- Note: idx_nv_donvi_trangthai already exists (MaDonVi, TrangThaiLamViec composite)
-- This covers both unit filtering and status filtering in one index

-- ============================================================
-- GHINHANHHOATDONG TABLE INDEXES
-- ============================================================

-- Index for JOIN optimization (compliance calculation)
-- This speeds up the JOIN between NhanVien and GhiNhanHoatDong
CREATE INDEX IF NOT EXISTS idx_ghinhan_nhanvien 
ON "GhiNhanHoatDong"("MaNhanVien");

-- Index for filtering approved activities
-- This speeds up filtering for TrangThaiDuyet = 'DaDuyet'
CREATE INDEX IF NOT EXISTS idx_ghinhan_duyet 
ON "GhiNhanHoatDong"("TrangThaiDuyet");

-- Composite index for compliance calculation optimization
-- This is THE KEY index for our compliance CTE query
-- Covers both JOIN condition and WHERE clause in compliance calculation
CREATE INDEX IF NOT EXISTS idx_ghinhan_nhanvien_duyet 
ON "GhiNhanHoatDong"("MaNhanVien", "TrangThaiDuyet");

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Verify all new indexes were created successfully
SELECT 
    tablename AS table_name,
    indexname AS index_name,
    indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('NhanVien', 'GhiNhanHoatDong')
    AND indexname IN (
        'idx_nhanvien_hoten',
        'idx_ghinhan_nhanvien',
        'idx_ghinhan_duyet',
        'idx_ghinhan_nhanvien_duyet'
    )
ORDER BY tablename, indexname;
