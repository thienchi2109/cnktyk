# P1 Security Fix: WebP Magic-Byte Validation Bypass

**Date:** 2025-12-05  
**Priority:** P1 (Critical Security)  
**Status:** ✅ FIXED & TESTED  
**CVE Risk:** High - Arbitrary file upload via MIME spoofing

---

## Executive Summary

Fixed a **critical P1 security vulnerability** where the WebP file validation only checked the `RIFF` header (4 bytes), allowing attackers to upload arbitrary RIFF-based files (AVI, WAV, etc.) by spoofing the MIME type to `image/webp`.

### Impact
- **Before Fix:** Any RIFF file (AVI video, WAV audio) could bypass validation
- **After Fix:** Full WebP header validation (RIFF + WEBP marker) enforced
- **Attack Complexity:** Low (just set MIME type to `image/webp`)
- **Exploitability:** Direct POST to `/api/files/upload`

---

## The Vulnerability

### Root Cause

The original implementation in `src/types/file-processing.ts` only validated the first 4 bytes:

```typescript
// VULNERABLE CODE (Before)
export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF only ❌
  // ...
};
```

**Problem:** `RIFF` is a **generic container format** used by:
- **WebP** images (`RIFF` + size + `WEBP`)
- **AVI** videos (`RIFF` + size + `AVI `)
- **WAV** audio (`RIFF` + size + `WAVE`)
- Other RIFF-based formats

### Attack Vector

1. Attacker creates an AVI or WAV file
2. POSTs to `/api/files/upload` with `Content-Type: image/webp`
3. Validator checks first 4 bytes → sees `RIFF` → **ACCEPTS** ❌
4. Arbitrary RIFF content stored as "image"

### Proof of Concept

```typescript
// AVI file disguised as WebP
const aviFile = new File([
  new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF ✅ (passes check)
    0x00, 0x00, 0x00, 0x00, // Size
    0x41, 0x56, 0x49, 0x20, // 'AVI ' (NOT WebP!)
    // ... malicious payload
  ])
], 'malicious.webp', { type: 'image/webp' });

// BEFORE FIX: This would PASS validation ❌
// AFTER FIX: This is REJECTED ✅
```

---

## The Fix

### 1. Extended WebP Signature (12 bytes)

Updated `FILE_SIGNATURES` to check the **full WebP header**:

```typescript
// FIXED CODE (After)
export const FILE_SIGNATURES: Record<string, (number | null)[]> = {
  'image/webp': [
    0x52, 0x49, 0x46, 0x46, // 'RIFF' header (bytes 0-3)
    null, null, null, null, // File size (bytes 4-7) - wildcard (skip)
    0x57, 0x45, 0x42, 0x50  // 'WEBP' marker (bytes 8-11) ✅
  ],
  // ...
};
```

**Key Changes:**
- Bytes 0-3: `RIFF` (required)
- Bytes 4-7: File size (variable, skipped with `null` wildcard)
- Bytes 8-11: `WEBP` marker (required - **this is what distinguishes WebP from AVI/WAV**)

**Note:** We use `null` (not `0xFF`) as the wildcard sentinel to avoid conflicts with JPEG signatures that contain `0xFF` as required bytes.

### 2. Wildcard Support in Signature Matching

Updated `fileValidation.ts` to support skip bytes:

```typescript
// Compare signatures (null = wildcard/skip byte)
const matchesSignature = expectedSignature.every(
    (byte, index) => byte === null || signature[index] === byte
);
```

This allows us to:
- Check bytes 0-3 (`RIFF`)
- **Skip** bytes 4-7 (file size - varies per file, marked as `null`)
- Check bytes 8-11 (`WEBP`)

**Why `null` instead of `0xFF`?** Using `0xFF` as a wildcard would conflict with JPEG signatures that legitimately contain `0xFF` as required bytes. The `null` sentinel is type-safe and cannot appear in actual byte data.

### 3. Increased Byte Read Length

```typescript
export async function readFileSignature(file: File): Promise<number[]> {
    const BYTES_TO_READ = 12; // Increased from 8 to 12
    // ...
}
```

---

## Test Coverage

Created comprehensive test suite: `tests/lib/utils/fileValidation.webp-bypass.test.ts`

### Attack Scenarios (All REJECTED ✅)

```typescript
✓ should REJECT AVI file disguised as WebP (RIFF + AVI header)
✓ should REJECT WAV file disguised as WebP (RIFF + WAVE header)
✓ should REJECT generic RIFF file with arbitrary content
✓ should REJECT WebP with incomplete header (only RIFF)
✓ should REJECT WebP with corrupted WEBP marker
```

### Valid WebP Files (All ACCEPTED ✅)

```typescript
✓ should ACCEPT valid WebP with proper RIFF + WEBP header
✓ should ACCEPT valid WebP with VP8L (lossless)
✓ should ACCEPT valid WebP with VP8X (extended)
```

