# Migration 002: Extended Practitioner Fields - Summary

## Overview
This migration adds extended fields to the `NhanVien` (Practitioner) table to support comprehensive practitioner information from the bulk import system.

## Files Created/Modified

### 1. Database Migration
**File:** `docs/migrations/002_add_nhanvien_extended_fields.sql`

**New Columns Added:**
- `MaNhanVienNoiBo` TEXT - Internal employee ID (optional)
- `NgaySinh` DATE - Date of birth
- `GioiTinh` TEXT - Gender (Nam/Nữ/Khác)
- `KhoaPhong` TEXT - Department/Division
- `NoiCapCCHN` TEXT - Issuing authority for practice certificate
- `PhamViChuyenMon` TEXT - Scope of professional practice

**Constraints:**
- Gender CHECK constraint: `GioiTinh IN ('Nam', 'Nữ', 'Khác')`
- Age CHECK constraint: Must be >= 18 years old if NgaySinh provided

**Indexes:**
- `idx_nv_ma_noi_bo` - For internal employee ID lookups
- `idx_nv_khoa_phong` - For department filtering
- `idx_nv_gioi_tinh` - For gender statistics

### 2. TypeScript Schema Updates
**File:** `lib/db/schemas.ts`

**Changes:**
- Added `GioiTinhSchema` enum: `['Nam', 'Nữ', 'Khác']`
- Extended `NhanVienSchema` with 6 new fields
- Added age validation (>= 18 years) in Zod schema
- Updated `CreateNhanVienSchema` and `UpdateNhanVienSchema`

### 3. Frontend Type Definitions
**File:** `src/types/practitioner.ts`

**New Types:**
- `GioiTinh` - Gender type
- `Practitioner` - Complete practitioner interface
- `CreatePractitioner` - For creation operations
- `UpdatePractitioner` - For update operations
- `ImportPractitioner` - For Excel import
- `PractitionerDisplay` - With computed fields
- `PractitionerListItem` - Minimal data for lists
- `PractitionerFilter` - Filter options
- `PractitionerSort` - Sort options

**Helper Functions:**
- `calculateAge()` - Calculate age from date of birth
- `formatVietnameseDate()` - Format date as DD/MM/YYYY
- `parseVietnameseDate()` - Parse DD/MM/YYYY to Date
- `getGenderDisplay()` - Get gender display text
- `getWorkStatusDisplay()` - Get work status display text
- `getWorkStatusColor()` - Get work status color classes

### 4. API Mapper Utilities
**File:** `src/lib/api/practitioner-mapper.ts`

**Functions:**
- `mapDbToPractitioner()` - Map database row to Practitioner type
- `mapToDisplay()` - Add computed fields for display
- `mapImportToDb()` - Map Excel import data to database format
- `serializePractitioner()` - Convert dates to ISO strings for JSON
- `deserializePractitioner()` - Convert ISO strings back to Date objects
- `validatePractitioner()` - Validate practitioner data
- `buildFilterClause()` - Build SQL WHERE clause for filtering

### 5. Migration Script
**File:** `scripts/run-migration-002.ts`

**Features:**
- Reads and executes migration SQL
- Verifies new columns were created
- Provides troubleshooting guidance
- Shows next steps after migration

## Running the Migration

### Step 1: Run Migration Script
```bash
npx tsx scripts/run-migration-002.ts
```

### Step 2: Verify Migration
```sql
-- Check new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'NhanVien'
AND column_name IN (
  'MaNhanVienNoiBo',
  'NgaySinh',
  'GioiTinh',
  'KhoaPhong',
  'NoiCapCCHN',
  'PhamViChuyenMon'
);

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'NhanVien'
AND indexname LIKE 'idx_nv_%';
```

### Step 3: Test with Sample Data
```sql
-- Insert test practitioner with extended fields
INSERT INTO "NhanVien" (
  "HoVaTen",
  "SoCCHN",
  "NgayCapCCHN",
  "MaDonVi",
  "TrangThaiLamViec",
  "MaNhanVienNoiBo",
  "NgaySinh",
  "GioiTinh",
  "KhoaPhong",
  "ChucDanh",
  "NoiCapCCHN",
  "PhamViChuyenMon"
) VALUES (
  'Nguyễn Văn Test',
  'CCHN-TEST-001',
  '2023-01-15',
  (SELECT "MaDonVi" FROM "DonVi" LIMIT 1),
  'DangLamViec',
  'NV-TEST-001',
  '1985-05-15',
  'Nam',
  'Khoa Nội',
  'Bác sĩ chuyên khoa II',
  'Sở Y Tế Cần Thơ',
  'Nội khoa'
);

-- Query with new fields
SELECT 
  "HoVaTen",
  "SoCCHN",
  "MaNhanVienNoiBo",
  "NgaySinh",
  "GioiTinh",
  "KhoaPhong",
  "NoiCapCCHN",
  "PhamViChuyenMon"
FROM "NhanVien"
WHERE "SoCCHN" = 'CCHN-TEST-001';
```

