# Bulk Import Function - Audit & Documentation

## Overview
The bulk import functionality allows **DonVi (Unit Admin)** users to import practitioners and their activities via Excel files.

## Architecture

### Key Files
1. **API Route**: `/src/app/api/import/execute/route.ts`
2. **Service Layer**: `/src/lib/import/import-service.ts`
3. **Validators**: `/src/lib/import/validators.ts`
4. **Excel Processor**: `/src/lib/import/excel-processor.ts`
5. **UI Component**: `/src/components/practitioners/bulk-import-sheet.tsx`

---

## UUID Validation Issue - Status: ✅ RESOLVED

### Problem Description
The application uses **legacy UUID format** (e.g., `00000000-0000-0000-0000-000000000002`) which doesn't conform to strict RFC 4122 UUID v4 specification. The third section requires the first digit to be 1-8, not 0.

### Impact on Import Function
**GOOD NEWS**: The import function **does NOT use Zod validation schemas** for UUID checking.

#### Evidence:
1. **No Zod imports in import files**:
   - `import-service.ts`: Uses raw SQL queries with parameterized values
   - `validators.ts`: Only validates business logic (names, dates, lengths, duplicates)
   - `execute/route.ts`: Passes `session.user.unitId` directly to SQL

2. **Direct SQL parameterization**:
   ```typescript
   // Line 90 in import-service.ts
   INSERT INTO "NhanVien" (
     "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi", ...
   ) VALUES ($1, $2, $3, $4, ...)
   ```
   
   The `unitId` parameter is passed as-is to PostgreSQL, which accepts any valid UUID format string.

3. **PostgreSQL UUID type is permissive**:
   - PostgreSQL's `uuid` column type accepts any properly formatted hyphenated hex string
   - No RFC 4122 version validation at database level

### Comparison with Single-Add Function

| Aspect | Single-Add (Form) | Bulk Import |
|--------|-------------------|-------------|
| **Validation Layer** | Zod Schema (`CreateNhanVienSchema`) | Custom validators (no Zod) |
| **UUID Checking** | Strict RFC 4122 (now relaxed) | None (direct SQL) |
| **MaDonVi Source** | `session.user.unitId` (enforced) | `session.user.unitId` (enforced) |
| **Affected by Issue** | ✅ Yes (now fixed) | ❌ No |

### Fix Applied
Modified `/src/lib/db/schemas.ts` line 12-18:
```typescript
// Before: Strict RFC 4122 validation
export const UUIDSchema = z.string().uuid();

// After: Relaxed validation for legacy UUIDs
export const UUIDSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID format'
);
```

This fix ensures:
- Single-add form now accepts legacy UUIDs
- Import function continues to work (was never affected)
- All UUID fields across the application use consistent validation

---

## Security Audit

### ✅ Unit Scope Enforcement

#### Import Execute Route (Line 36-41)
```typescript
if (!session.user.unitId) {
  return NextResponse.json(
    { success: false, error: 'Không xác định được đơn vị của người dùng' },
    { status: 400 }
  );
}
```

#### Import Service (Line 107, 148)
```typescript
// Always uses session.user.unitId from the authenticated user
[
  p.hoVaTen,
  p.soCCHN,
  p.ngayCapCCHN,
  unitId,  // ← Server-enforced from session
  ...
]
```

**Result**: ✅ **SECURE** - DonVi users cannot import data into other units.

---

### ✅ Cross-Unit CCHN Protection

#### Execute Route (Line 95-114)
```typescript
// Check cross-unit conflicts
const otherUnitResult = await db.query<{ SoCCHN: string }>(
  `SELECT "SoCCHN" FROM "NhanVien" WHERE "SoCCHN" = ANY($1) AND "MaDonVi" != $2`,
  [cchnList, session.user.unitId]
);

// Add blocking errors for cross-unit conflicts
parsedData.practitioners.forEach(p => {
  if (p.soCCHN && crossUnitCCHNs.has(p.soCCHN)) {
    practitionerErrors.push({
      sheet: 'Nhân viên',
      row: p.rowNumber,
      column: 'G',
      field: 'Số CCHN',
      message: `Số CCHN đã thuộc đơn vị khác, không thể nhập`,
      severity: 'error'
    });
  }
});
```

