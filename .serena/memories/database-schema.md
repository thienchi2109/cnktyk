# Database Schema and Migrations

## Current Database: Neon PostgreSQL

**Project**: cnktyk-syt (noisy-sea-78740912)
**Region**: US East (Ohio)
**PostgreSQL Version**: 17

## Core Tables (9 tables)

### 1. DonVi (Healthcare Units)
```sql
CREATE TABLE "DonVi" (
  "MaDonVi" UUID PRIMARY KEY,
  "TenDonVi" TEXT NOT NULL,
  "CapQuanLy" cap_quan_ly NOT NULL,
  "LoaiDonVi" TEXT,
  "MaDonViCha" UUID,
  "TrangThai" TEXT NOT NULL
);
```

### 2. TaiKhoan (User Accounts)
```sql
CREATE TABLE "TaiKhoan" (
  "MaTaiKhoan" UUID PRIMARY KEY,
  "TenDangNhap" TEXT UNIQUE NOT NULL,
  "MatKhauBam" TEXT NOT NULL,
  "QuyenHan" quyen_han NOT NULL,
  "MaDonVi" UUID,
  "TrangThai" BOOLEAN DEFAULT true,
  "TaoLuc" TIMESTAMPTZ DEFAULT now()
);
```

### 3. NhanVien (Practitioners) - Extended
```sql
CREATE TABLE "NhanVien" (
  "MaNhanVien" UUID PRIMARY KEY,
  "HoVaTen" TEXT NOT NULL,
  "SoCCHN" TEXT UNIQUE,
  "NgayCapCCHN" DATE,
  "MaDonVi" UUID NOT NULL,
  "TrangThaiLamViec" trang_thai_lam_viec DEFAULT 'DangLamViec',
  "Email" TEXT,
  "DienThoai" TEXT,
  "ChucDanh" TEXT,
  -- Extended fields (Migration 002)
  "MaNhanVienNoiBo" TEXT,
  "NgaySinh" DATE,
  "GioiTinh" TEXT CHECK ("GioiTinh" IN ('Nam', 'Nữ', 'Khác')),
  "KhoaPhong" TEXT,
  "NoiCapCCHN" TEXT,
  "PhamViChuyenMon" TEXT,
  CONSTRAINT chk_nv_age CHECK (
    "NgaySinh" IS NULL OR 
    "NgaySinh" <= CURRENT_DATE - INTERVAL '18 years'
  )
);
```

### 4. DanhMucHoatDong (Activity Catalog)
```sql
CREATE TABLE "DanhMucHoatDong" (
  "MaDanhMuc" UUID PRIMARY KEY,
  "TenDanhMuc" TEXT NOT NULL,
  "LoaiHoatDong" loai_hoat_dong NOT NULL,
  "DonViTinh" don_vi_tinh DEFAULT 'gio',
  "TyLeQuyDoi" NUMERIC(6,2) DEFAULT 1.0,
  "GioToiThieu" NUMERIC(6,2),
  "GioToiDa" NUMERIC(6,2),
  "YeuCauMinhChung" BOOLEAN DEFAULT true,
  "HieuLucTu" DATE,
  "HieuLucDen" DATE
);
```

### 5. QuyTacTinChi (Credit Rules)
```sql
CREATE TABLE "QuyTacTinChi" (
  "MaQuyTac" UUID PRIMARY KEY,
  "TenQuyTac" TEXT NOT NULL,
  "TongTinChiYeuCau" NUMERIC(6,2) DEFAULT 120,
  "ThoiHanNam" INT DEFAULT 5,
  "TranTheoLoai" JSONB,
  "HieuLucTu" DATE,
  "HieuLucDen" DATE,
  "TrangThai" BOOLEAN DEFAULT true
);
```

### 6. GhiNhanHoatDong (Activity Records)
```sql
CREATE TABLE "GhiNhanHoatDong" (
  "MaGhiNhan" UUID PRIMARY KEY,
  "MaNhanVien" UUID NOT NULL,
  "MaDanhMuc" UUID,
  "TenHoatDong" TEXT NOT NULL,
  "VaiTro" TEXT,
  "NgayHoatDong" DATE,
  "NgayGhiNhan" TIMESTAMPTZ DEFAULT now(),
  "SoTinChi" NUMERIC NOT NULL,
  "FileMinhChungUrl" TEXT,
  "NguoiNhap" UUID NOT NULL,
  "TrangThaiDuyet" trang_thai_duyet DEFAULT 'ChoDuyet',
  "NgayDuyet" TIMESTAMPTZ,
  "NguoiDuyet" UUID,
  "GhiChuDuyet" TEXT
);
```

