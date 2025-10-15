# TypeScript Schema Update Complete ✅

## Summary

Successfully updated TypeScript schemas to match the actual database structure after Migration 003.

## Changes Made

### 1. `lib/db/schemas.ts`

**Updated `GhiNhanHoatDongSchema`:**

**Removed fields (not in database):**
- `VaiTro` → Use `ChiTietVaiTro` instead
- `ThoiGianBatDau` → Use `NgayBatDau` instead
- `ThoiGianKetThuc` → Use `NgayKetThuc` instead
- `SoGio` → Not in database
- `ThoiGianDuyet` → Use `NgayDuyet` instead
- `GhiChu` → Use `GhiChuDuyet` instead
- `FileMinhChungETag` → Not in database
- `FileMinhChungSha256` → Not in database
- `FileMinhChungSize` → Not in database
- `CreatedAt` → Not in database
- `UpdatedAt` → Not in database

**Added fields (from database):**
- `NgayGhiNhan` (timestamp with time zone) - When record was created
- `NguoiDuyet` (uuid) - Who approved/rejected the activity
- `GhiChuDuyet` (text) - Approval/rejection notes

**Kept Migration 003 fields:**
- `HinhThucCapNhatKienThucYKhoa` ✅
- `ChiTietVaiTro` ✅
- `DonViToChuc` ✅
- `NgayBatDau` ✅
- `NgayKetThuc` ✅
- `SoTiet` ✅
- `SoGioTinChiQuyDoi` ✅
- `BangChungSoGiayChungNhan` ✅

**Added new schemas:**
- `SubmitActivitySchema` - For API activity submission
- `ApproveActivitySchema` - For approval workflow

### 2. `src/types/activity.ts`

**Updated `Activity` interface:**
```typescript
export interface Activity {
  MaGhiNhan: string;
  MaNhanVien: string;
  MaDanhMuc: string | null;
  TenHoatDong: string;
  NgayGhiNhan: Date;                          // ✅ Added
  FileMinhChungUrl: string | null;
  NguoiNhap: string;
  TrangThaiDuyet: TrangThaiDuyet;
  NgayDuyet: Date | null;                     // ✅ Added
  NguoiDuyet: string | null;                  // ✅ Added
  GhiChuDuyet: string | null;                 // ✅ Added
  // Extended fields (Migration 003)
  HinhThucCapNhatKienThucYKhoa: string | null;
  ChiTietVaiTro: string | null;
  DonViToChuc: string | null;
  NgayBatDau: Date | null;
  NgayKetThuc: Date | null;
  SoTiet: number | null;
  SoGioTinChiQuyDoi: number | null;
  BangChungSoGiayChungNhan: string | null;
}
```

**Updated `CreateActivity` interface:**
- Removed obsolete fields
- Aligned with database schema

**Updated `ActivityListItem` interface:**
- Changed `CreatedAt` to `NgayGhiNhan`

### 3. `src/lib/api/activity-mapper.ts`

**Updated `mapDbToActivity()`:**
- Maps database columns to Activity type correctly
- Handles all Migration 003 fields
- Removed references to non-existent fields

**Updated `serializeActivity()`:**
- Converts `NgayGhiNhan`, `NgayDuyet`, `NgayBatDau`, `NgayKetThuc` to ISO strings
- Removed references to `CreatedAt`, `UpdatedAt`

**Updated `deserializeActivity()`:**
- Converts ISO strings back to Date objects
- Matches actual database fields

### 4. `lib/db/utils.ts`

**Fixed typo:**
- Changed `activity.SoTinChiQuyDoi` to `activity.SoGioTinChiQuyDoi`

## Database Schema Reference

### GhiNhanHoatDong Table Structure