#### Import Service (Line 53-84)
```typescript
// Double-check during execution with audit logging
const existingCheck = await db.query<{ MaNhanVien: string; MaDonVi: string }>(
  `SELECT "MaNhanVien", "MaDonVi" FROM "NhanVien" WHERE "SoCCHN" = $1`,
  [p.soCCHN]
);

if (existingCheck.length > 0 && existingCheck[0].MaDonVi !== unitId) {
  const maskedCCHN = p.soCCHN.slice(-4).padStart(p.soCCHN.length, '*');
  result.errors.push(`Bỏ qua dòng ${p.rowNumber}: Số CCHN thuộc đơn vị khác`);
  
  // Log security audit trail
  await db.query(
    `INSERT INTO "NhatKyHeThong" (
      "MaTaiKhoan", "HanhDong", "Bang", "NoiDung"
    ) VALUES ($1, $2, $3, $4)`,
    [userId, 'IMPORT_SKIPPED_CROSS_UNIT', 'NhanVien', ...]
  );
  continue; // Skip this record
}
```

**Result**: ✅ **SECURE** - Two-layer protection prevents cross-unit CCHN hijacking:
1. **Pre-validation**: Blocks import if any CCHN belongs to another unit
2. **Runtime check**: Skips conflicting records with audit logging

---

### ✅ Role-Based Access Control

#### Execute Route (Line 27-33)
```typescript
if (session.user.role !== 'DonVi') {
  return NextResponse.json(
    { success: false, error: 'Chỉ quản trị viên đơn vị mới có quyền nhập liệu' },
    { status: 403 }
  );
}
```

**Result**: ✅ **SECURE** - Only DonVi role can access import functionality.

---

### ✅ Transaction Safety

