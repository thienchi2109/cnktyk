# P1 REGRESSION FIX: JPEG Wildcard Bypass

**Date:** 2025-12-05  
**Priority:** P1 (Critical - Regression)  
**Status:** ✅ FIXED & TESTED  
**Introduced In:** Commit 428fe62 (WebP RIFF bypass fix)  
**Fixed In:** This commit

---

## Executive Summary

Fixed a **critical P1 regression** introduced while fixing the WebP RIFF bypass. The wildcard logic used `0xFF` as a sentinel value, but JPEG signatures contain `0xFF` as **required bytes**, causing the validator to only check byte 1 (`0xD8`) and skip bytes 0 and 2.

### Impact
- **Regression Window:** ~10 minutes (between commits 428fe62 and this fix)
- **Attack:** Any file with `0x??` `0xD8` `0x??` would pass as JPEG
- **Fix:** Changed wildcard sentinel from `0xFF` to `null`

---

## The Regression

### Root Cause

In commit 428fe62, I added wildcard support for WebP's variable-length size field:

```typescript
// BUGGY CODE (Commit 428fe62)
export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],  // ❌ Contains 0xFF!
  'image/webp': [
    0x52, 0x49, 0x46, 0x46,
    0xFF, 0xFF, 0xFF, 0xFF,  // Using 0xFF as wildcard
    0x57, 0x45, 0x42, 0x50
  ],
};

// Validation logic
const matchesSignature = expectedSignature.every(
    (byte, index) => byte === 0xFF || signature[index] === byte  // ❌ Treats JPEG's 0xFF as wildcard!
);
```

**Problem:** JPEG signatures contain `0xFF` at positions 0 and 2, so the validator would:
- Byte 0: `0xFF` → **SKIPPED** (should be required!)
- Byte 1: `0xD8` → **CHECKED** ✅
- Byte 2: `0xFF` → **SKIPPED** (should be required!)

### Attack Vector

```typescript
// Malicious file with only middle byte matching
const fakeJpeg = new File([
  new Uint8Array([
    0x00, 0xD8, 0x00,  // Only byte 1 matches!
    ...arbitraryPayload
  ])
], 'malicious.jpg', { type: 'image/jpeg' });

// BEFORE FIX: This would PASS ❌
// AFTER FIX: This is REJECTED ✅
```

### Proof of Concept

Created comprehensive regression test showing:
- `[0x00, 0xD8, 0x00]` passes as JPEG ❌
- `[0xAA, 0xD8, 0xBB]` passes as image/jpg ❌
- Executable with `0xD8` as second byte passes ❌

---

## The Fix

### 1. Changed Wildcard Sentinel to `null`

```typescript
// FIXED CODE
export const FILE_SIGNATURES: Record<string, (number | null)[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],  // ✅ All bytes required
  'image/jpg': [0xFF, 0xD8, 0xFF],   // ✅ All bytes required
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [
    0x52, 0x49, 0x46, 0x46,  // RIFF
    null, null, null, null,  // ✅ Size field (wildcard)
    0x57, 0x45, 0x42, 0x50   // WEBP marker
  ],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};
```

### 2. Updated Validation Logic

```typescript
// Compare signatures (null = wildcard/skip byte)
const matchesSignature = expectedSignature.every(
    (byte, index) => byte === null || signature[index] === byte  // ✅ Check for null, not 0xFF
);
```

### 3. Fixed Type Errors in Tests

Tests that spread signatures needed to filter out `null` values:

```typescript
// Before (type error)
const jpegSignature = FILE_SIGNATURES['image/jpeg'];
const bytes = new Uint8Array([...jpegSignature, 0x00]);  // ❌ Type error if signature contains null

// After (fixed)
const jpegSignature = FILE_SIGNATURES['image/jpeg'].filter((b): b is number => b !== null);
const bytes = new Uint8Array([...jpegSignature, 0x00]);  // ✅ Works
```

---

## Test Coverage

Created comprehensive regression test: `tests/lib/utils/fileValidation.jpeg-wildcard-regression.test.ts`

### Regression Scenarios (All REJECTED ✅)

```typescript
✓ should REJECT file with [0x00, 0xD8, 0x00] as JPEG
✓ should REJECT file with [0xAA, 0xD8, 0xBB] as image/jpg
✓ should REJECT executable with 0xD8 as second byte
✓ should REJECT file with only first two bytes correct
✓ should REJECT file with only last two bytes correct
```

### Valid JPEG Files (All ACCEPTED ✅)

```typescript
✓ should ACCEPT valid JPEG with proper [0xFF, 0xD8, 0xFF] signature
✓ should ACCEPT valid JPEG with image/jpg MIME
```