## Frontend Integration

### 1. Update API Routes

**Example: GET /api/practitioners**
```typescript
import { mapDbToPractitioner, serializePractitioner } from '@/lib/api/practitioner-mapper';

export async function GET(request: NextRequest) {
  const practitioners = await db.query(`
    SELECT 
      "MaNhanVien",
      "HoVaTen",
      "SoCCHN",
      "NgayCapCCHN",
      "MaDonVi",
      "TrangThaiLamViec",
      "Email",
      "DienThoai",
      "ChucDanh",
      "MaNhanVienNoiBo",
      "NgaySinh",
      "GioiTinh",
      "KhoaPhong",
      "NoiCapCCHN",
      "PhamViChuyenMon"
    FROM "NhanVien"
    WHERE "MaDonVi" = $1
  `, [unitId]);

  const mapped = practitioners.map(row => 
    serializePractitioner(mapDbToPractitioner(row))
  );

  return NextResponse.json({ success: true, data: mapped });
}
```

**Example: POST /api/practitioners**
```typescript
import { mapImportToDb, validatePractitioner } from '@/lib/api/practitioner-mapper';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate
  const validation = validatePractitioner(body);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, errors: validation.errors },
      { status: 400 }
    );
  }

  // Insert
  const result = await db.query(`
    INSERT INTO "NhanVien" (
      "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi",
      "TrangThaiLamViec", "ChucDanh", "MaNhanVienNoiBo",
      "NgaySinh", "GioiTinh", "KhoaPhong", "NoiCapCCHN",
      "PhamViChuyenMon"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    body.HoVaTen,
    body.SoCCHN,
    body.NgayCapCCHN,
    body.MaDonVi,
    body.TrangThaiLamViec || 'DangLamViec',
    body.ChucDanh,
    body.MaNhanVienNoiBo,
    body.NgaySinh,
    body.GioiTinh,
    body.KhoaPhong,
    body.NoiCapCCHN,
    body.PhamViChuyenMon
  ]);

  return NextResponse.json({ success: true, data: result[0] });
}
```

### 2. Update Frontend Forms

**Example: Practitioner Form Component**
```typescript
import { Practitioner, GioiTinh } from '@/types/practitioner';
import { formatVietnameseDate, parseVietnameseDate } from '@/types/practitioner';

export function PractitionerForm({ practitioner }: { practitioner?: Practitioner }) {
  return (
    <form>
      {/* Basic Info */}
      <input name="HoVaTen" defaultValue={practitioner?.HoVaTen} required />
      <input name="SoCCHN" defaultValue={practitioner?.SoCCHN || ''} />
      
      {/* Extended Fields */}
      <input name="MaNhanVienNoiBo" defaultValue={practitioner?.MaNhanVienNoiBo || ''} />
      <input 
        type="date" 
        name="NgaySinh" 
        defaultValue={practitioner?.NgaySinh ? formatVietnameseDate(practitioner.NgaySinh) : ''} 
      />
      <select name="GioiTinh" defaultValue={practitioner?.GioiTinh || ''}>
        <option value="">Chọn giới tính</option>
        <option value="Nam">Nam</option>
        <option value="Nữ">Nữ</option>
        <option value="Khác">Khác</option>
      </select>
      <input name="KhoaPhong" defaultValue={practitioner?.KhoaPhong || ''} />
      <input name="ChucDanh" defaultValue={practitioner?.ChucDanh || ''} />
      <input name="NoiCapCCHN" defaultValue={practitioner?.NoiCapCCHN || ''} />
      <input name="PhamViChuyenMon" defaultValue={practitioner?.PhamViChuyenMon || ''} />
    </form>
  );
}
```

### 3. Update Display Components

**Example: Practitioner Detail View**
```typescript
import { PractitionerDisplay } from '@/types/practitioner';
import { calculateAge, getGenderDisplay } from '@/types/practitioner';

