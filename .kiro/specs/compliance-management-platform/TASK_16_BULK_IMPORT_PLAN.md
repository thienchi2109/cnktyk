# Task 16: Bulk Import System - Implementation Plan

## Overview
Implement Excel-based bulk import system for Unit Administrators (DonVi role) to import practitioners and historical activity records efficiently.

## Excel Template Design

### Sheet 1: Practitioners (Nhân viên)
Import practitioner records with their basic information.

| Column | Field Name | Data Type | Required | Validation | Example |
|--------|-----------|-----------|----------|------------|---------|
| A | Mã nhân viên | Text | ○ | Max 50 chars, alphanumeric | NV001 |
| B | Họ và tên | Text | ✓ | Max 255 chars | Nguyễn Văn An |
| C | Ngày sinh | Date | ○ | Format: DD/MM/YYYY | 15/05/1985 |
| D | Giới tính | Enum | ○ | Nam/Nữ/Khác | Nam |
| E | Khoa/Phòng | Text | ○ | Max 100 chars | Khoa Nội |
| F | Chức vụ | Text | ○ | Max 100 chars | Bác sĩ chuyên khoa II |
| G | Số CCHN | Text | ✓ | Unique, alphanumeric | CCHN-2023-001234 |
| H | Ngày cấp | Date | ✓ | Format: DD/MM/YYYY | 15/01/2023 |
| I | Nơi cấp | Text | ○ | Max 200 chars | Sở Y Tế Cần Thơ |
| J | Phạm vi chuyên môn | Text | ○ | Max 200 chars | Nội khoa |

**Business Rules:**
- Số CCHN must be unique across the system
- Mã nhân viên is optional (auto-generated if empty)
- Ngày sinh must be in the past (age >= 18)
- All practitioners imported to the Unit Admin's unit (MaDonVi from session)
- TrangThaiLamViec defaults to "DangLamViec"
- Compliance cycle will be created separately or via activities sheet

### Sheet 2: Activities (Hoạt động)
Import historical activity records for practitioners.

| Column | Field Name | Data Type | Required | Validation | Example |
|--------|-----------|-----------|----------|------------|---------|
| A | Số CCHN | Text | ✓ | Must exist in Sheet 1 or DB | CCHN-2023-001234 |
| B | Tên hoạt động | Text | ✓ | Max 500 chars | Hội thảo Y học lâm sàng 2024 |
| C | Vai trò | Text | ○ | Max 100 chars | Báo cáo viên |
| D | Ngày hoạt động | Date | ✓ | Format: DD/MM/YYYY | 15/03/2024 |
| E | Số tín chỉ | Number | ✓ | Min: 0, Max: 999.99 | 5.5 |
| F | Trạng thái duyệt | Enum | ✓ | ChoDuyet/DaDuyet/TuChoi | DaDuyet |
| G | Ngày duyệt | Date | ○ | Format: DD/MM/YYYY, if approved | 20/03/2024 |
| H | Ghi chú duyệt | Text | ○ | Max 1000 chars | Đã xác minh chứng chỉ |
| I | URL minh chứng | URL | ○ | Valid URL format | https://storage.example.com/cert.pdf |

**Business Rules:**
- Số CCHN must reference a practitioner in Sheet 1 or existing in database
- If Trạng thái duyệt is "DaDuyet" or "TuChoi", Ngày duyệt is required
- Ngày hoạt động must be within the practitioner's compliance cycle
- NguoiNhap will be set to the importing user's account ID
- NguoiDuyet will be set to the importing user if status is approved/rejected
- MaDanhMuc will be NULL (custom activities)

## Template File Structure

```
CNKTYKLT_Import_Template.xlsx
├── Sheet: "Nhân viên" (Practitioners)
│   ├── Row 1: Column headers (bold, blue background)
│   ├── Row 2: Data type hints (italic, gray text)
│   ├── Row 3: Example data
│   └── Rows 4+: User data entry
│
├── Sheet: "Hoạt động" (Activities)
│   ├── Row 1: Column headers (bold, green background)
│   ├── Row 2: Data type hints (italic, gray text)
│   ├── Row 3: Example data
│   └── Rows 4+: User data entry
│
└── Sheet: "Hướng dẫn" (Instructions)
    ├── Import process overview
    ├── Field descriptions
    ├── Validation rules
    ├── Common errors and solutions
    └── Contact information
```

## Implementation Components

### 1. Excel Template Generation
**File:** `src/app/api/import/template/route.ts`

```typescript
GET /api/import/template
- Generates Excel template with proper formatting
- Includes example data and validation hints
- Returns downloadable .xlsx file
- Role: DonVi only
```