### Test Results

```
✅ 7/7 regression tests pass
✅ 8/8 WebP bypass tests pass
✅ 15/15 security tests pass
✅ 30/30 total validation tests pass
✅ Type checking passes
```

---

## Why This Happened

### Timeline

1. **Original Issue:** WebP validation only checked RIFF (4 bytes)
2. **Fix Attempt:** Added wildcard support using `0xFF` as sentinel
3. **Oversight:** Didn't realize JPEG signatures contain `0xFF` as required bytes
4. **Detection:** Security review caught the regression immediately
5. **Fix:** Changed sentinel to `null` (proper type-safe approach)

### Lessons Learned

1. **Don't use magic values from the domain as sentinels**
   - `0xFF` is a valid byte value in signatures
   - Using it as a wildcard creates conflicts

2. **Use type-safe sentinels**
   - `null` is perfect for "skip this position"
   - TypeScript enforces proper handling

3. **Test edge cases**
   - Should have tested JPEG validation after adding wildcard logic
   - Regression tests now prevent this

---

## Security Impact Assessment

### Regression Window

| Metric | Value |
|--------|-------|
| **Duration** | ~10 minutes (428fe62 → this fix) |
| **Severity** | P1 - Critical |
| **Exploitability** | High (just set byte 1 to 0xD8) |
| **Impact** | Arbitrary file upload as JPEG |
| **Actual Exploitation** | None (caught before deployment) |

### Mitigation

- ✅ Fixed immediately upon detection
- ✅ Never deployed to production
- ✅ Comprehensive regression tests added
- ✅ Type system now prevents similar issues

---

## Files Changed

### Core Changes
1. `src/types/file-processing.ts` - Changed `number[]` to `(number | null)[]`, use `null` for wildcards
2. `src/lib/utils/fileValidation.ts` - Check for `null` instead of `0xFF`

### Tests
3. `tests/lib/utils/fileValidation.jpeg-wildcard-regression.test.ts` - NEW (7 regression tests)
4. `tests/lib/utils/fileProcessor.test.ts` - Filter null from signatures before spreading

### Documentation
5. `docs/security/P1-jpeg-wildcard-regression-fix.md` - This document

---

## Verification Steps

### 1. Run Regression Tests
```bash
npm run test -- tests/lib/utils/fileValidation.jpeg-wildcard-regression.test.ts
# Expected: 7/7 tests pass
```

### 2. Run All Validation Tests
```bash
npm run test -- tests/lib/utils/fileValidation.*.test.ts
# Expected: 30/30 tests pass
```

### 3. Type Check
```bash
npm run typecheck
# Expected: No errors
```

### 4. Manual Verification
```typescript
// Create a fake JPEG with only middle byte matching
const fakeJpeg = new File([
  new Uint8Array([0x00, 0xD8, 0x00])
], 'test.jpg', { type: 'image/jpeg' });

const result = await validateFileType(fakeJpeg);
console.log(result.isValid); // Should be FALSE ✅
```

---

## Comparison: Before vs After

| Signature | Byte 0 | Byte 1 | Byte 2 | Before Fix | After Fix |
|-----------|--------|--------|--------|------------|-----------|
| JPEG `[0xFF, 0xD8, 0xFF]` | `0xFF` | `0xD8` | `0xFF` | ✅ CHECKED | ✅ CHECKED |
| Fake `[0x00, 0xD8, 0x00]` | `0x00` | `0xD8` | `0x00` | ✅ ACCEPTED ❌ | ❌ REJECTED ✅ |
| Fake `[0xAA, 0xD8, 0xBB]` | `0xAA` | `0xD8` | `0xBB` | ✅ ACCEPTED ❌ | ❌ REJECTED ✅ |

### Wildcard Behavior

| Format | Wildcard Bytes | Before Fix | After Fix |
|--------|----------------|------------|-----------|
| JPEG | None | Bytes 0,2 skipped ❌ | All bytes checked ✅ |
| WebP | Bytes 4-7 (size) | Skipped ✅ | Skipped ✅ |

---

## Related Issues

- **P1 Bug #1:** `image/jpg` MIME bypass (Fixed in commit 4d365d8)
- **P1 Bug #2:** `FileUpload` props bypass (Fixed in commit 4d365d8)
- **P1 Bug #3:** WebP RIFF bypass (Fixed in commit 428fe62)
- **P1 Regression:** JPEG wildcard bypass (This fix)

All file upload vulnerabilities and regressions are now **CLOSED**.

---

**Status:** ✅ **REGRESSION FIXED**  
**Risk:** Mitigated (never deployed)  
**Next Steps:** Deploy all fixes together
