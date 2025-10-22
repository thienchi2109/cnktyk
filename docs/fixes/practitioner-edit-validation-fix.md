# Practitioner Edit Validation Fix

**Date:** 2025-10-22  
**Commit:** a21ed85  
**Issue:** Users could not edit practitioners due to multiple validation errors

## Problems Identified

### 1. "Invalid UUID" Error on Form Load
**Symptom:** Red error message "Invalid UUID" appeared immediately when opening edit form  
**Root Cause:** 
- `CreateNhanVienSchema` defined `MaDonVi: UUIDSchema` (strict UUID validation)
- Form initialized with `MaDonVi: ''` or undefined before units loaded
- Zod's UUID validator rejected empty strings immediately

**Solution:**
```typescript
// Before (failed on empty string):
const PractitionerFormSchema = CreateNhanVienSchema.extend({ ... })

// After (omit and re-add with lenient validation):
const PractitionerFormSchema = CreateNhanVienSchema
  .omit({ MaDonVi: true })
  .extend({
    MaDonVi: z.string().min(1, 'Vui lòng chọn đơn vị y tế'),
    // ... other fields
  })
  .refine((data) => {
    // Only validate UUID format if value exists
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return data.MaDonVi && uuidRegex.test(data.MaDonVi);
  }, { message: 'Vui lòng chọn đơn vị y tế', path: ['MaDonVi'] })
```

### 2. Validation Error When DonVi Role Edits
**Symptom:** API returned 400 "Validation error" when unit admin (DonVi) tried to update practitioner  
**Root Cause:**
- Frontend sent `MaDonVi` in payload even though it was disabled
- Backend `UpdateNhanVienSchema` has `MaDonVi: UUIDSchema.optional()` 
- If `MaDonVi` is present, it MUST be valid UUID, but form sent the value anyway
- Backend also blocks unit changes for DonVi role (lines 114-119 in route.ts)

**Solution:**
```typescript
// Exclude MaDonVi from submission when user cannot change it
if (mode === 'edit' && (userRole === 'DonVi' || userRole === 'NguoiHanhNghe')) {
  delete submitData.MaDonVi;
}
```

### 3. Date Type Mismatch Error
**Symptom:** API returned "Invalid input: expected date, received string" for NgayCapCCHN  
**Root Cause:**
- Frontend date input returns string (YYYY-MM-DD format)
- `JSON.stringify()` converts Date objects to ISO strings
- Backend `UpdateNhanVienSchema` expected strict Date type

**Solution:**
```typescript
// Backend schema (src/lib/db/schemas.ts & lib/db/schemas.ts):
export const UpdateNhanVienSchema = CreateNhanVienSchema.partial().extend({
  MaDonVi: UUIDSchema.optional(),
  NgayCapCCHN: z.coerce.date().nullable().optional(), // Accept strings and coerce to Date
});
```

## Additional Improvements

### Form Sync for Async Data
Added `useEffect` to reset form when `initialData` or `units` load asynchronously:
```typescript
useEffect(() => {
  if (mode === 'edit' && initialData) {
    const nextUnitId = initialData.MaDonVi || unitId || (units[0]?.MaDonVi ?? '');
    form.reset({
      HoVaTen: initialData.HoVaTen || '',
      // ... convert date to YYYY-MM-DD string for input
      NgayCapCCHN: initialData.NgayCapCCHN
        ? new Date(initialData.NgayCapCCHN as any).toISOString().slice(0, 10)
        : undefined,
      MaDonVi: nextUnitId,
      // ... other fields
    });
    form.clearErrors('MaDonVi');
  }
}, [mode, initialData, unitId, units]);
```

### Enhanced Error Logging
```typescript
if (!response.ok) {
  const errorData = await response.json();
  console.error('API Error:', errorData);
  const errorMsg = errorData.error || 'Failed to save practitioner';
  const errorDetails = errorData.details 
    ? `\n${JSON.stringify(errorData.details, null, 2)}` 
    : '';
  throw new Error(errorMsg + errorDetails);
}
```

### UI Consistency
- Cancel button: `variant="outline"` → `variant="secondary"` (matches Update button style)
- Edit trigger: `variant="outline"` → `variant="secondary"` (consistent with action buttons)

## Files Modified

```
src/components/practitioners/practitioner-form.tsx
  - Form schema: omit + extend pattern for MaDonVi
  - useEffect sync for async initial data
  - Exclude MaDonVi for restricted roles
  - Enhanced error logging
  - Secondary variant for Cancel button

src/components/practitioners/practitioner-detail-sheet.tsx
  - Secondary variant for Edit trigger button

src/lib/db/schemas.ts
lib/db/schemas.ts
  - UpdateNhanVienSchema: Add z.coerce.date() for NgayCapCCHN
```

## Testing Checklist

- [x] Edit practitioner as SoYTe (can change unit)
- [x] Edit practitioner as DonVi (cannot change unit, field disabled)
- [x] Edit practitioner as NguoiHanhNghe (only Email/DienThoai)
- [x] Form loads without "Invalid UUID" error
- [x] Date field accepts and persists changes
- [x] Validation errors show friendly Vietnamese messages
- [x] Cancel button style matches Update button

## Related Issues

- Previous test suite: a33a743 (Vitest for file upload)
- Evidence upload tests: All 7 tests passing
- No regression in upload functionality

## Lessons Learned

1. **Zod schema composition**: Use `.omit()` + `.extend()` to override strict validators
2. **JSON serialization**: Always use `z.coerce.date()` for date fields in API schemas
3. **Role-based forms**: Exclude restricted fields from payload, not just UI disable
4. **Async form data**: Use `useEffect` + `form.reset()` to sync when data loads late
5. **Error DX**: Log full error objects (especially `details`) for faster debugging
