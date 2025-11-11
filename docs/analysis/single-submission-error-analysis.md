# Analysis: Single Submission "Internal Server Error" for DonVi Users

**Date:** 2025-11-11
**Status:** Root Cause Identified
**Severity:** High (Blocks core functionality)

---

## Executive Summary

DonVi users encounter "Internal server error" when creating single submissions through `/submissions/new`. The error originates from a **database schema mismatch** where the API attempts to insert fields that don't exist in the `GhiNhanHoatDong` table.

**Root Cause:** Backend API schema validation issue (NOT a frontend problem)

---

## Recent Commits Review (Last 3)

### 1. Commit `67d230a` - Merge PR #23
- **Summary:** Merged bulk submission validation fix
- **Impact:** Fixed bulk submission workflow for DonVi users

### 2. Commit `1e08886` - Add Tests
- **Summary:** Added comprehensive tests for bulk submission schema fix
- **Impact:** Ensures bulk submissions remain functional

### 3. Commit `1ba26ec` - Fix Bulk Submission Schema
- **Summary:** Added missing `LoaiHoatDong` and `YeuCauMinhChung` fields to `/api/cohorts/apply` schema
- **Problem Fixed:** Zod was rejecting extra fields sent by bulk submission wizard
- **Solution:** Made these fields optional in the schema to accept them

**Key Insight:** This is the INVERSE problem - bulk submissions were sending fields the schema didn't accept. Now single submissions are trying to insert fields the DATABASE doesn't have.

---

## Error Flow Analysis

### User Journey
```
DonVi User → Fill Form → Click "Gửi hoạt động"
→ POST /api/submissions → "Internal server error"
```

### Technical Flow
```
Frontend (activity-submission-form.tsx:221)
  ↓ POST /api/submissions
API Route (route.ts:198-217)
  ↓ Creates submissionData with CreationMethod field
Repository (repositories.ts:111-113)
  ↓ db.insert('GhiNhanHoatDong', data)
PostgreSQL
  ↓ ERROR: column "CreationMethod" does not exist
API Error Handler (route.ts:244-258)
  ↓ Catches error, logs to console
  ↓ Returns generic "Internal server error"
Frontend
  ↓ Displays error to user
```

---

## Root Cause: Schema Mismatch

### Problem Location
**File:** `src/app/api/submissions/route.ts:198-217`

```typescript
const submissionData = {
  MaNhanVien: practitionerId,
  MaDanhMuc: validatedData.MaDanhMuc || null,
  TenHoatDong: validatedData.TenHoatDong,
  FileMinhChungUrl: validatedData.FileMinhChungUrl || null,
  NguoiNhap: user.id,
  CreationMethod: 'individual' as const,  // ❌ Column doesn't exist in DB
  TrangThaiDuyet: 'ChoDuyet' as const,
  GhiChuDuyet: validatedData.GhiChuDuyet || null,
  // ... other fields
} as any; // ⚠️ Type safety bypassed with 'as any'
```

### Evidence

#### 1. Zod Schema (src/lib/db/schemas.ts:185-221)
The application schema **includes** these fields:
```typescript
export const GhiNhanHoatDongSchema = z.object({
  // ... other fields
  CreationMethod: CreationMethodSchema.default('individual'),  // ✓ Defined
  FileMinhChungETag: z.string().nullable(),                    // ✓ Defined
  FileMinhChungSha256: z.string().nullable(),                  // ✓ Defined
  FileMinhChungSize: z.number().int().min(0).nullable(),       // ✓ Defined
  NguoiDuyet: UUIDSchema,                                       // ✓ Defined
  VaiTro: z.string().nullable(),                               // ✓ Defined
});
```

