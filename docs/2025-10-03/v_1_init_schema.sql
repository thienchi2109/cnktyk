-- CNKTYKLT – Complete Database Schema (PostgreSQL/Neon)
-- This file reflects the ACTUAL current database schema including all migrations
-- Version: 1.3 (includes Migration 002 and Migration 003)
-- Last Updated: 2025-10-15
-- 
-- Migrations Applied:
-- - v_1_init_schema.sql (Initial schema)
-- - 002_add_nhanvien_extended_fields.sql (NhanVien extended fields)
-- - 003_add_activity_extended_fields.sql (GhiNhanHoatDong extended fields)
--
-- Note: This schema uses Vietnamese column names as per Migration 003
-- Key changes from original:
-- - GhiNhanHoatDong: ThoiGianBatDau → NgayBatDau, ThoiGianKetThuc → NgayKetThuc
-- - GhiNhanHoatDong: CreatedAt → NgayGhiNhan, ThoiGianDuyet → NgayDuyet
-- - GhiNhanHoatDong: GhiChu → GhiChuDuyet, SoTinChiQuyDoi → SoGioTinChiQuyDoi
-- - GhiNhanHoatDong: Removed UpdatedAt column
-- - GhiNhanHoatDong: Removed VaiTro, SoGio, FileMinhChungETag, FileMinhChungSha256, FileMinhChungSize
--
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
-- Updated with Migration 002 extended fields
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
  -- Migration 002: Extended fields
  "MaNhanVienNoiBo"   TEXT,
  "NgaySinh"          DATE,
  "GioiTinh"          TEXT CHECK ("GioiTinh" IN ('Nam', 'Nữ', 'Khác')),
  "KhoaPhong"         TEXT,
  "NoiCapCCHN"        TEXT,
  "PhamViChuyenMon"   TEXT,
  CONSTRAINT fk_nhanvien_donvi FOREIGN KEY ("MaDonVi") REFERENCES "DonVi" ("MaDonVi") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_nv_age CHECK ("NgaySinh" IS NULL OR "NgaySinh" <= CURRENT_DATE - INTERVAL '18 years')
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
-- Updated after Migration 003: Extended fields for medical knowledge update tracking
CREATE TABLE IF NOT EXISTS "GhiNhanHoatDong" (
  "MaGhiNhan"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaNhanVien"       UUID NOT NULL,
  "MaDanhMuc"        UUID NULL,
  "TenHoatDong"      TEXT NOT NULL,
  "NgayGhiNhan"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "FileMinhChungUrl" TEXT,
  "NguoiNhap"        UUID NOT NULL,
  "TrangThaiDuyet"   trang_thai_duyet NOT NULL DEFAULT 'ChoDuyet',
  "NgayDuyet"        TIMESTAMPTZ,
  "NguoiDuyet"       UUID,
  "GhiChuDuyet"      TEXT,
  
  -- Migration 003: Extended fields for detailed activity tracking
  "HinhThucCapNhatKienThucYKhoa" TEXT,  -- Form of medical knowledge update (e.g., Conference, Training)
  "ChiTietVaiTro"    TEXT,              -- Detailed role (e.g., Speaker, Participant, Presenter)
  "DonViToChuc"      TEXT,              -- Organizing unit/institution
  "NgayBatDau"       DATE,              -- Start date
  "NgayKetThuc"      DATE,              -- End date
  "SoTiet"           NUMERIC(6,2) CHECK ("SoTiet" IS NULL OR "SoTiet" >= 0),  -- Number of sessions/periods
  "SoGioTinChiQuyDoi" NUMERIC(6,2) CHECK ("SoGioTinChiQuyDoi" IS NULL OR "SoGioTinChiQuyDoi" >= 0),  -- Converted credit hours
  "BangChungSoGiayChungNhan" TEXT,      -- Certificate number as evidence
  
  CONSTRAINT fk_gnhd_nhanvien FOREIGN KEY ("MaNhanVien") REFERENCES "NhanVien" ("MaNhanVien") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_gnhd_danhmuc FOREIGN KEY ("MaDanhMuc")  REFERENCES "DanhMucHoatDong" ("MaDanhMuc") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_gnhd_nguoinhap FOREIGN KEY ("NguoiNhap") REFERENCES "TaiKhoan" ("MaTaiKhoan") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_gnhd_nguoiduyet FOREIGN KEY ("NguoiDuyet") REFERENCES "TaiKhoan" ("MaTaiKhoan") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_gnhd_time CHECK ("NgayKetThuc" IS NULL OR "NgayBatDau" IS NULL OR "NgayKetThuc" >= "NgayBatDau")
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

-- Note: Trigger removed in Migration 003 as UpdatedAt column no longer exists

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
-- Updated after Migration 003: Use NgayBatDau and NgayGhiNhan instead of ThoiGianBatDau
CREATE INDEX IF NOT EXISTS idx_gnhd_nv_time_desc ON "GhiNhanHoatDong" ("MaNhanVien", "NgayBatDau" DESC, "MaGhiNhan" DESC);
CREATE INDEX IF NOT EXISTS idx_gnhd_status_time ON "GhiNhanHoatDong" ("TrangThaiDuyet", "NgayBatDau" DESC);
CREATE INDEX IF NOT EXISTS idx_gnhd_pending_only ON "GhiNhanHoatDong" ("NgayBatDau" DESC) WHERE "TrangThaiDuyet" = 'ChoDuyet';
CREATE INDEX IF NOT EXISTS idx_gnhd_record_date ON "GhiNhanHoatDong" ("NgayGhiNhan" DESC);
CREATE INDEX IF NOT EXISTS idx_gnhd_approval_date ON "GhiNhanHoatDong" ("NgayDuyet" DESC) WHERE "NgayDuyet" IS NOT NULL;

-- ThongBao
CREATE INDEX IF NOT EXISTS idx_tb_nguoinhan_time ON "ThongBao" ("MaNguoiNhan", "TaoLuc" DESC);

-- === Materialized Views (reporting) ===
-- Aggregate credits per practitioner; refreshed by nightly cron
-- Updated after Migration 003: Use SoGioTinChiQuyDoi and NgayBatDau/NgayKetThuc
CREATE MATERIALIZED VIEW IF NOT EXISTS "BaoCaoTienDoNhanVien" AS
SELECT nv."MaNhanVien",
       nv."HoVaTen",
       nv."MaDonVi",
       COALESCE(SUM(g."SoGioTinChiQuyDoi"),0) AS tong_tin_chi,
       MIN(g."NgayBatDau") AS tu_ngay,
       MAX(g."NgayKetThuc") AS den_ngay
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
