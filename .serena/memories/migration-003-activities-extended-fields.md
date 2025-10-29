# Migration 003: Extended Activity Fields - Session Summary

## Date: October 15, 2025

## What Was Accomplished

Successfully extended the `GhiNhanHoatDong` (Activity Record) table with new fields to support the bulk import system for healthcare practitioner activities.

## Migration 003: Extended Activity Fields

### New Columns Added (7 fields)
1. ✅ `HinhThucCapNhatKienThucYKhoa` (TEXT) - Form of medical knowledge update
2. ✅ `ChiTietVaiTro` (TEXT) - Detailed role/position in activity
3. ✅ `DonViToChuc` (TEXT) - Organizing unit/institution
4. ✅ `NgayBatDau` (DATE) - Activity start date
5. ✅ `NgayKetThuc` (DATE) - Activity end date
6. ✅ `SoTiet` (NUMERIC) - Number of sessions/periods
7. ✅ `BangChungSoGiayChungNhan` (TEXT) - Evidence/Certificate number

### Constraints & Indexes
- Date validation: `NgayKetThuc >= NgayBatDau`
- Numeric validation: `SoTiet >= 0`
- 4 performance indexes created

### Files Created
1. **docs/migrations/003_add_activity_extended_fields.sql** - Migration SQL
2. **scripts/run-migration-003.ts** - Automated migration runner
3. **src/types/activity.ts** - Complete TypeScript type definitions
4. **src/lib/api/activity-mapper.ts** - Data mapping utilities
5. **docs/migrations/003_test_insert.sql** - Test SQL for verification
6. **.kiro/specs/compliance-management-platform/MIGRATION_003_SUMMARY.md** - Documentation
7. **.kiro/specs/compliance-management-platform/CHANGELOG_MIGRATION_003.md** - Detailed changelog

### Files Updated
- **lib/db/schemas.ts** - Extended GhiNhanHoatDongSchema
- **src/types/practitioner.ts** - Fixed type compatibility

## Critical Corrections Made

### Issue 1: Duplicate Column Error
**Problem:** Migration tried to add `SoTinChiQuyDoi` which already existed in original schema.
**Solution:** Removed from migration (only 7 new columns, not 8).

### Issue 2: Wrong Field Name
**Problem:** Used `SoTinChiQuyDoi` but actual database has `SoGioTinChiQuyDoi`.
**Solution:** Updated all references to use correct field name `SoGioTinChiQuyDoi`.

### Issue 3: Duplicate Fields Identified
**Problem:** Database has overlapping columns from schema drift.
**Solution:** Created Migration 004 to consolidate duplicates.

## Actual Database Schema (GhiNhanHoatDong)

### Current Columns
- MaGhiNhan (UUID, PK)
- MaNhanVien (UUID, FK)
- MaDanhMuc (UUID, FK)
- TenHoatDong (TEXT)
- **VaiTro** (TEXT) - DEPRECATED, use ChiTietVaiTro
- **NgayHoatDong** (DATE) - DEPRECATED, use NgayBatDau
- NgayGhiNhan (TIMESTAMP)
- **SoTinChi** (NUMERIC) - DEPRECATED, use SoGioTinChiQuyDoi
- FileMinhChungUrl (TEXT)
- NguoiNhap (UUID, FK)
- TrangThaiDuyet (ENUM)
- NgayDuyet (TIMESTAMP)
- NguoiDuyet (UUID, FK)
- GhiChuDuyet (TEXT)
- **HinhThucCapNhatKienThucYKhoa** (TEXT) - NEW
- **ChiTietVaiTro** (TEXT) - NEW (replaces VaiTro)
- **DonViToChuc** (TEXT) - NEW
- **NgayBatDau** (DATE) - NEW (replaces NgayHoatDong)
- **NgayKetThuc** (DATE) - NEW
- **SoTiet** (NUMERIC) - NEW
- **SoGioTinChiQuyDoi** (NUMERIC) - NEW (replaces SoTinChi)
- **BangChungSoGiayChungNhan** (TEXT) - NEW

## Excel Template Mapping (CORRECTED)

| Column | Field Name | Database Column |
|--------|-----------|-----------------|
| A | Mã nhân viên (FK) | MaNhanVien |
| B | Tên hoạt động | TenHoatDong |
| C | Hình thức CNKTYH | HinhThucCapNhatKienThucYKhoa |
| D | Chi tiết vai trò | ChiTietVaiTro |
| E | Đơn vị tổ chức | DonViToChuc |
| F | Ngày bắt đầu | NgayBatDau |
| G | Ngày kết thúc | NgayKetThuc |
| H | Số tiết | SoTiet |
| I | Số giờ tín chỉ | **SoGioTinChiQuyDoi** |
| J | Số giấy chứng nhận | BangChungSoGiayChungNhan |

