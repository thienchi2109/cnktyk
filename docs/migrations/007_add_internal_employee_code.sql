-- 007_add_internal_employee_code.sql
-- Adds optional internal employee code to NhanVien and supporting index

BEGIN;

ALTER TABLE "NhanVien"
  ADD COLUMN IF NOT EXISTS "MaNhanVienNoiBo" TEXT NULL;

-- Helpful index for lookups within a unit (not unique to avoid conflicts)
CREATE INDEX IF NOT EXISTS idx_nhanvien_madonvi_manoibo
  ON "NhanVien" ("MaDonVi", "MaNhanVienNoiBo");

COMMIT;