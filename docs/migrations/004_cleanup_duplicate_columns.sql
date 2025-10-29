-- Migration 004: Cleanup Duplicate/Overlapping Columns in GhiNhanHoatDong
-- Date: 2025-10-15
-- Description: Consolidate duplicate columns and migrate data to preferred fields
--
-- This migration addresses schema drift and duplicate columns:
-- 1. VaiTro vs ChiTietVaiTro (role fields)
-- 2. NgayHoatDong vs NgayBatDau/NgayKetThuc (date fields)
-- 3. SoTinChi vs SoGioTinChiQuyDoi (credit fields)

BEGIN;

-- Step 1: Migrate data from deprecated columns to preferred columns

-- Migrate VaiTro to ChiTietVaiTro (if ChiTietVaiTro is empty)
UPDATE "GhiNhanHoatDong"
SET "ChiTietVaiTro" = "VaiTro"
WHERE "ChiTietVaiTro" IS NULL 
  AND "VaiTro" IS NOT NULL;

-- Migrate NgayHoatDong to NgayBatDau (if NgayBatDau is empty)
UPDATE "GhiNhanHoatDong"
SET "NgayBatDau" = "NgayHoatDong"
WHERE "NgayBatDau" IS NULL 
  AND "NgayHoatDong" IS NOT NULL;

-- Migrate SoTinChi to SoGioTinChiQuyDoi (if SoGioTinChiQuyDoi is 0 or NULL)
UPDATE "GhiNhanHoatDong"
SET "SoGioTinChiQuyDoi" = "SoTinChi"
WHERE ("SoGioTinChiQuyDoi" IS NULL OR "SoGioTinChiQuyDoi" = 0)
  AND "SoTinChi" IS NOT NULL 
  AND "SoTinChi" > 0;

-- Step 2: Drop deprecated columns (after data migration)

-- Drop VaiTro (data migrated to ChiTietVaiTro)
ALTER TABLE "GhiNhanHoatDong"
  DROP COLUMN IF EXISTS "VaiTro";

-- Drop NgayHoatDong (data migrated to NgayBatDau)
ALTER TABLE "GhiNhanHoatDong"
  DROP COLUMN IF EXISTS "NgayHoatDong";

-- Drop SoTinChi (data migrated to SoGioTinChiQuyDoi)
ALTER TABLE "GhiNhanHoatDong"
  DROP COLUMN IF EXISTS "SoTinChi";

-- Step 3: Add comments for clarity
COMMENT ON COLUMN "GhiNhanHoatDong"."ChiTietVaiTro" IS 'Detailed role/position in activity (consolidated from VaiTro)';
COMMENT ON COLUMN "GhiNhanHoatDong"."NgayBatDau" IS 'Activity start date (consolidated from NgayHoatDong)';
COMMENT ON COLUMN "GhiNhanHoatDong"."SoGioTinChiQuyDoi" IS 'Converted credit hours (authoritative credit field, consolidated from SoTinChi)';

COMMIT;

-- Verification queries
/*
-- Check that deprecated columns are gone
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'GhiNhanHoatDong'
AND column_name IN ('VaiTro', 'NgayHoatDong', 'SoTinChi');
-- Should return 0 rows

-- Check data integrity
SELECT 
  COUNT(*) as total_records,
  COUNT("ChiTietVaiTro") as has_role,
  COUNT("NgayBatDau") as has_start_date,
  COUNT(CASE WHEN "SoGioTinChiQuyDoi" > 0 THEN 1 END) as has_credits
FROM "GhiNhanHoatDong";

-- Check for any NULL values in critical fields
SELECT 
  COUNT(*) as records_missing_credits
FROM "GhiNhanHoatDong"
WHERE "SoGioTinChiQuyDoi" IS NULL OR "SoGioTinChiQuyDoi" = 0;
*/
