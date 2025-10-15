# Changelog: Migration 003 - Extended Activity Fields

## Date: October 15, 2025

## Summary
Extended the `GhiNhanHoatDong` (Activity Record) table with 8 new fields to support comprehensive activity information for the bulk import system. This migration enables the system to capture detailed activity metadata including form of medical knowledge update, organizing units, date ranges, and certificate information.

## Changes Made

### 1. Database Schema Changes

#### New Columns Added to `GhiNhanHoatDong` Table
1. **HinhThucCapNhatKienThucYKhoa** (TEXT)
   - Form of medical knowledge update
   - Examples: "Hội thảo khoa học", "Đào tạo chuyên môn", "Hội nghị y khoa"
   - Nullable field for flexibility

2. **ChiTietVaiTro** (TEXT)
   - Detailed role/position in the activity
   - Examples: "Báo cáo viên", "Tham dự", "Điều phối viên"
   - Nullable field

3. **DonViToChuc** (TEXT)
   - Organizing unit/institution name
   - Examples: "Bệnh viện Đa khoa Cần Thơ", "Sở Y Tế Cần Thơ"
   - Nullable field

4. **NgayBatDau** (DATE)
   - Activity start date
   - Used for date range filtering and reporting
   - Nullable field

5. **NgayKetThuc** (DATE)
   - Activity end date
   - Used for calculating activity duration
   - Nullable field

6. **SoTiet** (NUMERIC(6,2))
   - Number of sessions/periods
   - Optional field for activities measured in sessions
   - CHECK constraint: >= 0

7. **SoGioTinChiQuyDoi** (NUMERIC(6,2))
   - Converted credit hours
   - Alternative credit measurement system
   - CHECK constraint: >= 0

8. **BangChungSoGiayChungNhan** (TEXT)
   - Evidence/Certificate number
   - For tracking official documentation
   - Nullable field

#### Constraints Added
- **chk_gnhd_ngay_bat_dau_ket_thuc**: Ensures `NgayKetThuc >= NgayBatDau`
- **CHECK constraints**: Ensures `SoTiet >= 0` and `SoGioTinChiQuyDoi >= 0`

#### Indexes Created
- **idx_gnhd_ngay_bat_dau**: Index on `NgayBatDau` for date filtering
- **idx_gnhd_ngay_ket_thuc**: Index on `NgayKetThuc` for date filtering
- **idx_gnhd_hinh_thuc**: Index on `HinhThucCapNhatKienThucYKhoa` for form filtering
- **idx_gnhd_don_vi_to_chuc**: Index on `DonViToChuc` for organizing unit filtering

### 2. TypeScript Schema Updates

#### Updated Files
- **lib/db/schemas.ts**
  - Extended `GhiNhanHoatDongSchema` with 8 new fields
  - Added date validation: `NgayKetThuc >= NgayBatDau`
  - Updated `CreateGhiNhanHoatDongSchema` and `UpdateGhiNhanHoatDongSchema`

### 3. Frontend Type Definitions

#### New File: `src/types/activity.ts`
Complete TypeScript type definitions for activities including:

**Core Types:**
- `TrangThaiDuyet` - Approval status enum
- `Activity` - Complete activity interface with all fields
- `CreateActivity` - For creating new activities
- `UpdateActivity` - For updating existing activities
- `ImportActivity` - For Excel import mapping
- `ActivityDisplay` - With computed fields (duration, status text)
- `ActivityListItem` - Minimal data for lists
- `ActivityFilter` - Filter options for queries
- `ActivitySort` - Sort options

**Helper Functions:**
- `calculateDuration()` - Calculate duration in days between dates
- `formatVietnameseDate()` - Format date as DD/MM/YYYY
- `parseVietnameseDate()` - Parse DD/MM/YYYY to Date object
- `getStatusDisplay()` - Get Vietnamese status text
- `getStatusColor()` - Get Tailwind color classes for status
- `validateActivityDates()` - Validate date range
- `validateCredits()` - Validate credit hours
- `isActivityEditable()` - Check if activity can be edited
- `isActivityApprovable()` - Check if activity can be approved

### 4. API Mapper Utilities

#### New File: `src/lib/api/activity-mapper.ts`
Data mapping utilities for activities including:

**Mapping Functions:**
- `mapDbToActivity()` - Map database row to Activity type
- `mapToDisplay()` - Add computed fields for display
- `mapImportToDb()` - Map Excel import data to database format
- `serializeActivity()` - Convert dates to ISO strings for JSON
- `deserializeActivity()` - Convert ISO strings back to Date objects

**Validation Functions:**
- `validateActivity()` - Comprehensive activity validation
- `buildFilterClause()` - Build SQL WHERE clause for filtering

**Export Functions:**
- `formatForExport()` - Format activity for Excel export

### 5. Migration Scripts

#### New File: `scripts/run-migration-003.ts`
Automated migration runner with:
- SQL execution
- Column verification
- Index verification
- Constraint verification
- Error handling and troubleshooting guidance

#### New File: `docs/migrations/003_add_activity_extended_fields.sql`
Complete SQL migration script with:
- Column additions
- Constraint definitions
- Index creation
- Column comments for documentation
- Verification queries

### 6. Documentation

#### New File: `.kiro/specs/compliance-management-platform/MIGRATION_003_SUMMARY.md`
Comprehensive migration documentation including:
- Overview and rationale
- Detailed field descriptions
- Excel template mapping
- Migration instructions
- Frontend integration examples
- Rollback procedures
- Testing checklist

## Excel Template Mapping

The Activities sheet in the bulk import Excel template now maps to these fields:

