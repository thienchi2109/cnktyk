-- ============================================================
-- Migration: Add DonVi Scope to Activities Catalog
-- Date: 2025-11-02
-- Change ID: add-donvi-activities-access
-- Description: Enable unit-scoped activities with ownership tracking,
--              soft delete, and status management for DonVi users
-- ============================================================

BEGIN;

-- ============================================================
-- Step 1: Create activity catalog status enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE activity_catalog_status AS ENUM ('Draft', 'Active', 'Archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE activity_catalog_status IS 
  'Status lifecycle for activity catalog entries: Draft (editing), Active (in use), Archived (historical)';

-- ============================================================
-- Step 2: Add new columns to DanhMucHoatDong
-- ============================================================

-- Unit ownership (NULL = global/system-wide activity)
ALTER TABLE "DanhMucHoatDong" 
  ADD COLUMN IF NOT EXISTS "MaDonVi" UUID NULL;

-- Provenance tracking
ALTER TABLE "DanhMucHoatDong"
  ADD COLUMN IF NOT EXISTS "NguoiTao" UUID NULL,
  ADD COLUMN IF NOT EXISTS "NguoiCapNhat" UUID NULL,
  ADD COLUMN IF NOT EXISTS "TaoLuc" TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "CapNhatLuc" TIMESTAMPTZ DEFAULT now();

-- Status and soft delete
ALTER TABLE "DanhMucHoatDong"
  ADD COLUMN IF NOT EXISTS "TrangThai" activity_catalog_status DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS "DaXoaMem" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- Step 3: Add foreign key constraints
-- ============================================================

ALTER TABLE "DanhMucHoatDong"
  DROP CONSTRAINT IF EXISTS fk_dmhd_donvi,
  DROP CONSTRAINT IF EXISTS fk_dmhd_nguoitao,
  DROP CONSTRAINT IF EXISTS fk_dmhd_nguoicapnhat;

ALTER TABLE "DanhMucHoatDong"
  ADD CONSTRAINT fk_dmhd_donvi 
    FOREIGN KEY ("MaDonVi") 
    REFERENCES "DonVi" ("MaDonVi") 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

ALTER TABLE "DanhMucHoatDong"
  ADD CONSTRAINT fk_dmhd_nguoitao 
    FOREIGN KEY ("NguoiTao") 
    REFERENCES "TaiKhoan" ("MaTaiKhoan") 
    ON UPDATE CASCADE 
    ON DELETE SET NULL;

ALTER TABLE "DanhMucHoatDong"
  ADD CONSTRAINT fk_dmhd_nguoicapnhat 
    FOREIGN KEY ("NguoiCapNhat") 
    REFERENCES "TaiKhoan" ("MaTaiKhoan") 
    ON UPDATE CASCADE 
    ON DELETE SET NULL;

-- ============================================================
-- Step 4: Create indexes for query performance
-- ============================================================

-- Basic unit filtering
DROP INDEX IF EXISTS idx_dmhd_donvi;
CREATE INDEX idx_dmhd_donvi 
  ON "DanhMucHoatDong" ("MaDonVi")
  WHERE "DaXoaMem" = false;

COMMENT ON INDEX idx_dmhd_donvi IS 
  'Supports unit-scoped activity queries, excludes soft-deleted entries';

-- Unit + validity period (common query pattern)
DROP INDEX IF EXISTS idx_dmhd_donvi_hieuluc;
CREATE INDEX idx_dmhd_donvi_hieuluc 
  ON "DanhMucHoatDong" ("MaDonVi", "HieuLucTu", "HieuLucDen")
  WHERE "DaXoaMem" = false;

COMMENT ON INDEX idx_dmhd_donvi_hieuluc IS 
  'Optimizes queries for active activities within validity period by unit';

-- Unique activity names per unit (prevents duplicates)
DROP INDEX IF EXISTS idx_dmhd_unique_name_unit;
CREATE UNIQUE INDEX idx_dmhd_unique_name_unit 
  ON "DanhMucHoatDong" ("MaDonVi", lower("TenDanhMuc"))
  WHERE "DaXoaMem" = false;

COMMENT ON INDEX idx_dmhd_unique_name_unit IS 
  'Enforces unique activity names within each unit scope (case-insensitive), allows duplicates in soft-deleted state';

-- Soft delete queries (for admin cleanup/restore)
DROP INDEX IF EXISTS idx_dmhd_soft_delete;
CREATE INDEX idx_dmhd_soft_delete 
  ON "DanhMucHoatDong" ("DaXoaMem", "CapNhatLuc" DESC)
  WHERE "DaXoaMem" = true;

COMMENT ON INDEX idx_dmhd_soft_delete IS 
  'Supports soft-deleted activity queries for restore/cleanup operations';

-- Creator tracking (for audit queries)
DROP INDEX IF EXISTS idx_dmhd_nguoitao;
CREATE INDEX idx_dmhd_nguoitao 
  ON "DanhMucHoatDong" ("NguoiTao");

COMMENT ON INDEX idx_dmhd_nguoitao IS 
  'Supports queries for activities created by specific users';

-- Status filtering
DROP INDEX IF EXISTS idx_dmhd_trangthai;
CREATE INDEX idx_dmhd_trangthai 
  ON "DanhMucHoatDong" ("TrangThai")
  WHERE "DaXoaMem" = false;

COMMENT ON INDEX idx_dmhd_trangthai IS 
  'Supports filtering by activity status (Draft/Active/Archived)';

-- ============================================================
-- Step 5: Add column comments for documentation
-- ============================================================

COMMENT ON COLUMN "DanhMucHoatDong"."MaDonVi" IS 
  'Unit reference for unit-specific activities. NULL = global activity visible to all units (created by SoYTe)';

COMMENT ON COLUMN "DanhMucHoatDong"."NguoiTao" IS 
  'User who created this activity (for audit and ownership tracking)';

COMMENT ON COLUMN "DanhMucHoatDong"."NguoiCapNhat" IS 
  'User who last updated this activity';

COMMENT ON COLUMN "DanhMucHoatDong"."TaoLuc" IS 
  'Timestamp when activity was created';

COMMENT ON COLUMN "DanhMucHoatDong"."CapNhatLuc" IS 
  'Timestamp when activity was last updated';

COMMENT ON COLUMN "DanhMucHoatDong"."TrangThai" IS 
  'Activity lifecycle status: Draft (editing), Active (in use), Archived (historical)';

COMMENT ON COLUMN "DanhMucHoatDong"."DaXoaMem" IS 
  'Soft delete flag. When true, activity is hidden from normal queries but preserved for audit/recovery';

-- ============================================================
-- Step 6: Create trigger for automatic CapNhatLuc updates
-- ============================================================

CREATE OR REPLACE FUNCTION update_capnhat_luc_dmhd()
RETURNS TRIGGER AS $$
BEGIN
  NEW."CapNhatLuc" := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dmhd_update_capnhat_luc ON "DanhMucHoatDong";

CREATE TRIGGER trg_dmhd_update_capnhat_luc
  BEFORE UPDATE ON "DanhMucHoatDong"
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_capnhat_luc_dmhd();

COMMENT ON FUNCTION update_capnhat_luc_dmhd() IS 
  'Automatically updates CapNhatLuc timestamp on any row modification';

-- ============================================================
-- Step 7: Backfill existing activities as global scope
-- ============================================================

-- Set all existing activities as global (MaDonVi = NULL)
-- Set default timestamps and status
UPDATE "DanhMucHoatDong" 
SET 
  "MaDonVi" = NULL,
  "TaoLuc" = COALESCE("TaoLuc", now()),
  "CapNhatLuc" = COALESCE("CapNhatLuc", now()),
  "TrangThai" = COALESCE("TrangThai", 'Active'),
  "DaXoaMem" = COALESCE("DaXoaMem", false)
WHERE "MaDonVi" IS NULL;

-- Try to identify a SoYTe service account for provenance
-- If no service account exists, leave NguoiTao as NULL
DO $$
DECLARE
  service_account_id UUID;
BEGIN
  -- Look for a SoYTe service account or first SoYTe admin
  SELECT "MaTaiKhoan" INTO service_account_id
  FROM "TaiKhoan"
  WHERE "QuyenHan" = 'SoYTe'
    AND "TrangThai" = true
  ORDER BY "TaoLuc" ASC
  LIMIT 1;

  -- If found, attribute legacy activities to this account
  IF service_account_id IS NOT NULL THEN
    UPDATE "DanhMucHoatDong"
    SET "NguoiTao" = service_account_id
    WHERE "NguoiTao" IS NULL;
  END IF;
END $$;

-- ============================================================
-- Step 8: Update table statistics for query planner
-- ============================================================

ANALYZE "DanhMucHoatDong";

-- ============================================================
-- Step 9: Verify migration results
-- ============================================================

DO $$
DECLARE
  total_count INTEGER;
  global_count INTEGER;
  unit_count INTEGER;
  soft_deleted_count INTEGER;
BEGIN
  -- Count total activities
  SELECT COUNT(*) INTO total_count FROM "DanhMucHoatDong";
  
  -- Count global activities
  SELECT COUNT(*) INTO global_count 
  FROM "DanhMucHoatDong" 
  WHERE "MaDonVi" IS NULL AND "DaXoaMem" = false;
  
  -- Count unit-specific activities
  SELECT COUNT(*) INTO unit_count 
  FROM "DanhMucHoatDong" 
  WHERE "MaDonVi" IS NOT NULL AND "DaXoaMem" = false;
  
  -- Count soft-deleted activities
  SELECT COUNT(*) INTO soft_deleted_count 
  FROM "DanhMucHoatDong" 
  WHERE "DaXoaMem" = true;

  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '  Total activities: %', total_count;
  RAISE NOTICE '  Global activities: %', global_count;
  RAISE NOTICE '  Unit-specific activities: %', unit_count;
  RAISE NOTICE '  Soft-deleted activities: %', soft_deleted_count;

  -- Verify all activities have timestamps
  IF EXISTS (SELECT 1 FROM "DanhMucHoatDong" WHERE "TaoLuc" IS NULL OR "CapNhatLuc" IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Some activities missing timestamps';
  END IF;

  -- Verify all activities have status
  IF EXISTS (SELECT 1 FROM "DanhMucHoatDong" WHERE "TrangThai" IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Some activities missing status';
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
/*
BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_dmhd_update_capnhat_luc ON "DanhMucHoatDong";
DROP FUNCTION IF EXISTS update_capnhat_luc_dmhd();

-- Drop indexes
DROP INDEX IF EXISTS idx_dmhd_donvi;
DROP INDEX IF EXISTS idx_dmhd_donvi_hieuluc;
DROP INDEX IF EXISTS idx_dmhd_unique_name_unit;
DROP INDEX IF EXISTS idx_dmhd_soft_delete;
DROP INDEX IF EXISTS idx_dmhd_nguoitao;
DROP INDEX IF EXISTS idx_dmhd_trangthai;

-- Drop foreign key constraints
ALTER TABLE "DanhMucHoatDong" 
  DROP CONSTRAINT IF EXISTS fk_dmhd_donvi,
  DROP CONSTRAINT IF EXISTS fk_dmhd_nguoitao,
  DROP CONSTRAINT IF EXISTS fk_dmhd_nguoicapnhat;

-- Drop columns
ALTER TABLE "DanhMucHoatDong" 
  DROP COLUMN IF EXISTS "MaDonVi",
  DROP COLUMN IF EXISTS "NguoiTao",
  DROP COLUMN IF EXISTS "NguoiCapNhat",
  DROP COLUMN IF EXISTS "TaoLuc",
  DROP COLUMN IF EXISTS "CapNhatLuc",
  DROP COLUMN IF EXISTS "TrangThai",
  DROP COLUMN IF EXISTS "DaXoaMem";

-- Drop enum type
DROP TYPE IF EXISTS activity_catalog_status;

COMMIT;
*/

-- ============================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================================
/*
-- 1. Check all new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'DanhMucHoatDong'
  AND column_name IN ('MaDonVi', 'NguoiTao', 'NguoiCapNhat', 'TaoLuc', 'CapNhatLuc', 'TrangThai', 'DaXoaMem')
ORDER BY ordinal_position;

-- 2. Check all indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'DanhMucHoatDong'
  AND indexname LIKE 'idx_dmhd_%'
ORDER BY indexname;

-- 3. Check foreign key constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'DanhMucHoatDong'::regclass
  AND conname LIKE 'fk_dmhd_%'
ORDER BY conname;

-- 4. Sample data verification
SELECT 
  "MaDanhMuc",
  "TenDanhMuc",
  "MaDonVi",
  "NguoiTao",
  "TaoLuc",
  "TrangThai",
  "DaXoaMem"
FROM "DanhMucHoatDong"
LIMIT 5;

-- 5. Check enum type values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'activity_catalog_status'::regtype
ORDER BY enumsortorder;
*/