### 7. KyCNKT (Compliance Cycles)
```sql
CREATE TABLE "KyCNKT" (
  "MaKy" UUID PRIMARY KEY,
  "MaNhanVien" UUID NOT NULL,
  "NgayBatDau" DATE NOT NULL,
  "NgayKetThuc" DATE NOT NULL,
  "SoTinChiYeuCau" NUMERIC DEFAULT 120,
  "TrangThai" TEXT DEFAULT 'DangDienRa'
);
```

### 8. ThongBao (Notifications)
```sql
CREATE TABLE "ThongBao" (
  "MaThongBao" UUID PRIMARY KEY,
  "MaNguoiNhan" UUID NOT NULL,
  "Loai" TEXT,
  "ThongDiep" TEXT NOT NULL,
  "LienKet" TEXT,
  "TrangThai" trang_thai_tb DEFAULT 'Moi',
  "TaoLuc" TIMESTAMPTZ DEFAULT now()
);
```

### 9. NhatKyHeThong (Audit Log)
```sql
CREATE TABLE "NhatKyHeThong" (
  "MaNhatKy" UUID PRIMARY KEY,
  "MaTaiKhoan" UUID,
  "HanhDong" TEXT,
  "Bang" TEXT,
  "KhoaChinh" TEXT,
  "NoiDung" JSONB,
  "ThoiGian" TIMESTAMPTZ DEFAULT now(),
  "DiaChiIP" TEXT
);
```

## Enums

```sql
-- Management levels
CREATE TYPE cap_quan_ly AS ENUM ('SoYTe', 'BenhVien', 'TrungTam', 'PhongKham');

-- Work status
CREATE TYPE trang_thai_lam_viec AS ENUM ('DangLamViec', 'DaNghi', 'TamHoan');

-- Approval status
CREATE TYPE trang_thai_duyet AS ENUM ('ChoDuyet', 'DaDuyet', 'TuChoi');

-- User roles
CREATE TYPE quyen_han AS ENUM ('SoYTe', 'DonVi', 'NguoiHanhNghe', 'Auditor');

-- Activity types
CREATE TYPE loai_hoat_dong AS ENUM ('KhoaHoc', 'HoiThao', 'NghienCuu', 'BaoCao');

-- Time units
CREATE TYPE don_vi_tinh AS ENUM ('gio', 'tiet', 'tin_chi');

-- Notification status
CREATE TYPE trang_thai_tb AS ENUM ('Moi', 'DaDoc');
```

## Indexes

### NhanVien Indexes
```sql
CREATE INDEX idx_nv_donvi_trangthai ON "NhanVien" ("MaDonVi", "TrangThaiLamViec");
CREATE INDEX idx_nv_ten_lower ON "NhanVien" (lower("HoVaTen"));
CREATE INDEX idx_nv_ma_noi_bo ON "NhanVien" ("MaNhanVienNoiBo") WHERE "MaNhanVienNoiBo" IS NOT NULL;
CREATE INDEX idx_nv_khoa_phong ON "NhanVien" ("KhoaPhong") WHERE "KhoaPhong" IS NOT NULL;
CREATE INDEX idx_nv_gioi_tinh ON "NhanVien" ("GioiTinh") WHERE "GioiTinh" IS NOT NULL;
```

### GhiNhanHoatDong Indexes
```sql
CREATE INDEX idx_gnhd_nv_time_desc ON "GhiNhanHoatDong" ("MaNhanVien", "NgayHoatDong" DESC);
CREATE INDEX idx_gnhd_status_time ON "GhiNhanHoatDong" ("TrangThaiDuyet", "NgayHoatDong" DESC);
CREATE INDEX idx_gnhd_pending_only ON "GhiNhanHoatDong" ("NgayHoatDong" DESC) WHERE "TrangThaiDuyet" = 'ChoDuyet';
```

### Other Indexes
```sql
CREATE INDEX idx_dv_ten_lower ON "DonVi" (lower("TenDonVi"));
CREATE INDEX idx_dv_cap ON "DonVi" ("CapQuanLy");
CREATE INDEX idx_tb_nguoinhan_time ON "ThongBao" ("MaNguoiNhan", "TaoLuc" DESC);
```

## Migration History

### Migration 001: Initial Schema
**Date**: October 2024
**File**: `docs/v_1_init_schema.sql`
**Status**: ✅ Applied

Created all 9 core tables, enums, indexes, and triggers.

### Migration 002: Extended Practitioner Fields
**Date**: October 14, 2025
**File**: `docs/migrations/002_add_nhanvien_extended_fields.sql`
**Status**: ✅ Ready to apply

**Changes**:
- Added 6 new columns to NhanVien table
- Added CHECK constraints for gender and age
- Created 3 new indexes for performance
- Updated TypeScript schemas and types

**New Columns**:
1. `MaNhanVienNoiBo` TEXT - Internal employee ID
2. `NgaySinh` DATE - Date of birth
3. `GioiTinh` TEXT - Gender (Nam/Nữ/Khác)
4. `KhoaPhong` TEXT - Department/Division
5. `NoiCapCCHN` TEXT - Issuing authority
6. `PhamViChuyenMon` TEXT - Scope of practice