#### 2. Database Schema (docs/2025-10-03/v_1_init_schema.sql:134-162)
The actual database table **DOES NOT** include:
```sql
CREATE TABLE IF NOT EXISTS "GhiNhanHoatDong" (
  "MaGhiNhan"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaNhanVien"       UUID NOT NULL,
  "MaDanhMuc"        UUID NULL,
  "TenHoatDong"      TEXT NOT NULL,
  "NgayGhiNhan"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "FileMinhChungUrl" TEXT,
  "NguoiNhap"        UUID NOT NULL,
  "TrangThaiDuyet"   trang_thai_duyet NOT NULL DEFAULT 'ChoDuyet',
  "NgayDuyet"        TIMESTAMPTZ,
  "NguoiDuyet"       UUID,                                    -- ✓ Exists
  "GhiChuDuyet"      TEXT,

  -- Migration 003: Extended fields
  "HinhThucCapNhatKienThucYKhoa" TEXT,
  "ChiTietVaiTro"    TEXT,
  "DonViToChuc"      TEXT,
  "NgayBatDau"       DATE,
  "NgayKetThuc"      DATE,
  "SoTiet"           NUMERIC(6,2),
  "SoGioTinChiQuyDoi" NUMERIC(6,2),
  "BangChungSoGiayChungNhan" TEXT

  -- ❌ MISSING: CreationMethod
  -- ❌ MISSING: VaiTro
  -- ❌ MISSING: FileMinhChungETag
  -- ❌ MISSING: FileMinhChungSha256
  -- ❌ MISSING: FileMinhChungSize
);
```

#### 3. Schema Comments (v_1_init_schema.sql:17)
The schema documentation explicitly states:
> Removed VaiTro, SoGio, FileMinhChungETag, FileMinhChungSha256, FileMinhChungSize

But these fields are still in the Zod schema!

### Migration Gap

No migration exists to add `CreationMethod` column:
```bash
$ grep -rn "CreationMethod" /home/user/cnktyk/migrations/
# No results
```

---

## Why Error Shows as "Internal Server Error"

### Error Handling Code (route.ts:244-258)
```typescript
} catch (error) {
  console.error('Activity submission error:', error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation error', details: error.issues },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },  // ← Generic error message
    { status: 500 }
  );
}
```

**Why this is problematic:**
1. PostgreSQL error is caught but details are only logged to console (not visible to user)
2. Returns generic "Internal server error" instead of specific database error
3. Makes debugging difficult for end users
4. DonVi users see no actionable information

**Example Console Output (server-side):**
```
Activity submission error: error: column "CreationMethod" does not exist
```

---

## Comparison: Bulk Submission vs Single Submission Issue

| Aspect | Bulk Submission (Fixed) | Single Submission (Current) |
|--------|------------------------|----------------------------|
| **Error Location** | API validation layer | Database insert layer |
| **Problem** | Schema rejected extra fields | Database missing required fields |
| **Fields** | `LoaiHoatDong`, `YeuCauMinhChung` | `CreationMethod`, `VaiTro`, File metadata |
| **Root Cause** | Zod schema too strict | Database schema outdated |
| **Solution** | Add fields to Zod schema | Remove fields from code OR add to DB |
| **Impact** | Blocked step 3 of wizard | Blocks all single submissions |

Both issues stem from **schema synchronization problems** between:
- Frontend expectations
- Zod validation schemas (src/lib/db/schemas.ts)
- API route implementations
- Actual database schema

---

## Proposed Solutions

### Option 1: Remove Fields from Code (Quick Fix) ⭐ RECOMMENDED
**Approach:** Remove `CreationMethod` and other non-existent fields from the API route

**Implementation:**
```typescript
// src/app/api/submissions/route.ts:198-217
const submissionData = {
  MaNhanVien: practitionerId,
  MaDanhMuc: validatedData.MaDanhMuc || null,
  TenHoatDong: validatedData.TenHoatDong,
  FileMinhChungUrl: validatedData.FileMinhChungUrl || null,
  NguoiNhap: user.id,
  // Remove: CreationMethod: 'individual' as const,
  TrangThaiDuyet: 'ChoDuyet' as const,
  GhiChuDuyet: validatedData.GhiChuDuyet || null,
  // ... other valid fields
};
```