| Column | Excel Header | Database Field |
|--------|-------------|----------------|
| A | Mã nhân viên | MaNhanVien (FK) |
| B | Tên hoạt động/khóa học | TenHoatDong |
| C | Hình thức Cập nhật kiến thức y khoa | HinhThucCapNhatKienThucYKhoa |
| D | Chi tiết/Vai trò | ChiTietVaiTro |
| E | Đơn vị tổ chức | DonViToChuc |
| F | Ngày bắt đầu | NgayBatDau |
| G | Ngày kết thúc | NgayKetThuc |
| H | Số tiết (nếu có) | SoTiet |
| I | Số giờ tín chỉ quy đổi | SoGioTinChiQuyDoi |
| J | Bằng chứng (Số Giấy chứng nhận) | BangChungSoGiayChungNhan |

## Benefits

1. **Comprehensive Activity Tracking**: Captures all relevant activity metadata
2. **Flexible Credit Systems**: Supports both hour-based and session-based credits
3. **Better Reporting**: Date ranges enable duration calculations and timeline reports
4. **Audit Trail**: Certificate numbers provide verification capability
5. **Improved Search**: Indexes enable fast filtering by form, date, and organizing unit
6. **Type Safety**: Complete TypeScript types prevent runtime errors
7. **Data Validation**: Constraints ensure data integrity at database level

## Breaking Changes

None. This is a backward-compatible migration that adds new optional fields.

## Migration Instructions

### Prerequisites
- Database connection configured in `.env.local`
- Neon PostgreSQL database accessible
- Node.js and tsx installed

### Steps to Apply

1. **Run the migration:**
   ```bash
   npx tsx scripts/run-migration-003.ts
   ```

2. **Verify the migration:**
   ```sql
   -- Check columns
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
     'SoGioTinChiQuyDoi',
     'BangChungSoGiayChungNhan'
   );
   ```

3. **Test with sample data:**
   ```sql
   INSERT INTO "GhiNhanHoatDong" (
     "MaNhanVien",
     "TenHoatDong",
     "SoTinChiQuyDoi",
     "NguoiNhap",
     "HinhThucCapNhatKienThucYKhoa",
     "ChiTietVaiTro",
     "DonViToChuc",
     "NgayBatDau",
     "NgayKetThuc",
     "SoTiet",
     "SoGioTinChiQuyDoi",
     "BangChungSoGiayChungNhan"
   ) VALUES (
     (SELECT "MaNhanVien" FROM "NhanVien" LIMIT 1),
     'Hội thảo Y học lâm sàng 2024',
     5.5,
     (SELECT "MaTaiKhoan" FROM "TaiKhoan" LIMIT 1),
     'Hội thảo khoa học',
     'Báo cáo viên',
     'Bệnh viện Đa khoa Cần Thơ',
     '2024-03-15',
     '2024-03-17',
     12,
     5.5,
     'GCN-2024-001234'
   );
   ```

## Rollback Procedure

If needed, rollback using:

```sql
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_gnhd_ngay_bat_dau;
DROP INDEX IF EXISTS idx_gnhd_ngay_ket_thuc;
DROP INDEX IF EXISTS idx_gnhd_hinh_thuc;
DROP INDEX IF EXISTS idx_gnhd_don_vi_to_chuc;

-- Drop constraint
ALTER TABLE "GhiNhanHoatDong" 
  DROP CONSTRAINT IF EXISTS chk_gnhd_ngay_bat_dau_ket_thuc;

-- Drop columns
ALTER TABLE "GhiNhanHoatDong" 
  DROP COLUMN IF EXISTS "HinhThucCapNhatKienThucYKhoa",
  DROP COLUMN IF EXISTS "ChiTietVaiTro",
  DROP COLUMN IF EXISTS "DonViToChuc",
  DROP COLUMN IF EXISTS "NgayBatDau",
  DROP COLUMN IF EXISTS "NgayKetThuc",
  DROP COLUMN IF EXISTS "SoTiet",
  DROP COLUMN IF EXISTS "SoGioTinChiQuyDoi",
  DROP COLUMN IF EXISTS "BangChungSoGiayChungNhan";

COMMIT;
```

## Testing Checklist

- [x] Migration script executes without errors
- [x] All 8 new columns created successfully
- [x] All 4 indexes created successfully
- [x] Date constraint works correctly
- [x] Numeric constraints work correctly
- [x] TypeScript types compile without errors
- [x] Helper functions work correctly
- [x] Mapper utilities handle all data types
- [ ] API routes updated to include new fields
- [ ] Frontend forms updated to display new fields
- [ ] Excel import processes new fields correctly
- [ ] Validation works for all scenarios
- [ ] Performance testing with large datasets

## Next Steps

1. Update API routes to include new fields in queries
2. Update frontend forms to capture new fields
3. Update Excel template generator with new columns
4. Implement import validation for new fields
5. Test bulk import with sample data
6. Update user documentation
7. Deploy to production

## Related Files

### Database
- `docs/migrations/003_add_activity_extended_fields.sql`
- `scripts/run-migration-003.ts`

### TypeScript
- `lib/db/schemas.ts`
- `src/types/activity.ts`
- `src/lib/api/activity-mapper.ts`

### Documentation
- `.kiro/specs/compliance-management-platform/MIGRATION_003_SUMMARY.md`
- `.kiro/specs/compliance-management-platform/TASK_16_BULK_IMPORT_PLAN.md`

## Contributors
- Migration designed and implemented: October 15, 2025
- Based on bulk import requirements in TASK_16_BULK_IMPORT_PLAN.md

## Notes
- All new fields are nullable to maintain backward compatibility
- Indexes created for common query patterns (date ranges, form types, organizing units)
- TypeScript types provide compile-time safety for all operations
- Helper functions handle Vietnamese date format (DD/MM/YYYY)
- Validation functions ensure data integrity before database operations