export function PractitionerDetail({ practitioner }: { practitioner: PractitionerDisplay }) {
  return (
    <div>
      <h2>{practitioner.HoVaTen}</h2>
      
      {/* Basic Info */}
      <div>
        <label>Số CCHN:</label>
        <span>{practitioner.SoCCHN}</span>
      </div>
      
      {/* Extended Info */}
      {practitioner.MaNhanVienNoiBo && (
        <div>
          <label>Mã nhân viên:</label>
          <span>{practitioner.MaNhanVienNoiBo}</span>
        </div>
      )}
      
      {practitioner.NgaySinh && (
        <div>
          <label>Ngày sinh:</label>
          <span>
            {formatVietnameseDate(practitioner.NgaySinh)}
            {practitioner.Tuoi && ` (${practitioner.Tuoi} tuổi)`}
          </span>
        </div>
      )}
      
      {practitioner.GioiTinh && (
        <div>
          <label>Giới tính:</label>
          <span>{getGenderDisplay(practitioner.GioiTinh)}</span>
        </div>
      )}
      
      {practitioner.KhoaPhong && (
        <div>
          <label>Khoa/Phòng:</label>
          <span>{practitioner.KhoaPhong}</span>
        </div>
      )}
      
      {practitioner.NoiCapCCHN && (
        <div>
          <label>Nơi cấp:</label>
          <span>{practitioner.NoiCapCCHN}</span>
        </div>
      )}
      
      {practitioner.PhamViChuyenMon && (
        <div>
          <label>Phạm vi chuyên môn:</label>
          <span>{practitioner.PhamViChuyenMon}</span>
        </div>
      )}
    </div>
  );
}
```

## Bulk Import Integration

The extended fields are now fully supported in the bulk import system:

**Excel Template Mapping:**
- Column A (Mã nhân viên) → `MaNhanVienNoiBo`
- Column B (Họ và tên) → `HoVaTen`
- Column C (Ngày sinh) → `NgaySinh`
- Column D (Giới tính) → `GioiTinh`
- Column E (Khoa/Phòng) → `KhoaPhong`
- Column F (Chức vụ) → `ChucDanh`
- Column G (Số CCHN) → `SoCCHN`
- Column H (Ngày cấp) → `NgayCapCCHN`
- Column I (Nơi cấp) → `NoiCapCCHN`
- Column J (Phạm vi chuyên môn) → `PhamViChuyenMon`

**Import Processing:**
```typescript
import { mapImportToDb } from '@/lib/api/practitioner-mapper';

// Parse Excel row
const importData: ImportPractitioner = {
  MaNhanVienNoiBo: row[0],
  HoVaTen: row[1],
  NgaySinh: row[2], // DD/MM/YYYY
  GioiTinh: row[3],
  KhoaPhong: row[4],
  ChucVu: row[5],
  SoCCHN: row[6],
  NgayCap: row[7], // DD/MM/YYYY
  NoiCap: row[8],
  PhamViChuyenMon: row[9]
};

// Map to database format
const dbData = mapImportToDb(importData, unitId);

// Insert into database
await db.query(`
  INSERT INTO "NhanVien" (...)
  VALUES (...)
`, Object.values(dbData));
```

## Rollback Instructions

If you need to rollback this migration:

```sql
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_nv_ma_noi_bo;
DROP INDEX IF EXISTS idx_nv_khoa_phong;
DROP INDEX IF EXISTS idx_nv_gioi_tinh;

-- Drop columns
ALTER TABLE "NhanVien" 
  DROP COLUMN IF EXISTS "MaNhanVienNoiBo",
  DROP COLUMN IF EXISTS "NgaySinh",
  DROP COLUMN IF EXISTS "GioiTinh",
  DROP COLUMN IF EXISTS "KhoaPhong",
  DROP COLUMN IF EXISTS "NoiCapCCHN",
  DROP COLUMN IF EXISTS "PhamViChuyenMon";

COMMIT;
```

## Testing Checklist

- [ ] Migration script runs successfully
- [ ] All 6 new columns are created
- [ ] Indexes are created correctly
- [ ] Age constraint works (rejects age < 18)
- [ ] Gender constraint works (only Nam/Nữ/Khác)
- [ ] TypeScript types compile without errors
- [ ] API routes return new fields
- [ ] Frontend forms display new fields
- [ ] Bulk import processes new fields correctly
- [ ] Validation works for all new fields
- [ ] Date parsing works (DD/MM/YYYY format)
- [ ] Age calculation is accurate
- [ ] Filtering by gender works
- [ ] Filtering by department works

## Next Steps

1. ✅ Run migration: `npx tsx scripts/run-migration-002.ts`
2. ✅ Update TypeScript schemas (already done)
3. ⏳ Update API routes to include new fields
4. ⏳ Update frontend forms and displays
5. ⏳ Test bulk import with new schema
6. ⏳ Update documentation
7. ⏳ Deploy to production

## Support

If you encounter issues:
1. Check DATABASE_URL in `.env.local`
2. Verify database connection
3. Review migration SQL for syntax errors
4. Check if migration was already applied
5. Review error logs for specific issues
