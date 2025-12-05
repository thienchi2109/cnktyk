# P1 Security Bug Fix: Magic-Byte Check Bypass for image/jpg Uploads

**Status:** ✅ FIXED  
**Priority:** P1 (Critical Security Vulnerability)  
**Date:** 2025-12-05

## Problem Description

The `validateFileType` function in `src/lib/utils/fileValidation.ts` had a critical security vulnerability that allowed attackers to bypass magic-byte validation by using the `image/jpg` MIME type.

### Root Cause

1. **`ACCEPTED_IMAGE_TYPES`** included both `'image/jpeg'` and `'image/jpg'`
2. **`FILE_SIGNATURES`** only had an entry for `'image/jpeg'`, NOT `'image/jpg'`
3. When a file with MIME type `'image/jpg'` was uploaded:
   - It passed the acceptance check (line 51)
   - But `expectedSignature` was `undefined` (line 66)
   - The code then **trusted the MIME type without verification** (lines 68-76)
   - Returned `isValid: true` without checking magic bytes

### Attack Vector

An attacker could upload **any malicious file** (executable, PHP script, HTML, etc.) by:
1. Setting the MIME type to `'image/jpg'`
2. The file would pass validation without magic-byte verification
3. Malicious content would be stored and potentially executed

## Solution Implemented

### 1. Added Missing Signature Entry
**File:** `src/types/file-processing.ts`

Added `'image/jpg'` to `FILE_SIGNATURES` mapping to the same JPEG magic bytes:

```typescript
export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/jpg': [0xFF, 0xD8, 0xFF],  // Same as image/jpeg (non-standard but commonly used)
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};
```

### 2. Defense-in-Depth: Reject Unknown Signatures
**File:** `src/lib/utils/fileValidation.ts`

Changed the fallback behavior to **reject** files without defined signatures instead of trusting them:

```typescript
if (!expectedSignature) {
    // SECURITY: Reject files without defined signatures
    // This prevents bypass attacks if ACCEPTED_*_TYPES and FILE_SIGNATURES get out of sync
    return {
        isValid: false,
        category: 'other',
        detectedMimeType: mimeType,
        matchesSignature: false,
        error: 'No signature validation available for this MIME type',
    };
}
```

**Why this matters:** Even if a developer adds a new MIME type to `ACCEPTED_IMAGE_TYPES` but forgets to add it to `FILE_SIGNATURES`, the system will reject the file rather than creating a security hole.

## Testing

### New Security Test Suite
Created comprehensive test suite: `tests/lib/utils/fileValidation.security.test.ts`

**Test Coverage:**
- ✅ P1 Bug: Rejects arbitrary bytes with `image/jpg` MIME type
- ✅ Accepts valid JPEG with both `image/jpg` and `image/jpeg` MIME types
- ✅ Rejects malicious files (PNG, WebP, PDF) with wrong signatures
- ✅ Accepts valid files (PNG, WebP, PDF) with correct signatures
- ✅ MIME type spoofing attacks:
  - Executable disguised as JPEG
  - PHP script disguised as image/jpg
  - HTML disguised as PNG
- ✅ Edge cases: empty files, files smaller than signature length

### Test Results
```
✓ tests/lib/utils/fileValidation.security.test.ts (15)
  ✓ P1 Bug: image/jpg MIME type bypass (3)
  ✓ Defense-in-depth: Missing signature definitions (1)
  ✓ Other file types (6)
  ✓ MIME type spoofing attacks (3)
  ✓ Edge cases (2)

✓ tests/lib/utils/fileValidation.test.ts (7)
  All existing tests still pass
```

### Type Checking
```
✓ tsc --noEmit passes with no errors
```

## Security Impact

### Before Fix
- **Vulnerability:** Critical (P1)
- **Attack Complexity:** Low (just set MIME type to `image/jpg`)
- **Impact:** Arbitrary file upload, potential code execution

### After Fix
- **Vulnerability:** None
- **Protection:** Magic-byte validation enforced for all accepted MIME types
- **Defense-in-Depth:** Rejects files without signature definitions

## Files Changed

1. `src/types/file-processing.ts` - Added `image/jpg` signature entry
2. `src/lib/utils/fileValidation.ts` - Changed fallback to reject instead of trust
3. `tests/lib/utils/fileValidation.security.test.ts` - New comprehensive security tests

## Verification Checklist

- [x] Bug fix implemented
- [x] Defense-in-depth measures added
- [x] Comprehensive security tests created
- [x] All tests pass (15/15 new tests, 7/7 existing tests)
- [x] Type checking passes
- [x] No breaking changes to existing functionality

## Recommendations

1. **Code Review:** This fix should be reviewed by security team
2. **Audit Existing Files:** Check if any files were uploaded using the `image/jpg` bypass
3. **Monitoring:** Add logging for rejected files to detect attack attempts
4. **Documentation:** Update security documentation with this vulnerability and fix

## Notes

- The `image/jpg` MIME type is non-standard but commonly used by browsers
- The fix maintains backward compatibility with legitimate `image/jpg` uploads
- The defense-in-depth approach prevents similar vulnerabilities in the future
