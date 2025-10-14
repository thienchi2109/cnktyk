-- Migration: Add extended fields to NhanVien table
-- Date: 2025-10-14
-- Description: Add fields for date of birth, gender, department, issuing authority, and scope of practice

BEGIN;

-- Add new columns to NhanVien table
ALTER TABLE "NhanVien" 
  ADD COLUMN IF NOT EXISTS "MaNhanVienNoiBo" TEXT,
  ADD COLUMN IF NOT EXISTS "NgaySinh" DATE,
  ADD COLUMN IF NOT EXISTS "GioiTinh" TEXT CHECK ("GioiTinh" IN ('Nam', 'Nữ', 'Khác')),
  ADD COLUMN IF NOT EXISTS "KhoaPhong" TEXT,
  ADD COLUMN IF NOT EXISTS "NoiCapCCHN" TEXT,
  ADD COLUMN IF NOT EXISTS "PhamViChuyenMon" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "NhanVien"."MaNhanVienNoiBo" IS 'Internal employee ID (optional, for reference)';
COMMENT ON COLUMN "NhanVien"."NgaySinh" IS 'Date of birth';
COMMENT ON COLUMN "NhanVien"."GioiTinh" IS 'Gender: Nam (Male), Nữ (Female), Khác (Other)';
COMMENT ON COLUMN "NhanVien"."KhoaPhong" IS 'Department/Division';
COMMENT ON COLUMN "NhanVien"."NoiCapCCHN" IS 'Issuing authority for practice certificate';
COMMENT ON COLUMN "NhanVien"."PhamViChuyenMon" IS 'Scope of professional practice';

-- Create index for internal employee ID if provided
CREATE INDEX IF NOT EXISTS idx_nv_ma_noi_bo ON "NhanVien" ("MaNhanVienNoiBo") WHERE "MaNhanVienNoiBo" IS NOT NULL;

-- Create index for department for filtering
CREATE INDEX IF NOT EXISTS idx_nv_khoa_phong ON "NhanVien" ("KhoaPhong") WHERE "KhoaPhong" IS NOT NULL;

-- Create index for gender for statistics
CREATE INDEX IF NOT EXISTS idx_nv_gioi_tinh ON "NhanVien" ("GioiTinh") WHERE "GioiTinh" IS NOT NULL;

-- Add constraint to ensure age >= 18 if date of birth is provided
ALTER TABLE "NhanVien" 
  ADD CONSTRAINT chk_nv_age CHECK (
    "NgaySinh" IS NULL OR 
    "NgaySinh" <= CURRENT_DATE - INTERVAL '18 years'
  );

COMMIT;

-- Rollback script (if needed)
-- BEGIN;
-- ALTER TABLE "NhanVien" 
--   DROP COLUMN IF EXISTS "MaNhanVienNoiBo",
--   DROP COLUMN IF EXISTS "NgaySinh",
--   DROP COLUMN IF EXISTS "GioiTinh",
--   DROP COLUMN IF EXISTS "KhoaPhong",
--   DROP COLUMN IF EXISTS "NoiCapCCHN",
--   DROP COLUMN IF EXISTS "PhamViChuyenMon";
-- COMMIT;
