# Bulk Import System (Task 16)

## Overview
Excel-based bulk import system for Unit Administrators (DonVi role) to import practitioners and historical activity records efficiently.

## Status
🚧 **In Progress** - Planning and schema design complete, implementation pending

## Excel Template Design

### Sheet 1: Practitioners (Nhân viên) - 10 Columns

| Column | Field | Type | Required | Maps To |
|--------|-------|------|----------|---------|
| A | Mã nhân viên | Text | ○ | MaNhanVienNoiBo |
| B | Họ và tên | Text | ✓ | HoVaTen |
| C | Ngày sinh | Date | ○ | NgaySinh |
| D | Giới tính | Enum | ○ | GioiTinh |
| E | Khoa/Phòng | Text | ○ | KhoaPhong |
| F | Chức vụ | Text | ○ | ChucDanh |
| G | Số CCHN | Text | ✓ | SoCCHN |
| H | Ngày cấp | Date | ✓ | NgayCapCCHN |
| I | Nơi cấp | Text | ○ | NoiCapCCHN |
| J | Phạm vi chuyên môn | Text | ○ | PhamViChuyenMon |

**Date Format**: DD/MM/YYYY (Vietnamese standard)
**Gender Values**: Nam, Nữ, Khác

### Sheet 2: Activities (Hoạt động) - 9 Columns

| Column | Field | Type | Required | Maps To |
|--------|-------|------|----------|---------|
| A | Số CCHN | Text | ✓ | Lookup MaNhanVien |
| B | Tên hoạt động | Text | ✓ | TenHoatDong |
| C | Vai trò | Text | ○ | VaiTro |
| D | Ngày hoạt động | Date | ✓ | NgayHoatDong |
| E | Số tín chỉ | Number | ✓ | SoTinChi |
| F | Trạng thái | Enum | ✓ | TrangThaiDuyet |
| G | Ngày duyệt | Date | ○ | NgayDuyet |
| H | Ghi chú duyệt | Text | ○ | GhiChuDuyet |
| I | URL minh chứng | URL | ○ | FileMinhChungUrl |

**Status Values**: ChoDuyet, DaDuyet, TuChoi

### Sheet 3: Instructions (Hướng dẫn)
Complete Vietnamese instructions with:
- Step-by-step import process
- Field descriptions and examples
- Validation rules
- Common errors and solutions
- Support contact information

## Implementation Components

### 1. Backend Files

**Migration**:
- `docs/migrations/002_add_nhanvien_extended_fields.sql` ✅
- `scripts/run-migration-002.ts` ✅

**TypeScript Schemas**:
- `lib/db/schemas.ts` - Updated with extended fields ✅
- `src/types/practitioner.ts` - Frontend type definitions ✅
- `src/lib/api/practitioner-mapper.ts` - Mapping utilities ✅

**API Routes** (To be created):
- `src/app/api/import/template/route.ts` - Download Excel template
- `src/app/api/import/validate/route.ts` - Validate uploaded file
- `src/app/api/import/execute/route.ts` - Execute import
- `src/app/api/import/history/route.ts` - Import history

**Services** (To be created):
- `src/lib/import/excel-processor.ts` - Excel parsing with exceljs
- `src/lib/import/validators.ts` - Field and business rule validation
- `src/lib/import/import-service.ts` - Database import operations

### 2. Frontend Components (To be created)

**Pages**:
- `src/app/import/page.tsx` - Main import interface
- `src/app/import/history/page.tsx` - Import history viewer

**Components**:
- `src/components/import/upload-zone.tsx` - Drag-drop file upload
- `src/components/import/validation-results.tsx` - Error/warning display
- `src/components/import/import-progress.tsx` - Progress tracking
- `src/components/import/import-summary.tsx` - Success/failure summary

## Validation Rules

### Practitioners
- **Required**: HoVaTen, SoCCHN, NgayCap
- **Unique**: SoCCHN (across system)
- **Age**: >= 18 years if NgaySinh provided
- **Gender**: Must be Nam, Nữ, or Khác
- **Date Format**: DD/MM/YYYY

### Activities
- **Required**: SoCCHN, TenHoatDong, NgayHoatDong, SoTinChi, TrangThai
- **CCHN Lookup**: Must exist in practitioners sheet or database
- **Date Range**: NgayHoatDong must be within practitioner's cycle
- **Approval Logic**: If TrangThai = DaDuyet/TuChoi, NgayDuyet required
- **Credits**: Min 0, Max 999.99, 2 decimal places

## Business Rules

### Import Process
1. **Validation First**: All data validated before any database changes
2. **Transaction Safety**: All-or-nothing import (rollback on any error)
3. **Unit Scoping**: All practitioners imported to user's unit (MaDonVi from session)
4. **UPSERT Logic**: Update existing practitioners by SoCCHN, insert new ones
5. **Cycle Creation**: Auto-create 5-year compliance cycles if not exists
6. **Audit Logging**: Log all import operations to NhatKyHeThong

