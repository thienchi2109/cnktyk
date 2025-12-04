# Implementation Tasks: Smart File Upload Compression

**Change ID:** `add-smart-file-upload-compression`  
**Status:** Not Started  
**Estimated Total Time:** 10-13 hours

---

## Phase 1: Core Utilities (Priority: High)

### Task 1.1: Install Dependencies
- [ ] Install `browser-image-compression` package
  ```bash
  npm install browser-image-compression
  ```
- [ ] Verify package in `package.json` and `package-lock.json`
- [ ] Test import in a dummy file to ensure no build errors

**Estimated Time:** 10 minutes

### Task 1.2: Create Type Definitions
- [ ] Create `src/types/file-processing.ts`
- [ ] Define all TypeScript types and interfaces:
  - [ ] `FileCategory`
  - [ ] `ProcessedFileResult`
  - [ ] `CompressionStats`
  - [ ] `ProcessingError`
  - [ ] `ImageCompressionOptions`
  - [ ] `FileTypeValidation`
  - [ ] `ValidationResult`
- [ ] Define constants:
  - [ ] `FILE_SIGNATURES`
  - [ ] `ACCEPTED_IMAGE_TYPES`
  - [ ] `ACCEPTED_PDF_TYPE`
  - [ ] `MAX_PDF_SIZE_MB`
  - [ ] `MAX_PDF_SIZE_BYTES`
- [ ] Add JSDoc comments to all types

**Estimated Time:** 30 minutes

### Task 1.3: Create File Processor Utility
- [ ] Create `src/lib/utils/fileProcessor.ts`
- [ ] Implement `readFileSignature()` function
- [ ] Implement `validateFileType()` function with magic byte checking
- [ ] Implement `validatePDF()` function
- [ ] Implement `compressImage()` function using `browser-image-compression`
- [ ] Implement main `processFile()` orchestration function
- [ ] Add error handling with bilingual messages (VN + EN)
- [ ] Add progress callback support
- [ ] Implement helper functions:
  - [ ] `formatBytes()`
  - [ ] `formatCompressionRatio()`
- [ ] Add comprehensive JSDoc comments

**Estimated Time:** 2-3 hours

### Task 1.4: Unit Tests for File Processor
- [ ] Create `tests/lib/utils/fileProcessor.test.ts`
- [ ] Write tests for `compressImage()`:
  - [ ] Compress large JPG to WebP under 1MB
  - [ ] Preserve aspect ratio
  - [ ] Handle compression failures gracefully
- [ ] Write tests for `validatePDF()`:
  - [ ] Reject PDF >5MB
  - [ ] Accept PDF ≤5MB
- [ ] Write tests for `validateFileType()`:
  - [ ] Detect fake PDF (renamed .exe)
  - [ ] Accept genuine PDF
  - [ ] Validate image signatures (JPG, PNG)
- [ ] Mock `browser-image-compression` for testing
- [ ] Run tests: `npm run test`

**Estimated Time:** 1-2 hours

---

## Phase 2: Upload Hook (Priority: High)

### Task 2.1: Create Upload Hook
- [ ] Create `src/hooks/useFileUpload.ts`
- [ ] Define hook interfaces:
  - [ ] `UploadedFile`
  - [ ] `FileWithStatus`
  - [ ] `UseFileUploadOptions`
- [ ] Implement hook state management:
  - [ ] `files` state array
  - [ ] `addFiles` function
  - [ ] `removeFile` function
  - [ ] `clearFiles` function
  - [ ] `isUploading` computed state
- [ ] Implement `processAndUploadFile()` function:
  - [ ] Call `processFile()` with progress tracking
  - [ ] Handle processing errors
  - [ ] Upload to `/api/files/upload`
  - [ ] Update status to success/error
- [ ] Add comprehensive error handling
- [ ] Add JSDoc comments

**Estimated Time:** 2 hours

### Task 2.2: Integration Tests for Hook
- [ ] Create `tests/hooks/useFileUpload.test.tsx`
- [ ] Write tests:
  - [ ] Process and upload image successfully
  - [ ] Reject oversized PDF immediately
  - [ ] Handle compression failures
  - [ ] Handle upload failures
  - [ ] Remove files correctly
  - [ ] Track progress accurately
- [ ] Mock `fetch` API for upload tests
- [ ] Mock `processFile` utility
- [ ] Run tests: `npm run test`