**Also remove from Zod schema:**
```typescript
// src/lib/db/schemas.ts:185-221
export const GhiNhanHoatDongSchema = z.object({
  // ... keep existing fields
  // Remove: CreationMethod: CreationMethodSchema.default('individual'),
  // Remove: VaiTro: z.string().nullable(),
  // Remove: FileMinhChungETag: z.string().nullable(),
  // Remove: FileMinhChungSha256: z.string().nullable(),
  // Remove: FileMinhChungSize: z.number().int().min(0).nullable(),
  // Keep: NguoiDuyet: UUIDSchema, (this exists in DB)
});
```

**Pros:**
- ✅ Quick fix - no database migration needed
- ✅ Aligns code with actual database schema
- ✅ No downtime
- ✅ Follows documentation in v_1_init_schema.sql

**Cons:**
- ❌ Loses ability to track submission creation method
- ❌ Loses file integrity tracking (ETag, SHA256, Size)
- ❌ Loses VaiTro field

**Impact:** Low - these fields aren't currently used by any queries or UI

---

### Option 2: Add Missing Columns to Database (Complete Fix)
**Approach:** Create migration to add all missing columns

**Implementation:**
```sql
-- migrations/2025-11-11_add_submission_metadata_fields.sql
BEGIN;

-- Add creation tracking
ALTER TABLE "GhiNhanHoatDong"
  ADD COLUMN "CreationMethod" VARCHAR(20) DEFAULT 'individual' CHECK ("CreationMethod" IN ('individual', 'bulk', 'api_import', 'migration', 'system'));

-- Add role field
ALTER TABLE "GhiNhanHoatDong"
  ADD COLUMN "VaiTro" TEXT NULL;

-- Add file integrity tracking
ALTER TABLE "GhiNhanHoatDong"
  ADD COLUMN "FileMinhChungETag" TEXT NULL,
  ADD COLUMN "FileMinhChungSha256" TEXT NULL,
  ADD COLUMN "FileMinhChungSize" BIGINT NULL CHECK ("FileMinhChungSize" IS NULL OR "FileMinhChungSize" >= 0);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_gnhd_creation_method ON "GhiNhanHoatDong" ("CreationMethod");

COMMIT;
```

**Pros:**
- ✅ Complete solution - enables all intended features
- ✅ Maintains data integrity tracking
- ✅ Supports future bulk vs individual submission analytics
- ✅ File checksums improve security

**Cons:**
- ❌ Requires database migration
- ❌ More complex deployment
- ❌ Need to backfill existing records (nullable or default values)
- ❌ Adds unused columns if features aren't actually needed

**Impact:** Medium - adds technical debt if features won't be used

---

### Option 3: Hybrid Approach
**Approach:** Keep only useful fields, remove unused ones

**Keep:**
- `CreationMethod` - Useful for analytics and debugging
- `FileMinhChungSize` - Useful for storage tracking

**Remove:**
- `VaiTro` - Already have `ChiTietVaiTro` field
- `FileMinhChungETag` - Overkill for this use case
- `FileMinhChungSha256` - Overkill for this use case

---

## Recommended Approach

### Phase 1: Immediate Fix (Today) ⚡
**Goal:** Unblock DonVi users immediately

1. **Remove problematic fields from API route** (route.ts:204)
   - Remove `CreationMethod: 'individual'`
   - Keep all fields that exist in DB

2. **Update Zod schema to match database** (schemas.ts:185-221)
   - Remove `CreationMethod`
   - Remove `VaiTro`
   - Remove `FileMinhChungETag`, `FileMinhChungSha256`, `FileMinhChungSize`
   - Keep `NguoiDuyet` (exists in DB)