### Data Mapping
```typescript
// Practitioner mapping
{
  MaNhanVienNoiBo: row[0] || null,
  HoVaTen: row[1].trim(),
  NgaySinh: parseVietnameseDate(row[2]),
  GioiTinh: row[3] || null,
  KhoaPhong: row[4]?.trim() || null,
  ChucDanh: row[5]?.trim() || null,
  SoCCHN: row[6].trim(),
  NgayCapCCHN: parseVietnameseDate(row[7]),
  NoiCapCCHN: row[8]?.trim() || null,
  PhamViChuyenMon: row[9]?.trim() || null,
  MaDonVi: session.user.unitId, // Auto-filled
  TrangThaiLamViec: 'DangLamViec' // Default
}

// Activity mapping
{
  MaNhanVien: lookupBySoCCHN(row[0]),
  TenHoatDong: row[1].trim(),
  VaiTro: row[2]?.trim() || null,
  NgayHoatDong: parseVietnameseDate(row[3]),
  SoTinChi: parseFloat(row[4]),
  TrangThaiDuyet: row[5],
  NgayDuyet: row[6] ? parseVietnameseDate(row[6]) : null,
  GhiChuDuyet: row[7]?.trim() || null,
  FileMinhChungUrl: row[8]?.trim() || null,
  NguoiNhap: session.user.id, // Auto-filled
  NguoiDuyet: row[5] !== 'ChoDuyet' ? session.user.id : null,
  MaDanhMuc: null // Custom activities
}
```

## Error Handling

### Validation Errors (Blocking)
- Missing required fields
- Invalid data types
- Invalid enum values
- Invalid date formats
- Duplicate CCHN in file
- CCHN not found for activities
- Activity date outside cycle
- Age < 18 years

### Warnings (Non-blocking)
- Missing optional fields
- Unusual credit amounts (> 50)
- Future activity dates
- Very old activity dates (> 10 years)
- Duplicate activities

### Import Errors
- Database constraint violations
- Transaction rollback on any error
- Partial import not allowed
- Detailed error logging with row numbers

## Performance Optimization

### Batch Processing
- Process practitioners in batches of 100
- Process activities in batches of 500
- Use database transactions per batch

### Caching
- Cache unit data
- Cache existing CCHN lookups
- Parallel validation where possible

### Progress Tracking
- Real-time progress updates
- Estimated time remaining
- Cancel capability

## Security Considerations

### Authorization
- Only DonVi role can access import features
- Users can only import to their own unit
- Validate session and unit ownership

### File Security
- Validate file type (MIME type check)
- Limit file size (10MB max)
- Temporary file cleanup
- Sanitize all input data

### Data Validation
- Prevent SQL injection via parameterized queries
- Validate all foreign key references
- Check for data integrity

## Dependencies

```json
{
  "exceljs": "^4.4.0",
  "file-type": "^19.0.0"
}
```

## API Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/import/template` | GET | DonVi | Download Excel template |
| `/api/import/validate` | POST | DonVi | Validate uploaded file |
| `/api/import/execute` | POST | DonVi | Execute import |
| `/api/import/history` | GET | DonVi | Get import history |
| `/api/import/history/[id]` | GET | DonVi | Get import details |

## Implementation Phases

### Phase 1: Template & Validation ⏳
- [ ] Install exceljs dependency
- [ ] Create Excel template generator
- [ ] Implement file upload API
- [ ] Build validation engine
- [ ] Create validation UI

### Phase 2: Import Execution ⏳
- [ ] Implement import service
- [ ] Build transaction handling
- [ ] Add audit logging
- [ ] Create import UI

### Phase 3: History & Polish ⏳
- [ ] Build import history
- [ ] Add progress tracking
- [ ] Implement error recovery
- [ ] User testing and refinement

## Testing Checklist

- [ ] Template generation works
- [ ] File upload accepts .xlsx only
- [ ] Validation catches all error types
- [ ] UPSERT logic works correctly
- [ ] Transaction rollback on errors
- [ ] Audit logging captures all operations
- [ ] Progress tracking updates in real-time
- [ ] Import history displays correctly
- [ ] Mobile-responsive interface
- [ ] Performance with 1000+ records

## Documentation

**Planning Documents**:
- `.kiro/specs/compliance-management-platform/TASK_16_BULK_IMPORT_PLAN.md` ✅
- `.kiro/specs/compliance-management-platform/EXCEL_TEMPLATE_SCHEMA.md` ✅
- `.kiro/specs/compliance-management-platform/TASK_16_SCHEMA_MAPPING.md` ✅
- `.kiro/specs/compliance-management-platform/MIGRATION_002_SUMMARY.md` ✅

**Updated Documents**:
- `.kiro/specs/compliance-management-platform/design.md` ✅
- `.kiro/specs/compliance-management-platform/tasks.md` ✅

## Next Steps

1. ✅ Complete database migration (Migration 002)
2. ⏳ Install exceljs library: `npm install exceljs`
3. ⏳ Create Excel template generator
4. ⏳ Implement validation API
5. ⏳ Build import execution API
6. ⏳ Create import UI components
7. ⏳ Test with sample data
8. ⏳ Deploy to production
