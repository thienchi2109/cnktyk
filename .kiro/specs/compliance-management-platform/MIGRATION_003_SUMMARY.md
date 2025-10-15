# Migration 003: Extended Activity Fields - Summary

## Overview
This migration adds extended fields to the `GhiNhanHoatDong` (Activity Record) table to support comprehensive activity information from the bulk import system.

## Files Created/Modified

### 1. Database Migration
**File:** `docs/migrations/003_add_activity_extended_fields.sql`

**New Columns Added:**
- `HinhThucCapNhatKienThucYKhoa` TEXT - Form of medical knowledge update (e.g., conference, training, workshop)
- `ChiTietVaiTro` TEXT - Detailed role/position in the activity
- `DonViToChuc` TEXT - Organizing unit/institution
- `NgayBatDau` DATE - Activity start date
- `NgayKetThuc` DATE - Activity end date
- `SoTiet` NUMERIC(6,2) - Number of sessions/periods (if applicable)
- `SoGioTinChiQuyDoi` NUMERIC(6,2) - Converted credit hours
- `BangChungSoGiayChungNhan` TEXT - Evidence/Certificate number

**Constraints:**
- Date CHECK constraint: `NgayKetThuc >= NgayBatDau`
- Numeric CHECK constraints: `SoTiet >= 0`, `SoGioTinChiQuyDoi >= 0`

**Indexes:**
- `idx_gnhd_ngay_bat_dau` - For start date filtering
- `idx_gnhd_ngay_ket_thuc` - For end date filtering
- `idx_gnhd_hinh_thuc` - For activity form filtering
- `idx_gnhd_don_vi_to_chuc` - For organizing unit filtering

### 2. TypeScript Schema Updates
**File:** `lib/db/schemas.ts`

**Changes:**
- Extended `GhiNhanHoatDongSchema` with 8 new fields
- Added date validation (NgayKetThuc >= NgayBatDau) in Zod schema
- Updated `CreateGhiNhanHoatDongSchema` and `UpdateGhiNhanHoatDongSchema`

### 3. Frontend Type Definitions
**File:** `src/types/activity.ts`

**New Types:**
- `TrangThaiDuyet` - Approval status type
- `Activity` - Complete activity interface
- `CreateActivity` - For creation operations
- `UpdateActivity` - For update operations
- `ImportActivity` - For Excel import
- `ActivityDisplay` - With computed fields
- `ActivityListItem` - Minimal data for lists
- `ActivityFilter` - Filter options
- `ActivitySort` - Sort options

**Helper Functions:**
- `calculateDuration()` - Calculate duration in days
- `formatVietnameseDate()` - Format date as DD/MM/YYYY
- `parseVietnameseDate()` - Parse DD/MM/YYYY to Date
- `getStatusDisplay()` - Get status display text
- `getStatusColor()` - Get status color classes
- `validateActivityDates()` - Validate date range
- `validateCredits()` - Validate credit hours
- `isActivityEditable()` - Check if activity can be edited
- `isActivityApprovable()` - Check if activity can be approved

### 4. API Mapper Utilities
**File:** `src/lib/api/activity-mapper.ts`

**Functions:**
- `mapDbToActivity()` - Map database row to Activity type
- `mapToDisplay()` - Add computed fields for display
- `mapImportToDb()` - Map Excel import data to database format
- `serializeActivity()` - Convert dates to ISO strings for JSON
- `deserializeActivity()` - Convert ISO strings back to Date objects
- `validateActivity()` - Validate activity data
- `buildFilterClause()` - Build SQL WHERE clause for filtering
- `formatForExport()` - Format activity for Excel export

### 5. Migration Script
**File:** `scripts/run-migration-003.ts`

**Features:**
- Reads and executes migration SQL
- Verifies new columns were created
- Provides troubleshooting guidance
- Shows next steps after migration

## Excel Template Mapping

Based on the new schema, the Activities sheet in the Excel template maps as follows:

| Column | Field Name | Maps To Database Field |
|--------|-----------|------------------------|
| A | Mã nhân viên (FK to Practitioners) | MaNhanVien |
| B | Tên hoạt động/khóa học | TenHoatDong |
| C | Hình thức Cập nhật kiến thức y khoa | HinhThucCapNhatKienThucYKhoa |
| D | Chi tiết/Vai trò | ChiTietVaiTro |
| E | Đơn vị tổ chức | DonViToChuc |
| F | Ngày bắt đầu | NgayBatDau |
| G | Ngày kết thúc | NgayKetThuc |
| H | Số tiết (nếu có) | SoTiet |
| I | Số giờ tín chỉ quy đổi | SoGioTinChiQuyDoi |
| J | Bằng chứng (Số Giấy chứng nhận) | BangChungSoGiayChungNhan |

## Running the Migration

### Step 1: Run Migration Script
```bash
npx tsx scripts/run-migration-003.ts
```

### Step 2: Verify Migration
```sql
-- Check new columns
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
  'BangChungSoGiayChungNhan'
);

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'GhiNhanHoatDong'
AND indexname LIKE 'idx_gnhd_%';
```

### Step 3: Test with Sample Data
```sql
-- Insert test activity with extended fields
INSERT INTO "GhiNhanHoatDong" (
  "MaNhanVien",
  "TenHoatDong",
  "SoTinChiQuyDoi",
  "NguoiNhap",
  "TrangThaiDuyet",
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
  'ChoDuyet',
  'Hội thảo khoa học',
  'Báo cáo viên',
  'Bệnh viện Đa khoa Cần Thơ',
  '2024-03-15',
  '2024-03-17',
  12,
  5.5,
  'GCN-2024-001234'
);

-- Query with new fields
SELECT 
  "TenHoatDong",
  "HinhThucCapNhatKienThucYKhoa",
  "ChiTietVaiTro",
  "DonViToChuc",
  "NgayBatDau",
  "NgayKetThuc",
  "SoTiet",
  "SoGioTinChiQuyDoi",
  "BangChungSoGiayChungNhan"
FROM "GhiNhanHoatDong"
WHERE "TenHoatDong" LIKE '%Hội thảo%';
```

## Frontend Integration

### 1. Update API Routes

**Example: GET /api/activities**
```typescript
import { mapDbToActivity, serializeActivity } from '@/lib/api/activity-mapper';

export async function GET(request: NextRequest) {
  const activities = await db.query(`
    SELECT 
      "MaGhiNhan",
      "MaNhanVien",
      "MaDanhMuc",
      "TenHoatDong",
      "VaiTro",
      "ThoiGianBatDau",
      "ThoiGianKetThuc",
      "SoGio",
      "SoTinChiQuyDoi",
      "FileMinhChungUrl",
      "NguoiNhap",
      "TrangThaiDuyet",
      "ThoiGianDuyet",
      "GhiChu",
      "HinhThucCapNhatKienThucYKhoa",
      "ChiTietVaiTro",
      "DonViToChuc",
      "NgayBatDau",
      "NgayKetThuc",
      "SoTiet",
      "BangChungSoGiayChungNhan",
      "CreatedAt",
      "UpdatedAt"
    FROM "GhiNhanHoatDong"
    WHERE "MaNhanVien" = $1
    ORDER BY "NgayBatDau" DESC
  `, [practitionerId]);

  const mapped = activities.map(row => 
    serializeActivity(mapDbToActivity(row))
  );

  return NextResponse.json({ success: true, data: mapped });
}
```

