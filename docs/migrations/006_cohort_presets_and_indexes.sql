-- Cohort Presets table and indexes; Practitioner filter indexes; Idempotent unique index

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) CohortPreset table
CREATE TABLE IF NOT EXISTS "CohortPreset" (
  "MaPreset" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaDonVi" uuid NOT NULL,
  "TenPreset" text NOT NULL,
  "BoLoc" jsonb NOT NULL,
  "NguoiTao" uuid NOT NULL,
  "TaoLuc" timestamptz NOT NULL DEFAULT now(),
  "CapNhatLuc" timestamptz NOT NULL DEFAULT now()
);

-- Indexes for presets
CREATE INDEX IF NOT EXISTS "idx_cohortpreset_donvi" ON "CohortPreset" ("MaDonVi");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_cohortpreset_unit_name" ON "CohortPreset" ("MaDonVi", lower("TenPreset"));

-- 2) Practitioner filter indexes to meet p95≤2s target
CREATE INDEX IF NOT EXISTS "idx_nhanvien_madonvi" ON "NhanVien" ("MaDonVi");
CREATE INDEX IF NOT EXISTS "idx_nhanvien_trangthai" ON "NhanVien" ("TrangThaiLamViec");
CREATE INDEX IF NOT EXISTS "idx_nhanvien_chucdanh" ON "NhanVien" ("ChucDanh");

-- 3) Idempotent application: uniqueness by practitioner+activity name
-- Adjust if your dedupe key differs (e.g., include MaDanhMuc or date range)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_ghinhan_prac_activity'
  ) THEN
    CREATE UNIQUE INDEX "uniq_ghinhan_prac_activity" ON "GhiNhanHoatDong" ("MaNhanVien", lower("TenHoatDong"));
  END IF;
END $$;