**Run Migration**:
```bash
npx tsx scripts/run-migration-002.ts
```

## TypeScript Schema Mapping

### Location
- **Database Schemas**: `lib/db/schemas.ts`
- **Frontend Types**: `src/types/practitioner.ts`
- **Mapper Utilities**: `src/lib/api/practitioner-mapper.ts`

### Key Types

```typescript
// Zod schema
export const NhanVienSchema = z.object({
  MaNhanVien: UUIDSchema,
  HoVaTen: z.string().min(1),
  SoCCHN: z.string().nullable(),
  NgayCapCCHN: z.date().nullable(),
  MaDonVi: UUIDSchema,
  TrangThaiLamViec: TrangThaiLamViecSchema,
  Email: z.string().email().nullable(),
  DienThoai: z.string().nullable(),
  ChucDanh: z.string().nullable(),
  // Extended fields
  MaNhanVienNoiBo: z.string().max(50).nullable(),
  NgaySinh: z.date().nullable(),
  GioiTinh: GioiTinhSchema.nullable(),
  KhoaPhong: z.string().max(100).nullable(),
  NoiCapCCHN: z.string().max(200).nullable(),
  PhamViChuyenMon: z.string().max(200).nullable(),
});

// TypeScript interface
export interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  NgayCapCCHN: Date | null;
  MaDonVi: string;
  TrangThaiLamViec: TrangThaiLamViec;
  Email: string | null;
  DienThoai: string | null;
  ChucDanh: string | null;
  MaNhanVienNoiBo: string | null;
  NgaySinh: Date | null;
  GioiTinh: GioiTinh | null;
  KhoaPhong: string | null;
  NoiCapCCHN: string | null;
  PhamViChuyenMon: string | null;
}
```

## Foreign Key Relationships

```
TaiKhoan.MaDonVi → DonVi.MaDonVi
NhanVien.MaDonVi → DonVi.MaDonVi
GhiNhanHoatDong.MaNhanVien → NhanVien.MaNhanVien
GhiNhanHoatDong.MaDanhMuc → DanhMucHoatDong.MaDanhMuc
GhiNhanHoatDong.NguoiNhap → TaiKhoan.MaTaiKhoan
GhiNhanHoatDong.NguoiDuyet → TaiKhoan.MaTaiKhoan
KyCNKT.MaNhanVien → NhanVien.MaNhanVien
ThongBao.MaNguoiNhan → TaiKhoan.MaTaiKhoan
NhatKyHeThong.MaTaiKhoan → TaiKhoan.MaTaiKhoan
```

## Constraints Summary

### Unique Constraints
- `TaiKhoan.TenDangNhap` - Username must be unique
- `NhanVien.SoCCHN` - License number must be unique

### Check Constraints
- `NhanVien.GioiTinh` - Must be 'Nam', 'Nữ', or 'Khác'
- `NhanVien.NgaySinh` - Must be at least 18 years old
- `DanhMucHoatDong.TyLeQuyDoi` - Must be >= 0
- `DanhMucHoatDong.GioToiDa` - Must be >= GioToiThieu
- `QuyTacTinChi.ThoiHanNam` - Must be > 0

### Default Values
- Most UUID primary keys: `gen_random_uuid()`
- Timestamps: `now()`
- Boolean flags: `true`
- Numeric values: `0` or `1.0`
- Status enums: First value in enum

## Query Patterns

### Common Queries

**Get practitioners by unit**:
```sql
SELECT * FROM "NhanVien" 
WHERE "MaDonVi" = $1 
AND "TrangThaiLamViec" = 'DangLamViec'
ORDER BY "HoVaTen";
```

**Get practitioner with compliance data**:
```sql
SELECT 
  nv.*,
  kc."NgayBatDau",
  kc."NgayKetThuc",
  kc."SoTinChiYeuCau",
  COALESCE(SUM(g."SoTinChi"), 0) as tong_tin_chi
FROM "NhanVien" nv
LEFT JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
LEFT JOIN "GhiNhanHoatDong" g ON nv."MaNhanVien" = g."MaNhanVien"
  AND g."TrangThaiDuyet" = 'DaDuyet'
WHERE nv."MaNhanVien" = $1
GROUP BY nv."MaNhanVien", kc."MaKy";
```

**Get pending approvals for unit**:
```sql
SELECT g.*, nv."HoVaTen", nv."SoCCHN"
FROM "GhiNhanHoatDong" g
JOIN "NhanVien" nv ON g."MaNhanVien" = nv."MaNhanVien"
WHERE nv."MaDonVi" = $1
AND g."TrangThaiDuyet" = 'ChoDuyet'
ORDER BY g."NgayGhiNhan" DESC;
```