**Estimated Time:** 1 hour

---

## Phase 3: UI Integration (Priority: High)

### Task 3.1: Update FileUpload Component
- [ ] Open `src/components/ui/file-upload.tsx`
- [ ] Import `useFileUpload` hook
- [ ] Import helper functions from `fileProcessor`
- [ ] Replace current upload logic with hook:
  - [ ] Replace `useState` with hook's `files` state
  - [ ] Replace `handleFiles()` with hook's `addFiles()`
  - [ ] Update `removeFile()` to use hook's version
- [ ] Update `getStatusIcon()` to include 'processing' status
- [ ] Update `getStatusLabel()` with new statuses
- [ ] Create `renderCompressionStats()` function:
  - [ ] Show original → compressed size
  - [ ] Show compression percentage
- [ ] Update progress bar colors:
  - [ ] Blue for processing
  - [ ] Medical blue for uploading
- [ ] Update file list rendering to show compression stats
- [ ] Test visually in browser

**Estimated Time:** 2 hours

### Task 3.2: Update Activity Submission Form
- [ ] Open `src/components/submissions/activity-submission-form.tsx`
- [ ] Verify integration with updated `FileUpload` component
- [ ] Test file upload flow end-to-end
- [ ] Verify compressed files are uploaded correctly

**Estimated Time:** 30 minutes

---

## Phase 4: Backend Updates (Priority: Medium)

### Task 4.1: Update Server Validation
- [ ] Open `src/lib/utils.ts`
- [ ] Update `validateFileType()` function:
  - [ ] Add `'image/webp'` to allowed types
- [ ] Test function with WebP files

**Estimated Time:** 10 minutes

### Task 4.2: Update API Route
- [ ] Open `src/app/api/files/upload/route.ts`
- [ ] Update error message for invalid file type:
  - [ ] Change "PDF, JPG, PNG" to "PDF, JPG, PNG, WebP"
- [ ] No other changes needed (validation already uses `validateFileType`)
- [ ] Test API with Postman/Thunder Client

**Estimated Time:** 10 minutes

### Task 4.3: Update Database Schema (Optional)
- [ ] Open `src/lib/db/schemas.ts`
- [ ] Add optional `compressionStats` field to `FileUploadSchema`
- [ ] Document that this field is client-side only (not stored in DB)

**Estimated Time:** 10 minutes

---

## Phase 5: Testing & Quality Assurance (Priority: Medium)

### Task 5.1: Manual Testing - Desktop
- [ ] Test image compression (JPG → WebP):
  - [ ] Upload 5MB JPG, verify compression to <1MB
  - [ ] Upload 10MB PNG, verify compression
  - [ ] Upload already small image (500KB), verify still compressed
- [ ] Test PDF validation:
  - [ ] Upload 3MB PDF, verify accepted
  - [ ] Upload 6MB PDF, verify rejected with Vietnamese message
- [ ] Test malicious files:
  - [ ] Rename .exe to .pdf, verify rejected
  - [ ] Rename .txt to .jpg, verify rejected
- [ ] Test progress indicators:
  - [ ] Verify "Đang xử lý" shows during compression
  - [ ] Verify "Đang tải lên" shows during upload
  - [ ] Verify compression stats display after success
- [ ] Test error handling:
  - [ ] Disconnect network during upload, verify error
  - [ ] Upload corrupted image, verify error message

**Estimated Time:** 1 hour

### Task 5.2: Manual Testing - Mobile
- [ ] Test on iOS Safari:
  - [ ] Upload image from camera
  - [ ] Upload image from photo library
  - [ ] Verify compression works on slow network
- [ ] Test on Android Chrome:
  - [ ] Upload image from camera
  - [ ] Upload image from gallery
  - [ ] Verify compression works on slow network
- [ ] Test on tablet devices (iPad, Android tablet)
- [ ] Verify UI is responsive during compression

**Estimated Time:** 1 hour

### Task 5.3: Performance Benchmarking
- [ ] Measure compression time:
  - [ ] 5MB image on desktop: <3 seconds
  - [ ] 5MB image on mobile: <5 seconds
- [ ] Measure bundle size impact:
  - [ ] Run `npm run build`
  - [ ] Check bundle size increase (<70KB gzipped)
- [ ] Measure memory usage:
  - [ ] Open Chrome DevTools → Memory
  - [ ] Compress 5 images sequentially
  - [ ] Verify peak memory <50MB
