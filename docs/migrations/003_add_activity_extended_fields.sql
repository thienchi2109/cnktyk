-- Migration 003: Extended Activity Fields for Bulk Import System
-- Date: 2025-10-15
-- Description: Add extended fields to GhiNhanHoatDong table to support bulk import
--              with approval workflow information
--
-- New Fields:
-- - HinhThucCapNhatKienThucYKhoa: Form of medical knowledge update
-- - ChiTietVaiTro: Detailed role/position
-- - DonViToChuc: Organizing unit
-- - NgayBatDau: Start date
-- - NgayKetThuc: End date
-- - SoTiet: Number of sessions/periods
-- - BangChungSoGiayChungNhan: Evidence/Certificate number
--
-- Note: SoTinChiQuyDoi already exists in the original schema (v_1_init_schema.sql)

BEGIN;

-- Add new columns to GhiNhanHoatDong table
-- Note: SoTinChiQuyDoi already exists in the original schema, so we skip it
ALTER TABLE "GhiNhanHoatDong"
  ADD COLUMN IF NOT EXISTS "HinhThucCapNhatKienThucYKhoa" TEXT,
  ADD COLUMN IF NOT EXISTS "ChiTietVaiTro" TEXT,
  ADD COLUMN IF NOT EXISTS "DonViToChuc" TEXT,
  ADD COLUMN IF NOT EXISTS "NgayBatDau" DATE,
  ADD COLUMN IF NOT EXISTS "NgayKetThuc" DATE,
  ADD COLUMN IF NOT EXISTS "SoTiet" NUMERIC(6,2) CHECK ("SoTiet" IS NULL OR "SoTiet" >= 0),
  ADD COLUMN IF NOT EXISTS "BangChungSoGiayChungNhan" TEXT;

-- Add check constraint: NgayKetThuc must be after or equal to NgayBatDau
ALTER TABLE "GhiNhanHoatDong"
  ADD CONSTRAINT chk_gnhd_ngay_bat_dau_ket_thuc 
  CHECK (
    "NgayKetThuc" IS NULL OR 
    "NgayBatDau" IS NULL OR 
    "NgayKetThuc" >= "NgayBatDau"
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gnhd_ngay_bat_dau 
  ON "GhiNhanHoatDong" ("NgayBatDau");

CREATE INDEX IF NOT EXISTS idx_gnhd_ngay_ket_thuc 
  ON "GhiNhanHoatDong" ("NgayKetThuc");

CREATE INDEX IF NOT EXISTS idx_gnhd_hinh_thuc 
  ON "GhiNhanHoatDong" ("HinhThucCapNhatKienThucYKhoa");

CREATE INDEX IF NOT EXISTS idx_gnhd_don_vi_to_chuc 
  ON "GhiNhanHoatDong" ("DonViToChuc");

-- Add comments for documentation
COMMENT ON COLUMN "GhiNhanHoatDong"."HinhThucCapNhatKienThucYKhoa" IS 'Form of medical knowledge update (e.g., conference, training, workshop)';
COMMENT ON COLUMN "GhiNhanHoatDong"."ChiTietVaiTro" IS 'Detailed role/position in the activity';
COMMENT ON COLUMN "GhiNhanHoatDong"."DonViToChuc" IS 'Organizing unit/institution';
COMMENT ON COLUMN "GhiNhanHoatDong"."NgayBatDau" IS 'Activity start date';
COMMENT ON COLUMN "GhiNhanHoatDong"."NgayKetThuc" IS 'Activity end date';
COMMENT ON COLUMN "GhiNhanHoatDong"."SoTiet" IS 'Number of sessions/periods (if applicable)';
COMMENT ON COLUMN "GhiNhanHoatDong"."BangChungSoGiayChungNhan" IS 'Evidence/Certificate number';

COMMIT;

-- Verification queries
-- Run these after migration to verify:
/*
-- Check new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'GhiNhanHoatDong'
AND column_name IN (
  'HinhThucCapNhatKienThucYKhoa',
  'ChiTietVaiTro',
  'DonViToChuc',
  'NgayBatDau',
  'NgayKetThuc',
  'SoTiet',
  'BangChungSoGiayChungNhan'
);

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'GhiNhanHoatDong'
AND indexname LIKE 'idx_gnhd_%';

-- Check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'GhiNhanHoatDong'::regclass
AND conname LIKE 'chk_gnhd_%';
*/