## Migration 004: Cleanup Duplicate Columns

### Purpose
Consolidate duplicate/overlapping columns from schema drift.

### Actions
1. **Migrate data** from deprecated columns to new columns
2. **Drop deprecated columns**: VaiTro, NgayHoatDong, SoTinChi
3. **Keep preferred columns**: ChiTietVaiTro, NgayBatDau/NgayKetThuc, SoGioTinChiQuyDoi

### File
- **docs/migrations/004_cleanup_duplicate_columns.sql**

## TypeScript Type System

### Core Types (src/types/activity.ts)
- `Activity` - Complete activity interface
- `CreateActivity` - For creation
- `UpdateActivity` - For updates
- `ImportActivity` - For Excel import
- `ActivityDisplay` - With computed fields
- `ActivityListItem` - Minimal for lists
- `ActivityFilter` - Filter options
- `ActivitySort` - Sort options

### Helper Functions
- `calculateDuration()` - Days between dates
- `formatVietnameseDate()` - DD/MM/YYYY format
- `parseVietnameseDate()` - Parse DD/MM/YYYY
- `getStatusDisplay()` - Vietnamese status text
- `getStatusColor()` - Tailwind color classes
- `validateActivityDates()` - Date range validation
- `validateCredits()` - Credit validation

### Mapper Functions (src/lib/api/activity-mapper.ts)
- `mapDbToActivity()` - DB row to TypeScript
- `mapToDisplay()` - Add computed fields
- `mapImportToDb()` - Excel to DB format
- `serializeActivity()` - Dates to ISO strings
- `deserializeActivity()` - ISO strings to Dates
- `validateActivity()` - Comprehensive validation
- `buildFilterClause()` - SQL WHERE builder
- `formatForExport()` - Excel export format

## Testing

### Test SQL
```bash
# Run test insert
psql $DATABASE_URL -f docs/migrations/003_test_insert.sql
```

### Verification
```sql
-- Check new columns exist
SELECT column_name, data_type 
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
```

## Build Status
- ✅ TypeScript: 0 errors
- ✅ All types compile successfully
- ✅ Migration SQL ready
- ⏳ Migration 003: Ready to run
- ⏳ Migration 004: Ready to run after 003

## Next Steps

1. **Run Migration 003**
   ```bash
   npx tsx scripts/run-migration-003.ts
   ```

2. **Test with sample data**
   ```bash
   psql $DATABASE_URL -f docs/migrations/003_test_insert.sql
   ```

3. **Run Migration 004** (cleanup duplicates)
   ```bash
   psql $DATABASE_URL -f docs/migrations/004_cleanup_duplicate_columns.sql
   ```

4. **Continue with bulk import implementation**
   - Install exceljs: `npm install exceljs`
   - Create Excel template generator
   - Implement import API endpoints
   - Build import UI components

## Important Notes

### Field Name Corrections
- ❌ NOT `SoTinChiQuyDoi` 
- ✅ USE `SoGioTinChiQuyDoi`

### Deprecated Fields (Don't Use)
- `VaiTro` → Use `ChiTietVaiTro`
- `NgayHoatDong` → Use `NgayBatDau`
- `SoTinChi` → Use `SoGioTinChiQuyDoi`

### Schema Drift Issue
The database has evolved beyond the original v_1_init_schema.sql. Some columns exist that weren't in the original design (NgayHoatDong, SoTinChi, NgayDuyet, NguoiDuyet, GhiChuDuyet). Migration 004 will consolidate these.

## Related Documentation
- `.kiro/specs/compliance-management-platform/MIGRATION_003_SUMMARY.md`
- `.kiro/specs/compliance-management-platform/CHANGELOG_MIGRATION_003.md`
- `.kiro/specs/compliance-management-platform/SCHEMA_ANALYSIS_ACTIVITIES.md`
- `.kiro/specs/compliance-management-platform/TASK_16_BULK_IMPORT_PLAN.md`

## Git Commits
- `94e53f7` - feat: Add Migration 003 - Extended Activity Fields
- `74a626e` - fix: Remove duplicate SoTinChiQuyDoi column
- `e78b6ff` - fix: Remove duplicate SoGioTinChiQuyDoi field
- `c64ec79` - docs: Add corrected test SQL
- `280f798` - docs: Add schema analysis and Migration 004
- `79f5f8a` - fix: Correct field name to SoGioTinChiQuyDoi