**Dependencies:**
- `exceljs` library for Excel generation
- Pre-formatted template with data validation

### 2. File Upload & Validation
**File:** `src/app/api/import/validate/route.ts`

```typescript
POST /api/import/validate
- Accepts .xlsx file upload (max 10MB)
- Parses Excel file using exceljs
- Validates all fields and business rules
- Returns validation report with errors/warnings
- Does NOT save to database
- Role: DonVi only
```

**Validation Checks:**
- File format (must be .xlsx)
- Sheet structure (required sheets present)
- Column headers match template
- Data type validation per field
- Business rule validation
- Cross-reference validation (CCHN exists)
- Duplicate detection

### 3. Import Execution
**File:** `src/app/api/import/execute/route.ts`

```typescript
POST /api/import/execute
- Re-validates uploaded file
- Performs upsert operations in transaction
- Creates/updates practitioners
- Creates/updates compliance cycles (KyCNKT)
- Creates activity records
- Logs all operations to NhatKyHeThong
- Returns import summary with counts
- Role: DonVi only
```

**Database Operations:**
1. **Practitioners (NhanVien)**
   - UPSERT by SoCCHN (unique constraint)
   - Update if exists, insert if new
   - Always set MaDonVi to importing user's unit
   - Field mapping:
     * Mã nhân viên → (not stored, for reference only)
     * Họ và tên → HoVaTen
     * Ngày sinh → (not in current schema, skip or add to ChucDanh)
     * Giới tính → (not in current schema, skip)
     * Khoa/Phòng → (not in current schema, can add to ChucDanh)
     * Chức vụ → ChucDanh
     * Số CCHN → SoCCHN
     * Ngày cấp → NgayCapCCHN
     * Nơi cấp → (not in current schema, skip)
     * Phạm vi chuyên môn → (not in current schema, skip)
   - TrangThaiLamViec defaults to "DangLamViec"

2. **Compliance Cycles (KyCNKT)**
   - Created automatically or via activities sheet
   - Default 5-year cycle from current year
   - 120 credits required by default

3. **Activities (GhiNhanHoatDong)**
   - INSERT only (no updates)
   - Set NguoiNhap to importing user
   - Set NguoiDuyet to importing user if approved/rejected
   - Generate UUID for MaGhiNhan

### 4. UI Components

#### Import Page
**File:** `src/app/import/page.tsx`

**Features:**
- Download template button
- File upload dropzone (drag & drop)
- Validation progress indicator
- Validation results table
- Error/warning display with row numbers
- Import confirmation dialog
- Import progress tracking
- Success/failure summary

**Layout:**
```
┌─────────────────────────────────────────┐
│  Nhập dữ liệu hàng loạt                 │
├─────────────────────────────────────────┤
│  [📥 Tải mẫu Excel]                     │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Kéo thả file Excel vào đây        │ │
│  │  hoặc click để chọn file           │ │
│  │  (.xlsx, tối đa 10MB)              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Kết quả kiểm tra:                      │
│  ✓ 45 nhân viên hợp lệ                  │
│  ✓ 120 hoạt động hợp lệ                 │
│  ⚠ 3 cảnh báo                           │
│  ✗ 2 lỗi cần sửa                        │
│                                          │
│  [Xem chi tiết] [Nhập dữ liệu]         │
└─────────────────────────────────────────┘
```

#### Validation Results Component
**File:** `src/components/import/validation-results.tsx`

**Features:**
- Tabbed view (Errors / Warnings / Success)
- Row number references
- Field-specific error messages
- Suggested fixes
- Export validation report

#### Import History
**File:** `src/app/import/history/page.tsx`

**Features:**
- List of past imports
- Import date, user, file name
- Success/failure counts
- Download original file
- View import details
- Rollback capability (future enhancement)

### 5. Excel Processing Library

**File:** `src/lib/import/excel-processor.ts`

```typescript
class ExcelProcessor {
  parseFile(buffer: Buffer): Promise<ParsedData>
  validatePractitioners(data: any[]): ValidationResult
  validateActivities(data: any[]): ValidationResult
  generateTemplate(): Promise<Buffer>
}
```

**File:** `src/lib/import/validators.ts`

```typescript
// Field validators
validateCCHN(value: string): ValidationError | null
validateEmail(value: string): ValidationError | null
validateDate(value: any): Date | ValidationError
validateEnum(value: string, allowed: string[]): ValidationError | null

// Business rule validators
validateCycleOverlap(start: Date, end: Date, existing: Cycle[]): ValidationError | null
validateActivityInCycle(activityDate: Date, cycle: Cycle): ValidationError | null
```