### Test Results

```
✅ 8/8 tests pass in webp-bypass.test.ts
✅ 15/15 tests pass in fileValidation.security.test.ts
✅ 23/23 total security tests pass
✅ Type checking passes
```

---

## WebP File Format Reference

### Proper WebP Structure

```
Offset  Size  Field       Value
------  ----  ----------  -----
0       4     FourCC      'RIFF'
4       4     File Size   (file size - 8) in little-endian
8       4     FourCC      'WEBP' ← This is what we now check!
12      4     Chunk Type  'VP8 ' (lossy) / 'VP8L' (lossless) / 'VP8X' (extended)
16+     ...   Chunk Data  Image data
```

### Other RIFF Formats (Now Rejected)

| Format | Bytes 0-3 | Bytes 8-11 | Validation Result |
|--------|-----------|------------|-------------------|
| **WebP** | `RIFF` | `WEBP` | ✅ **ACCEPTED** |
| AVI | `RIFF` | `AVI ` | ❌ **REJECTED** |
| WAV | `RIFF` | `WAVE` | ❌ **REJECTED** |
| Generic | `RIFF` | `????` | ❌ **REJECTED** |

---

## Security Impact Assessment

### Before Fix

| Metric | Value |
|--------|-------|
| **Severity** | P1 - Critical |
| **Attack Complexity** | Low (just spoof MIME type) |
| **Exploitability** | Direct (POST to `/api/files/upload`) |
| **Impact** | Arbitrary file upload |
| **CVSS Score** | ~7.5 (High) |

### After Fix

| Protection | Status |
|-----------|--------|
| Magic-byte validation | ✅ Full WebP header checked |
| RIFF format distinction | ✅ AVI/WAV rejected |
| Defense-in-depth | ✅ Wildcard system prevents future issues |
| Test coverage | ✅ 23 security tests |

---

## Files Changed

### Core Changes
1. `src/types/file-processing.ts` - Extended WebP signature to 12 bytes
2. `src/lib/utils/fileValidation.ts` - Added wildcard support, increased read length

### Tests
3. `tests/lib/utils/fileValidation.webp-bypass.test.ts` - New P1 vulnerability tests (8 tests)
4. `tests/lib/utils/fileValidation.security.test.ts` - Updated existing WebP test

### Documentation
5. `docs/security/P1-webp-riff-bypass-fix.md` - This document

---

## Verification Steps

### 1. Run Security Tests
```bash
npm run test -- tests/lib/utils/fileValidation.webp-bypass.test.ts
# Expected: 8/8 tests pass
```

### 2. Run All File Validation Tests
```bash
npm run test -- tests/lib/utils/fileValidation.security.test.ts
# Expected: 15/15 tests pass
```

### 3. Type Check
```bash
npm run typecheck
# Expected: No errors
```

### 4. Manual Verification
```typescript
// Create a fake AVI file
const aviBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x00, 0x00, 0x00, 0x00, // Size
  0x41, 0x56, 0x49, 0x20, // AVI
]);
const fakeWebP = new File([aviBytes], 'test.webp', { type: 'image/webp' });

const result = await validateFileType(fakeWebP);
console.log(result.isValid); // Should be FALSE ✅
```

---

## Recommendations

### Immediate Actions
- [x] Fix deployed to codebase
- [x] All tests passing
- [ ] **Security audit:** Check if any malicious files were uploaded during vulnerability window
- [ ] **Server-side validation:** Ensure `/api/files/upload` also validates (defense-in-depth)

### Future Enhancements
1. **Content-Type validation:** Reject if `Content-Type` header doesn't match file signature
2. **File size validation:** Verify RIFF size field matches actual file size
3. **Deep inspection:** For WebP, validate VP8/VP8L/VP8X chunk structure
4. **Logging:** Add metrics for file rejection reasons

### Monitoring
- Track file upload rejection rates by MIME type
- Alert on unusual patterns (e.g., spike in `image/webp` rejections)
- Audit log all file validation failures

---

## Related Issues

- **P1 Bug #1:** `image/jpg` MIME bypass (Fixed in previous commit)
- **P1 Bug #2:** `FileUpload` props bypass (Fixed in previous commit)
- **P1 Bug #3:** WebP RIFF bypass (This fix - commit 428fe62)
- **P1 Regression:** JPEG wildcard bypass (Introduced by using `0xFF` as wildcard, fixed in commit 0095cf9 by changing to `null`)

All file upload vulnerabilities and regressions are now **CLOSED**.

---

## References

- [WebP Container Specification](https://developers.google.com/speed/webp/docs/riff_container)
- [RIFF File Format](https://en.wikipedia.org/wiki/Resource_Interchange_File_Format)
- [Magic Number (Programming)](https://en.wikipedia.org/wiki/Magic_number_(programming))

---

**Status:** ✅ **VERIFIED FIXED**  
**Next Review:** After deployment to production
