-- CNKTYKLT – Initial schema migration (PostgreSQL/Neon)
-- One-time migration: creates types, tables, constraints, indexes, triggers, and materialized views.
-- Assumes: RLS disabled at DB-level; app enforces authorization via WHERE clauses.

BEGIN;

SET statement_timeout = '30s';
SET lock_timeout = '15s';
SET client_min_messages = WARNING;
SET TIME ZONE 'UTC';

-- === Extensions (Neon-compatible) ===
CREATE EXTENSION IF NOT EXISTS pgcrypto;         -- for gen_random_uuid()

-- === Enum types ===
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cap_quan_ly') THEN
    CREATE TYPE cap_quan_ly AS ENUM ('SoYTe','BenhVien','TrungTam','PhongKham');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_lam_viec') THEN
    CREATE TYPE trang_thai_lam_viec AS ENUM ('DangLamViec','DaNghi','TamHoan');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_duyet') THEN
    CREATE TYPE trang_thai_duyet AS ENUM ('ChoDuyet','DaDuyet','TuChoi');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quyen_han') THEN
    CREATE TYPE quyen_han AS ENUM ('SoYTe','DonVi','NguoiHanhNghe','Auditor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loai_hoat_dong') THEN
    CREATE TYPE loai_hoat_dong AS ENUM ('KhoaHoc','HoiThao','NghienCuu','BaoCao');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'don_vi_tinh') THEN
    CREATE TYPE don_vi_tinh AS ENUM ('gio','tiet','tin_chi');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trang_thai_tb') THEN
    CREATE TYPE trang_thai_tb AS ENUM ('Moi','DaDoc');
  END IF;
END $$;

-- === Tables ===
-- DonVi
CREATE TABLE IF NOT EXISTS "DonVi" (
  "MaDonVi"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TenDonVi"      TEXT NOT NULL,
  "CapQuanLy"     cap_quan_ly NOT NULL,
  "MaDonViCha"    UUID NULL,
  "TrangThai"     BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT fk_donvi_cha FOREIGN KEY ("MaDonViCha") REFERENCES "DonVi" ("MaDonVi") ON UPDATE CASCADE ON DELETE SET NULL
);

-- TaiKhoan (user accounts)
CREATE TABLE IF NOT EXISTS "TaiKhoan" (
  "MaTaiKhoan"  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TenDangNhap" TEXT UNIQUE NOT NULL,
  "MatKhauBam"  TEXT NOT NULL,           -- bcryptjs hash
  "QuyenHan"    quyen_han NOT NULL,
  "MaDonVi"     UUID NULL,
  "TrangThai"   BOOLEAN NOT NULL DEFAULT true,
  "TaoLuc"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_taikhoan_donvi FOREIGN KEY ("MaDonVi") REFERENCES "DonVi" ("MaDonVi") ON UPDATE CASCADE ON DELETE SET NULL
);