- [ ] Measure storage savings:
  - [ ] Compress 10 sample images
  - [ ] Calculate average compression ratio (target >70%)

**Estimated Time:** 1 hour

### Task 5.4: Cross-Browser Testing
- [ ] Test in Chrome (latest)
- [ ] Test in Edge (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Document any browser-specific issues

**Estimated Time:** 30 minutes

---

## Phase 6: Documentation (Priority: Low)

### Task 6.1: Update README
- [ ] Add section on file upload optimization
- [ ] Document compression parameters
- [ ] Explain PDF size limits
- [ ] Add troubleshooting section

**Estimated Time:** 30 minutes

### Task 6.2: Code Documentation
- [ ] Ensure all functions have JSDoc comments
- [ ] Add inline comments for complex logic
- [ ] Document edge cases and error handling

**Estimated Time:** 20 minutes

### Task 6.3: User-Facing Documentation
- [ ] Update user guide with file upload best practices
- [ ] Explain why images are compressed automatically
- [ ] Provide instructions for compressing PDFs externally
- [ ] Add FAQ section

**Estimated Time:** 30 minutes

---

## Phase 7: Feature Flag & Deployment (Priority: High)

### Task 7.1: Add Feature Flag (Optional)
- [ ] Open `src/lib/features/flags.ts`
- [ ] Add `isClientCompressionEnabled()` function
- [ ] Add `COMPRESSION_FLAGS` configuration object
- [ ] Update `.env.example` with new variables
- [ ] Document feature flag in README

**Estimated Time:** 20 minutes

### Task 7.2: Pre-Deployment Checklist
- [ ] All unit tests passing: `npm run test`
- [ ] Type checking passing: `npm run typecheck`
- [ ] Lint checking passing: `npm run lint`
- [ ] Build successful: `npm run build`
- [ ] All tasks marked complete in this file
- [ ] Code reviewed by peer

**Estimated Time:** 30 minutes

### Task 7.3: Staging Deployment
- [ ] Deploy to staging environment
- [ ] Verify compression works in staging
- [ ] Test with production-like data
- [ ] Verify R2 storage accepts WebP files
- [ ] Check Cloudflare Workers compatibility

**Estimated Time:** 30 minutes

### Task 7.4: Production Deployment
- [ ] Deploy to production
- [ ] Monitor error logs for 24 hours
- [ ] Monitor R2 storage metrics
- [ ] Verify compression savings (compare file sizes before/after)
- [ ] Collect user feedback

**Estimated Time:** 1 hour (monitoring)

---

## Phase 8: Post-Deployment (Priority: Low)

### Task 8.1: Monitor Metrics
- [ ] Track average file upload size (should decrease by 70-90%)
- [ ] Track R2 storage growth rate (should slow significantly)
- [ ] Track upload error rate (should not increase)
- [ ] Track compression failure rate (target <1%)

**Estimated Time:** Ongoing (1 week)

### Task 8.2: Archive Change
- [ ] Wait 1-2 weeks for stability
- [ ] Create archive PR:
  - [ ] Move `changes/add-smart-file-upload-compression/` to `changes/archive/2025-12-04-add-smart-file-upload-compression/`
  - [ ] Update `specs/activity-submission/spec.md` with final changes
- [ ] Run `openspec validate --strict`
- [ ] Merge archive PR

**Estimated Time:** 30 minutes

---

## Risk Mitigation Tasks

### Rollback Plan
- [ ] Document rollback procedure in `ROLLBACK.md`
- [ ] Test rollback in staging environment
- [ ] Verify rollback does not affect existing WebP files in R2

**Estimated Time:** 30 minutes

---

## Summary

**Total Tasks:** 50+  
**Estimated Total Time:** 10-13 hours  
**Priority Breakdown:**
- High Priority: 8-10 hours
- Medium Priority: 2-3 hours
- Low Priority: 1-2 hours

**Key Milestones:**
1. ✅ Core utilities working (Phase 1)
2. ✅ Hook integrated and tested (Phase 2)
3. ✅ UI updated and functional (Phase 3)
4. ✅ Backend accepts WebP (Phase 4)
5. ✅ All tests passing (Phase 5)
6. ✅ Deployed to production (Phase 7)
7. ✅ Change archived (Phase 8)