### 6. Database Import Service

**File:** `src/lib/import/import-service.ts`

```typescript
class ImportService {
  async importPractitioners(data: PractitionerRow[], unitId: string, userId: string): Promise<ImportResult>
  async importActivities(data: ActivityRow[], userId: string): Promise<ImportResult>
  async executeFullImport(file: Buffer, unitId: string, userId: string): Promise<ImportSummary>
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
- Invalid email format
- Invalid phone format

### Warnings (Non-blocking)
- Missing optional fields
- Unusual credit amounts (> 50)
- Future activity dates
- Very old activity dates (> 10 years)
- Duplicate activities (same practitioner + date + name)

### Import Errors
- Database constraint violations
- Transaction rollback on any error
- Partial import not allowed
- Detailed error logging

## Security Considerations

1. **Authorization**
   - Only DonVi role can access import features
   - Users can only import to their own unit
   - Validate session and unit ownership

2. **File Security**
   - Validate file type (MIME type check)
   - Limit file size (10MB max)
   - Scan for malicious content
   - Temporary file cleanup

3. **Data Validation**
   - Sanitize all input data
   - Prevent SQL injection via parameterized queries
   - Validate all foreign key references
   - Check for data integrity

4. **Audit Logging**
   - Log all import attempts
   - Record validation failures
   - Track successful imports
   - Store import metadata

## Performance Optimization

1. **Batch Processing**
   - Process practitioners in batches of 100
   - Process activities in batches of 500
   - Use database transactions per batch

2. **Validation Optimization**
   - Cache unit data
   - Cache existing CCHN lookups
   - Parallel validation where possible

3. **Progress Tracking**
   - WebSocket or polling for progress updates
   - Estimated time remaining
   - Cancel capability

## Testing Strategy

### Unit Tests
- Excel parsing functions
- Field validators
- Business rule validators
- Date parsing and formatting

### Integration Tests
- Full import workflow
- Error handling scenarios
- Transaction rollback
- Audit logging

### E2E Tests
- Template download
- File upload
- Validation display
- Import execution
- Success confirmation

## Dependencies

```json
{
  "exceljs": "^4.4.0",
  "file-type": "^19.0.0",
  "zod": "^4.1.11"
}
```

## API Endpoints Summary

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/import/template` | GET | DonVi | Download Excel template |
| `/api/import/validate` | POST | DonVi | Validate uploaded file |
| `/api/import/execute` | POST | DonVi | Execute import |
| `/api/import/history` | GET | DonVi | Get import history |
| `/api/import/history/[id]` | GET | DonVi | Get import details |

## Database Schema Changes

**Current Schema Limitations:**
The existing `NhanVien` table does not have fields for:
- Ngày sinh (Date of birth)
- Giới tính (Gender)
- Khoa/Phòng (Department)
- Nơi cấp (Issuing authority)
- Phạm vi chuyên môn (Scope of practice)

**Options:**
1. **Option A (Recommended)**: Store additional info in ChucDanh field as JSON or concatenated string
2. **Option B**: Add new columns to NhanVien table (requires migration)
3. **Option C**: Skip these fields during import (data loss)

**For MVP, we'll use Option A:**
- Store "Chức vụ | Khoa/Phòng" in ChucDanh field
- Skip Ngày sinh, Giới tính, Nơi cấp, Phạm vi chuyên môn for now
- Can be enhanced in future versions

**Tables Used:**
- `NhanVien` (practitioners)
- `KyCNKT` (compliance cycles)
- `GhiNhanHoatDong` (activities)
- `NhatKyHeThong` (audit log)

## Implementation Phases

### Phase 1: Template & Validation (Week 1)
- [ ] Create Excel template generator
- [ ] Implement file upload API
- [ ] Build validation engine
- [ ] Create validation UI

### Phase 2: Import Execution (Week 2)
- [ ] Implement import service
- [ ] Build transaction handling
- [ ] Add audit logging
- [ ] Create import UI

### Phase 3: History & Polish (Week 3)
- [ ] Build import history
- [ ] Add progress tracking
- [ ] Implement error recovery
- [ ] User testing and refinement

## Success Criteria

- ✓ Unit admins can download formatted Excel template
- ✓ System validates Excel files with detailed error messages
- ✓ Successful import of 1000+ practitioners in < 30 seconds
- ✓ Successful import of 5000+ activities in < 60 seconds
- ✓ All validation errors clearly displayed with row numbers
- ✓ Transaction rollback on any error (no partial imports)
- ✓ Complete audit trail of all imports
- ✓ Mobile-responsive import interface
- ✓ Comprehensive error handling and user feedback