3. **Improve error handling** (route.ts:244-258)
   - Log detailed error for debugging
   - Consider exposing field-level errors in development mode

4. **Add test case** to prevent regression

**Files to modify:**
- `src/app/api/submissions/route.ts`
- `src/lib/db/schemas.ts`
- `src/lib/db/repositories.ts` (verify types)

### Phase 2: Future Enhancement (Optional)
If creation method tracking is needed:
1. Create migration to add `CreationMethod` column
2. Update schema to include it
3. Add analytics dashboard to show bulk vs individual submissions

---

## Testing Strategy

### 1. Manual Testing
```bash
# Test as DonVi user
1. Login as DonVi user
2. Navigate to /submissions/new
3. Select practitioner
4. Fill activity form
5. Upload evidence file
6. Click "Gửi hoạt động"
7. Verify: Success message appears
8. Verify: Redirect to /submissions
9. Verify: New submission appears in list
```

### 2. Automated Test
```typescript
// tests/api/submissions/create.test.ts
describe('POST /api/submissions', () => {
  it('should create submission for DonVi user', async () => {
    const response = await fetch('/api/submissions', {
      method: 'POST',
      body: JSON.stringify({
        MaNhanVien: practitionerId,
        TenHoatDong: 'Test Activity',
        SoGioTinChiQuyDoi: 5,
        // No CreationMethod field
      }),
    });

    expect(response.status).toBe(201);
    expect(response.body.submission).toBeDefined();
  });
});
```

### 3. Database Verification
```sql
-- Verify submission was created
SELECT * FROM "GhiNhanHoatDong"
WHERE "MaNhanVien" = '[practitioner-id]'
ORDER BY "NgayGhiNhan" DESC
LIMIT 1;

-- Should return 1 row with all expected fields
```

---

## Risk Assessment

### High Priority Risks
1. **Other routes may have same issue** - Need to audit:
   - `/api/submissions/[id]/route.ts` (update)
   - `/api/submissions/bulk-create/route.ts` (bulk)
   - Any other endpoints inserting into GhiNhanHoatDong

2. **Type safety compromised** - The `as any` cast bypasses TypeScript checking
   - Need to remove `as any` and fix types properly

### Medium Priority Risks
1. **Schema drift** - Application schema diverging from database schema
   - Consider schema validation on app startup
   - Add database schema tests

2. **Error visibility** - Users see generic errors instead of helpful messages
   - Need better error handling strategy

### Low Priority Risks
1. **Existing tests may break** - If they expect CreationMethod field
2. **Analytics queries** - If any reports assume CreationMethod exists

---

## Related Issues

### Similar Pattern in Codebase
The `as any` type cast appears in multiple places:
```typescript
// src/app/api/submissions/route.ts:216
} as any; // Temporary workaround for type mismatch
```

This indicates systematic type/schema misalignment.

### Root Cause of Schema Drift
1. **Migration 003** (docs/migrations/003_add_activity_extended_fields.sql) removed columns
2. Zod schemas were not updated to match
3. No validation ensures schema/DB alignment
4. Type safety was bypassed with `as any`

---

## Next Steps

1. ✅ Document findings (this file)
2. ⏭️ Implement Phase 1 fix
3. ⏭️ Test thoroughly
4. ⏭️ Commit and push
5. ⏭️ Verify in production
6. ⏭️ Audit other API routes for similar issues

---

## Appendix: Debugging Commands

### Check Database Schema
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'GhiNhanHoatDong'
ORDER BY ordinal_position;
```

### Check Server Logs
```bash
# Look for detailed error messages
docker logs [container-name] 2>&1 | grep "Activity submission error"
```

### Verify Fix
```bash
# After fix, test POST request
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"MaNhanVien":"uuid","TenHoatDong":"Test","SoGioTinChiQuyDoi":5}'
```

---

**Analysis by:** Claude (Sonnet 4.5)
**Document Version:** 1.0
**Last Updated:** 2025-11-11