```sql
CREATE TABLE "GhiNhanHoatDong" (
  "MaGhiNhan" UUID PRIMARY KEY,
  "MaNhanVien" UUID NOT NULL REFERENCES "NhanVien"("MaNhanVien"),
  "MaDanhMuc" UUID REFERENCES "DanhMucHoatDong"("MaDanhMuc"),
  "TenHoatDong" TEXT NOT NULL,
  "NgayGhiNhan" TIMESTAMP WITH TIME ZONE NOT NULL,
  "FileMinhChungUrl" TEXT,
  "NguoiNhap" UUID NOT NULL REFERENCES "TaiKhoan"("MaTaiKhoan"),
  "TrangThaiDuyet" TrangThaiDuyet NOT NULL DEFAULT 'ChoDuyet',
  "NgayDuyet" TIMESTAMP WITH TIME ZONE,
  "NguoiDuyet" UUID REFERENCES "TaiKhoan"("MaTaiKhoan"),
  "GhiChuDuyet" TEXT,
  -- Migration 003 fields
  "HinhThucCapNhatKienThucYKhoa" TEXT,
  "ChiTietVaiTro" TEXT,
  "DonViToChuc" TEXT,
  "NgayBatDau" DATE,
  "NgayKetThuc" DATE,
  "SoTiet" NUMERIC(6,2) CHECK ("SoTiet" IS NULL OR "SoTiet" >= 0),
  "SoGioTinChiQuyDoi" NUMERIC(6,2),
  "BangChungSoGiayChungNhan" TEXT,
  CONSTRAINT chk_gnhd_ngay_bat_dau_ket_thuc 
    CHECK ("NgayKetThuc" IS NULL OR "NgayBatDau" IS NULL OR "NgayKetThuc" >= "NgayBatDau")
);
```

## Field Mapping Guide

| Database Column | TypeScript Field | Type | Purpose |
|----------------|------------------|------|---------|
| MaGhiNhan | MaGhiNhan | UUID | Primary key |
| MaNhanVien | MaNhanVien | UUID | Practitioner who performed activity |
| MaDanhMuc | MaDanhMuc | UUID? | Activity category (optional) |
| TenHoatDong | TenHoatDong | string | Activity name |
| NgayGhiNhan | NgayGhiNhan | Date | When record was created |
| FileMinhChungUrl | FileMinhChungUrl | string? | Evidence file URL |
| NguoiNhap | NguoiNhap | UUID | Who submitted the record |
| TrangThaiDuyet | TrangThaiDuyet | enum | Approval status |
| NgayDuyet | NgayDuyet | Date? | When approved/rejected |
| NguoiDuyet | NguoiDuyet | UUID? | Who approved/rejected |
| GhiChuDuyet | GhiChuDuyet | string? | Approval notes |
| HinhThucCapNhatKienThucYKhoa | HinhThucCapNhatKienThucYKhoa | string? | Form of medical knowledge update |
| ChiTietVaiTro | ChiTietVaiTro | string? | Detailed role |
| DonViToChuc | DonViToChuc | string? | Organizing unit |
| NgayBatDau | NgayBatDau | Date? | Activity start date |
| NgayKetThuc | NgayKetThuc | Date? | Activity end date |
| SoTiet | SoTiet | number? | Number of sessions |
| SoGioTinChiQuyDoi | SoGioTinChiQuyDoi | number? | Converted credit hours |
| BangChungSoGiayChungNhan | BangChungSoGiayChungNhan | string? | Certificate number |

## Verification

✅ **Type checking passed:** `npm run typecheck` - No errors

## Next Steps

1. ✅ TypeScript schemas updated
2. ⏳ Update API routes to use new schema
3. ⏳ Update frontend components
4. ⏳ Test activity submission workflow
5. ⏳ Test approval workflow
6. ⏳ Test bulk import with new fields

## Notes

- All date fields use `Date` type in TypeScript
- Database uses `DATE` for `NgayBatDau`/`NgayKetThuc` (date only)
- Database uses `TIMESTAMP WITH TIME ZONE` for `NgayGhiNhan`/`NgayDuyet` (date + time)
- `SoGioTinChiQuyDoi` is nullable in database but should be required for activity submission
- Approval workflow requires `NguoiDuyet` and `NgayDuyet` to be set when status changes to 'DaDuyet' or 'TuChoi'

## Related Documents

- [Migration 003 Summary](.kiro/specs/compliance-management-platform/MIGRATION_003_SUMMARY.md)
- [Data Relationship Workflow](.kiro/specs/compliance-management-platform/DATA_RELATIONSHIP_WORKFLOW.md)
- [Excel Template Schema](.kiro/specs/compliance-management-platform/EXCEL_TEMPLATE_SCHEMA.md)