#### Import Service (Line 35-242)
```typescript
try {
  await db.query('BEGIN');
  
  // Import practitioners
  for (const p of practitioners) { ... }
  
  // Import activities
  for (const a of activities) { ... }
  
  // Audit trail
  await db.query(INSERT INTO "NhatKyHeThong" ...);
  
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

**Result**: ✅ **SECURE** - All-or-nothing transaction ensures data integrity.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User uploads Excel file via UI                               │
│    ↓                                                             │
│ 2. POST /api/import/execute                                      │
│    • Verify role === 'DonVi'                                     │
│    • Extract session.user.unitId                                 │
│    • Validate file size/type                                     │
│    ↓                                                             │
│ 3. ExcelProcessor.parseFile()                                    │
│    • Extract practitioners & activities from sheets              │
│    ↓                                                             │
│ 4. ImportValidator.validate()                                    │
│    • Check required fields, data types, lengths                  │
│    • Validate business rules (age, dates, etc.)                  │
│    • Check for duplicate CCHNs within file                       │
│    ↓                                                             │
│ 5. Cross-Unit CCHN Check (Pre-validation)                        │
│    • Query: SELECT "SoCCHN" WHERE "MaDonVi" != $unitId          │
│    • Block import if conflicts found                             │
│    ↓                                                             │
│ 6. ImportService.executeImport()                                 │
│    • BEGIN TRANSACTION                                           │
│    •   For each practitioner:                                    │
│    •     - Cross-unit check (runtime)                            │
│    •     - UPSERT with MaDonVi = session.user.unitId            │
│    •     - Create default compliance cycle if new                │
│    •   For each activity:                                        │
│    •     - Link to practitioner in same unit                     │
│    •     - INSERT activity record                                │
│    •   INSERT audit log                                          │
│    • COMMIT (or ROLLBACK on error)                               │
│    ↓                                                             │
│ 7. Return result to client                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Practitioner Validation
| Field | Rule | Severity |
|-------|------|----------|
| Họ và tên | Required, max 255 chars | Error |
| Số CCHN | Required, max 50 chars, unique in file | Error |
| Ngày cấp | Required, not future date | Error |
| Ngày sinh | Age 18-100 | Error/Warning |
| Giới tính | Must be "Nam", "Nữ", or "Khác" | Error |
| Tình trạng công tác | Must be valid enum value | Error |
| Khoa/Phòng | Max 100 chars | Error |
| Chức vụ | Max 100 chars | Error |
| Nơi cấp | Max 200 chars | Error |
| Phạm vi chuyên môn | Max 200 chars | Error |

### Activity Validation
| Field | Rule | Severity |
|-------|------|----------|
| Số CCHN | Required, must exist in DB or file | Error |
| Tên hoạt động | Required, max 500 chars | Error |
| Ngày hoạt động | Required, not future (warning), not >10 years past | Error/Warning |
| Số tín chỉ | Required, 0-999.99, warning if >50 | Error/Warning |
| Trạng thái | Required, must be valid enum | Error |
| Ngày duyệt | Required if approved/rejected | Error |
| Vai trò | Max 100 chars | Error |
| Ghi chú duyệt | Max 1000 chars | Error |
| URL minh chứng | Must be valid URL if provided | Error |

---

## Audit Trail

### Logged Events
1. **Successful Import**: Records counts of created/updated records
2. **Cross-Unit Conflict**: Logs masked CCHN, attempted unit, timestamp
3. **Transaction Failure**: Automatic rollback with error message

### Log Structure
```typescript
{
  MaTaiKhoan: userId,
  HanhDong: 'BULK_IMPORT' | 'IMPORT_SKIPPED_CROSS_UNIT',
  Bang: 'NhanVien,GhiNhanHoatDong',
  NoiDung: {
    practitionersCreated: number,
    practitionersUpdated: number,
    activitiesCreated: number,
    cyclesCreated: number,
    maskedSoCCHN?: string, // For security events
    timestamp: ISO8601
  }
}
```

---

## Known Limitations

### 1. File Size
- **Max**: 10MB
- **Reason**: Server memory constraints
- **Mitigation**: Client-side validation with clear error message

### 2. Performance
- **Sequential Processing**: Practitioners and activities imported one-by-one
- **Impact**: Large imports (>1000 rows) may take 30+ seconds
- **Future**: Consider batch INSERT statements

### 3. Duplicate Handling
- **Same Unit**: Updates existing practitioner with new data
- **Cross Unit**: Blocks entire import if any conflict exists
- **Limitation**: No partial import - all-or-nothing approach

---

## Testing Recommendations

### Security Tests
- [ ] Attempt import from SoYTe role (should fail)
- [ ] Attempt import from NguoiHanhNghe role (should fail)
- [ ] Import with CCHN from another unit (should block)
- [ ] Verify audit logs created for cross-unit attempts

### Validation Tests
- [ ] Import with missing required fields
- [ ] Import with future dates
- [ ] Import with duplicate CCHNs in file
- [ ] Import with invalid URLs

### UUID Tests
- [ ] Import practitioners with legacy UUID format unit
- [ ] Verify import succeeds with `00000000-0000-0000-0000-000000000002`
- [ ] Compare with single-add form (should both work now)

---

## Conclusion

### UUID Issue Impact
✅ **Import function was NEVER affected** by the UUID validation issue because:
1. It bypasses Zod schemas entirely
2. Uses direct SQL parameterization
3. PostgreSQL accepts legacy UUID format

### Security Posture
✅ **STRONG** - Multi-layer protection:
- Role-based access control
- Server-enforced unit scoping
- Cross-unit CCHN protection (2 layers)
- Transaction safety with rollback
- Comprehensive audit logging

### Recommendations
1. **Performance**: Consider batch INSERT for large imports
2. **UX**: Add progress indicator for long-running imports
3. **Monitoring**: Dashboard for failed import attempts
4. **Documentation**: User guide for Excel template format