**Example: POST /api/activities**
```typescript
import { mapImportToDb, validateActivity } from '@/lib/api/activity-mapper';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate
  const validation = validateActivity(body);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, errors: validation.errors },
      { status: 400 }
    );
  }

  // Insert
  const result = await db.query(`
    INSERT INTO "GhiNhanHoatDong" (
      "MaNhanVien", "TenHoatDong", "SoTinChiQuyDoi", "NguoiNhap",
      "TrangThaiDuyet", "HinhThucCapNhatKienThucYKhoa", "ChiTietVaiTro",
      "DonViToChuc", "NgayBatDau", "NgayKetThuc", "SoTiet",
      "BangChungSoGiayChungNhan"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    body.MaNhanVien,
    body.TenHoatDong,
    body.SoTinChiQuyDoi,
    body.NguoiNhap,
    body.TrangThaiDuyet || 'ChoDuyet',
    body.HinhThucCapNhatKienThucYKhoa,
    body.ChiTietVaiTro,
    body.DonViToChuc,
    body.NgayBatDau,
    body.NgayKetThuc,
    body.SoTiet,
    body.BangChungSoGiayChungNhan
  ]);

  return NextResponse.json({ success: true, data: result[0] });
}
```

### 2. Update Frontend Forms

**Example: Activity Form Component**
```typescript
import { Activity } from '@/types/activity';
import { formatVietnameseDate } from '@/types/activity';

export function ActivityForm({ activity }: { activity?: Activity }) {
  return (
    <form>
      {/* Basic Info */}
      <input name="TenHoatDong" defaultValue={activity?.TenHoatDong} required />
      
      {/* Extended Fields */}
      <input 
        name="HinhThucCapNhatKienThucYKhoa" 
        defaultValue={activity?.HinhThucCapNhatKienThucYKhoa || ''} 
        placeholder="Hội thảo, Đào tạo, Hội nghị..."
      />
      <input 
        name="ChiTietVaiTro" 
        defaultValue={activity?.ChiTietVaiTro || ''} 
        placeholder="Báo cáo viên, Tham dự..."
      />
      <input 
        name="DonViToChuc" 
        defaultValue={activity?.DonViToChuc || ''} 
        placeholder="Tên đơn vị tổ chức"
      />
      <input 
        type="date" 
        name="NgayBatDau" 
        defaultValue={activity?.NgayBatDau ? formatVietnameseDate(activity.NgayBatDau) : ''} 
      />
      <input 
        type="date" 
        name="NgayKetThuc" 
        defaultValue={activity?.NgayKetThuc ? formatVietnameseDate(activity.NgayKetThuc) : ''} 
      />
      <input 
        type="number" 
        name="SoTiet" 
        defaultValue={activity?.SoTiet || ''} 
        placeholder="Số tiết (nếu có)"
        step="0.01"
      />
      <input 
        type="number" 
        name="SoTinChiQuyDoi" 
        defaultValue={activity?.SoTinChiQuyDoi || ''} 
        placeholder="Số giờ tín chỉ quy đổi"
        step="0.01"
        required
      />
      <input 
        name="BangChungSoGiayChungNhan" 
        defaultValue={activity?.BangChungSoGiayChungNhan || ''} 
        placeholder="Số giấy chứng nhận"
      />
    </form>
  );
}
```

### 3. Update Display Components

**Example: Activity Detail View**
```typescript
import { ActivityDisplay } from '@/types/activity';
import { formatVietnameseDate, getStatusDisplay, getStatusColor } from '@/types/activity';

export function ActivityDetail({ activity }: { activity: ActivityDisplay }) {
  return (
    <div>
      <h2>{activity.TenHoatDong}</h2>
      
      {/* Basic Info */}
      <div>
        <label>Trạng thái:</label>
        <span className={getStatusColor(activity.TrangThaiDuyet)}>
          {getStatusDisplay(activity.TrangThaiDuyet)}
        </span>
      </div>
      
      {/* Extended Info */}
      {activity.HinhThucCapNhatKienThucYKhoa && (
        <div>
          <label>Hình thức:</label>
          <span>{activity.HinhThucCapNhatKienThucYKhoa}</span>
        </div>
      )}
      
      {activity.ChiTietVaiTro && (
        <div>
          <label>Vai trò:</label>
          <span>{activity.ChiTietVaiTro}</span>
        </div>
      )}
      
      {activity.DonViToChuc && (
        <div>
          <label>Đơn vị tổ chức:</label>
          <span>{activity.DonViToChuc}</span>
        </div>
      )}
      
      {activity.NgayBatDau && (
        <div>
          <label>Ngày bắt đầu:</label>
          <span>{formatVietnameseDate(activity.NgayBatDau)}</span>
        </div>
      )}
      
      {activity.NgayKetThuc && (
        <div>
          <label>Ngày kết thúc:</label>
          <span>
            {formatVietnameseDate(activity.NgayKetThuc)}
            {activity.SoNgayHoatDong && ` (${activity.SoNgayHoatDong} ngày)`}
          </span>
        </div>
      )}
      
      {activity.SoTiet && (
        <div>
          <label>Số tiết:</label>
          <span>{activity.SoTiet}</span>
        </div>
      )}
      
      {activity.SoTinChiQuyDoi && (
        <div>
          <label>Số giờ tín chỉ:</label>
          <span>{activity.SoTinChiQuyDoi}</span>
        </div>
      )}
      
      {activity.BangChungSoGiayChungNhan && (
        <div>
          <label>Giấy chứng nhận:</label>
          <span>{activity.BangChungSoGiayChungNhan}</span>
        </div>
      )}
    </div>
  );
}
```

## Bulk Import Integration

The extended fields are now fully supported in the bulk import system:

**Import Processing:**
```typescript
import { mapImportToDb } from '@/lib/api/activity-mapper';