-- NhanVien (practitioners)
CREATE TABLE IF NOT EXISTS "NhanVien" (
  "MaNhanVien"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "HoVaTen"           TEXT NOT NULL,
  "SoCCHN"            TEXT UNIQUE,
  "NgayCapCCHN"       DATE,
  "MaDonVi"           UUID NOT NULL,
  "TrangThaiLamViec"  trang_thai_lam_viec NOT NULL DEFAULT 'DangLamViec',
  "Email"             TEXT,
  "DienThoai"         TEXT,
  "ChucDanh"          TEXT,
  CONSTRAINT fk_nhanvien_donvi FOREIGN KEY ("MaDonVi") REFERENCES "DonVi" ("MaDonVi") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- DanhMucHoatDong (activity catalog)
CREATE TABLE IF NOT EXISTS "DanhMucHoatDong" (
  "MaDanhMuc"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TenDanhMuc"    TEXT NOT NULL,
  "LoaiHoatDong"  loai_hoat_dong NOT NULL,
  "DonViTinh"     don_vi_tinh NOT NULL DEFAULT 'gio',
  "TyLeQuyDoi"    NUMERIC(6,2) NOT NULL DEFAULT 1.0 CHECK ("TyLeQuyDoi" >= 0),
  "GioToiThieu"   NUMERIC(6,2),
  "GioToiDa"      NUMERIC(6,2),
  "YeuCauMinhChung" BOOLEAN NOT NULL DEFAULT true,
  "HieuLucTu"     DATE,
  "HieuLucDen"    DATE,
  CONSTRAINT chk_dmhd_gio_range CHECK ("GioToiDa" IS NULL OR "GioToiThieu" IS NULL OR "GioToiDa" >= "GioToiThieu"),
  CONSTRAINT chk_dmhd_hieuluc CHECK ("HieuLucDen" IS NULL OR "HieuLucTu" IS NULL OR "HieuLucDen" >= "HieuLucTu")
);

-- QuyTacTinChi (rules)
CREATE TABLE IF NOT EXISTS "QuyTacTinChi" (
  "MaQuyTac"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TenQuyTac"          TEXT NOT NULL,
  "TongTinChiYeuCau"   NUMERIC(6,2) NOT NULL DEFAULT 120,
  "ThoiHanNam"         INT NOT NULL DEFAULT 5 CHECK ("ThoiHanNam" > 0),
  "TranTheoLoai"       JSONB,
  "HieuLucTu"          DATE,
  "HieuLucDen"         DATE,
  "TrangThai"          BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT chk_quytac_hieuluc CHECK ("HieuLucDen" IS NULL OR "HieuLucTu" IS NULL OR "HieuLucDen" >= "HieuLucTu"),
  CONSTRAINT chk_quytac_tran_json CHECK ("TranTheoLoai" IS NULL OR jsonb_typeof("TranTheoLoai") = 'object')
);

-- GhiNhanHoatDong (activity entries)
CREATE TABLE IF NOT EXISTS "GhiNhanHoatDong" (
  "MaGhiNhan"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaNhanVien"       UUID NOT NULL,
  "MaDanhMuc"        UUID NULL,
  "TenHoatDong"      TEXT NOT NULL,
  "VaiTro"           TEXT,
  "ThoiGianBatDau"   TIMESTAMPTZ,
  "ThoiGianKetThuc"  TIMESTAMPTZ,
  "SoGio"            NUMERIC(6,2) CHECK ("SoGio" IS NULL OR "SoGio" >= 0),
  "SoTinChiQuyDoi"   NUMERIC(6,2) NOT NULL CHECK ("SoTinChiQuyDoi" >= 0),
  "FileMinhChungUrl"   TEXT,
  "FileMinhChungETag"  TEXT,
  "FileMinhChungSha256" TEXT,
  "FileMinhChungSize"  BIGINT,
  "NguoiNhap"        UUID NOT NULL,
  "TrangThaiDuyet"   trang_thai_duyet NOT NULL DEFAULT 'ChoDuyet',
  "ThoiGianDuyet"    TIMESTAMPTZ,
  "GhiChu"           TEXT,
  "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "UpdatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_gnhd_nhanvien FOREIGN KEY ("MaNhanVien") REFERENCES "NhanVien" ("MaNhanVien") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_gnhd_danhmuc FOREIGN KEY ("MaDanhMuc")  REFERENCES "DanhMucHoatDong" ("MaDanhMuc") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_gnhd_nguoinhap FOREIGN KEY ("NguoiNhap") REFERENCES "TaiKhoan" ("MaTaiKhoan") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_gnhd_time CHECK ("ThoiGianKetThuc" IS NULL OR "ThoiGianBatDau" IS NULL OR "ThoiGianKetThuc" >= "ThoiGianBatDau")
);

-- NhatKyHeThong (audit log)
CREATE TABLE IF NOT EXISTS "NhatKyHeThong" (
  "MaNhatKy"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaTaiKhoan" UUID,
  "HanhDong"   TEXT,
  "Bang"       TEXT,
  "KhoaChinh"  TEXT,
  "NoiDung"    JSONB,
  "ThoiGian"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "DiaChiIP"   TEXT,
  CONSTRAINT fk_nk_taikhoan FOREIGN KEY ("MaTaiKhoan") REFERENCES "TaiKhoan" ("MaTaiKhoan") ON UPDATE CASCADE ON DELETE SET NULL
);

-- ThongBao (in-app notifications)
CREATE TABLE IF NOT EXISTS "ThongBao" (
  "MaThongBao"  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaNguoiNhan" UUID NOT NULL,
  "Loai"        TEXT,
  "ThongDiep"   TEXT NOT NULL,
  "LienKet"     TEXT,
  "TrangThai"   trang_thai_tb NOT NULL DEFAULT 'Moi',
  "TaoLuc"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_tb_user FOREIGN KEY ("MaNguoiNhan") REFERENCES "TaiKhoan" ("MaTaiKhoan") ON UPDATE CASCADE ON DELETE CASCADE
);

-- === Triggers ===
-- Auto-update UpdatedAt on row update
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW."UpdatedAt" := now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gnhd_set_updated_at ON "GhiNhanHoatDong";
CREATE TRIGGER trg_gnhd_set_updated_at
BEFORE UPDATE ON "GhiNhanHoatDong"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- === Indexes ===
-- DonVi
CREATE INDEX IF NOT EXISTS idx_dv_ten_lower ON "DonVi" (lower("TenDonVi"));
CREATE INDEX IF NOT EXISTS idx_dv_cap ON "DonVi" ("CapQuanLy");

-- NhanVien
CREATE INDEX IF NOT EXISTS idx_nv_donvi_trangthai ON "NhanVien" ("MaDonVi", "TrangThaiLamViec");
CREATE INDEX IF NOT EXISTS idx_nv_ten_lower ON "NhanVien" (lower("HoVaTen"));

-- DanhMucHoatDong
CREATE INDEX IF NOT EXISTS idx_dmhd_loai ON "DanhMucHoatDong" ("LoaiHoatDong");
CREATE INDEX IF NOT EXISTS idx_dmhd_hieuluc ON "DanhMucHoatDong" ("HieuLucTu", "HieuLucDen");

-- QuyTacTinChi
CREATE INDEX IF NOT EXISTS idx_quytac_tran_gin ON "QuyTacTinChi" USING GIN (("TranTheoLoai"));

-- GhiNhanHoatDong (time-ordered access)
CREATE INDEX IF NOT EXISTS idx_gnhd_nv_time_desc ON "GhiNhanHoatDong" ("MaNhanVien", "ThoiGianBatDau" DESC, "MaGhiNhan" DESC);
CREATE INDEX IF NOT EXISTS idx_gnhd_status_time ON "GhiNhanHoatDong" ("TrangThaiDuyet", "ThoiGianBatDau" DESC);
CREATE INDEX IF NOT EXISTS idx_gnhd_pending_only ON "GhiNhanHoatDong" ("ThoiGianBatDau" DESC) WHERE "TrangThaiDuyet" = 'ChoDuyet';

-- ThongBao
CREATE INDEX IF NOT EXISTS idx_tb_nguoinhan_time ON "ThongBao" ("MaNguoiNhan", "TaoLuc" DESC);

-- === Materialized Views (reporting) ===
-- Aggregate credits per practitioner; refreshed by nightly cron
CREATE MATERIALIZED VIEW IF NOT EXISTS "BaoCaoTienDoNhanVien" AS
SELECT nv."MaNhanVien",
       nv."HoVaTen",
       nv."MaDonVi",
       COALESCE(SUM(g."SoTinChiQuyDoi"),0) AS tong_tin_chi,
       MIN(g."ThoiGianBatDau") AS tu_ngay,
       MAX(g."ThoiGianKetThuc") AS den_ngay
FROM "NhanVien" nv
LEFT JOIN "GhiNhanHoatDong" g ON g."MaNhanVien" = nv."MaNhanVien" AND g."TrangThaiDuyet" = 'DaDuyet'
GROUP BY nv."MaNhanVien", nv."HoVaTen", nv."MaDonVi";

CREATE UNIQUE INDEX IF NOT EXISTS idx_bctd_nv ON "BaoCaoTienDoNhanVien" ("MaNhanVien");

-- Unit-level rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS "BaoCaoTongHopDonVi" AS
SELECT nv."MaDonVi",
       COUNT(DISTINCT nv."MaNhanVien") AS so_nguoi,
       COALESCE(SUM(bc.tong_tin_chi),0) AS tong_tin_chi
FROM "NhanVien" nv
LEFT JOIN "BaoCaoTienDoNhanVien" bc ON bc."MaNhanVien" = nv."MaNhanVien"
GROUP BY nv."MaDonVi";

CREATE INDEX IF NOT EXISTS idx_bcth_dv ON "BaoCaoTongHopDonVi" ("MaDonVi");

-- === Housekeeping ===
ANALYZE;

COMMIT;