// Parse Excel row
const importData: ImportActivity = {
  MaNhanVien: row[0], // FK lookup
  TenHoatDong: row[1],
  HinhThucCapNhatKienThucYKhoa: row[2],
  ChiTietVaiTro: row[3],
  DonViToChuc: row[4],
  NgayBatDau: row[5], // DD/MM/YYYY
  NgayKetThuc: row[6], // DD/MM/YYYY
  SoTiet: row[7],
  SoTinChiQuyDoi: row[8], // Maps to existing SoTinChiQuyDoi column
  BangChungSoGiayChungNhan: row[9]
};

// Map to database format
const dbData = mapImportToDb(importData, session.user.id);

// Insert into database
await db.query(`
  INSERT INTO "GhiNhanHoatDong" (...)
  VALUES (...)
`, Object.values(dbData));
```

## Rollback Instructions

If you need to rollback this migration:

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

-- Drop columns (Note: Do NOT drop SoTinChiQuyDoi as it's part of the original schema)
ALTER TABLE "GhiNhanHoatDong" 
  DROP COLUMN IF EXISTS "HinhThucCapNhatKienThucYKhoa",
  DROP COLUMN IF EXISTS "ChiTietVaiTro",
  DROP COLUMN IF EXISTS "DonViToChuc",
  DROP COLUMN IF EXISTS "NgayBatDau",
  DROP COLUMN IF EXISTS "NgayKetThuc",
  DROP COLUMN IF EXISTS "SoTiet",
  DROP COLUMN IF EXISTS "BangChungSoGiayChungNhan";

COMMIT;
```

## Testing Checklist

- [ ] Migration script runs successfully
- [ ] All 8 new columns are created
- [ ] Indexes are created correctly
- [ ] Date constraint works (NgayKetThuc >= NgayBatDau)
- [ ] Numeric constraints work (SoTiet >= 0, SoGioTinChiQuyDoi >= 0)
- [ ] TypeScript types compile without errors
- [ ] API routes return new fields
- [ ] Frontend forms display new fields
- [ ] Bulk import processes new fields correctly
- [ ] Validation works for all new fields
- [ ] Date parsing works (DD/MM/YYYY format)
- [ ] Duration calculation is accurate
- [ ] Filtering by activity form works
- [ ] Filtering by organizing unit works

## Next Steps

1. ✅ Run migration: `npx tsx scripts/run-migration-003.ts`
2. ✅ Update TypeScript schemas (already done)
3. ⏳ Update API routes to include new fields
4. ⏳ Update frontend forms and displays
5. ⏳ Update Excel template with new columns
6. ⏳ Test bulk import with new schema
7. ⏳ Update documentation
8. ⏳ Deploy to production

## Support

If you encounter issues:
1. Check DATABASE_URL in `.env.local`
2. Verify database connection
3. Review migration SQL for syntax errors
4. Check if migration was already applied
5. Review error logs for specific issues
