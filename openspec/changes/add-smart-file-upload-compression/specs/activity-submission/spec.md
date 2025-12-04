# activity-submission Specification Delta

**Change ID:** `add-smart-file-upload-compression`  
**Spec:** `activity-submission`  
**Last Updated:** 2025-12-04

---

## ADDED Requirements

### Requirement: Client-Side Image Compression
The evidence file upload system SHALL automatically compress image files client-side before upload to optimize storage costs, bandwidth usage, and upload speed while maintaining visual quality.

#### Scenario: Large JPG image compressed to WebP
- **WHEN** a user selects a 5MB JPG image for evidence upload
- **THEN** the system automatically compresses it to WebP format with target size ~1MB (70-90% reduction) while maintaining visual quality
- **AND** the compression completes within 3 seconds on desktop devices
- **AND** the original aspect ratio is preserved

#### Scenario: PNG image compressed to WebP
- **WHEN** a user selects a 3MB PNG image for evidence upload
- **THEN** the system automatically converts it to WebP format with target size ~0.5-1MB
- **AND** transparency is preserved during conversion

#### Scenario: Image resizing for high-resolution photos
- **WHEN** a user uploads a 4032×3024 image (12MP from phone camera)
- **THEN** the system resizes it to maximum dimension 1920px while maintaining aspect ratio
- **AND** the resized image maintains acceptable visual quality (no obvious artifacts)

#### Scenario: Already small image still compressed
- **WHEN** a user uploads a 500KB JPG image
- **THEN** the system still converts it to WebP format for consistency and further optimization
- **AND** the output size is approximately 250-400KB

#### Scenario: WebP image passed through unchanged
- **WHEN** a user uploads a WebP image that is already optimized (<1MB, <1920px)
- **THEN** the system uploads it without additional compression

#### Scenario: Compression progress feedback
- **WHEN** an image is being compressed
- **THEN** the UI displays a progress indicator showing "Đang nén ảnh... X%" (Compressing image... X%)
- **AND** the progress updates smoothly from 0% to 100%

#### Scenario: Compression statistics displayed
- **WHEN** compression completes successfully
- **THEN** the UI shows compression savings (e.g., "Đã giảm 85% dung lượng: 5.2MB → 0.8MB")
- **AND** the statistics are displayed for 3 seconds or until upload begins

#### Scenario: Compression failure fallback
- **WHEN** image compression fails due to browser limitations or corrupted file
- **THEN** the system displays error message "Không thể nén ảnh. Vui lòng thử lại hoặc chọn ảnh khác."
- **AND** the file is not uploaded
- **AND** the user can remove the file and try again

#### Scenario: Multiple images compressed sequentially
- **WHEN** a user uploads 3 images simultaneously
- **THEN** the system compresses them sequentially (one at a time) to avoid memory issues
- **AND** shows individual progress for each file

#### Scenario: Compression on mobile devices
- **WHEN** a user uploads a 5MB image from mobile device (iOS/Android)
- **THEN** compression completes within 5 seconds
- **AND** does not cause browser tab crashes or memory errors
- **AND** uses Web Worker if available to keep UI responsive

---

### Requirement: Smart PDF Size Validation
The evidence file upload system SHALL validate PDF file sizes client-side before upload and reject oversized PDFs immediately with clear Vietnamese error messages.

#### Scenario: PDF under 5MB accepted
- **WHEN** a user selects a 3MB PDF file for evidence upload
- **THEN** the system validates the size and allows upload without compression

#### Scenario: PDF over 5MB rejected immediately
- **WHEN** a user selects a 6MB PDF file for evidence upload
- **THEN** the system rejects the file within 100ms without starting upload
- **AND** displays error message: "File PDF có dung lượng vượt quá 5MB. Vui lòng nén để giảm dung lượng file PDF trước khi tải lên."
- **AND** the file is removed from the upload queue

#### Scenario: PDF exactly 5MB accepted
- **WHEN** a user selects a PDF file that is exactly 5.00MB (5,242,880 bytes)
- **THEN** the system accepts the file and proceeds with upload

#### Scenario: Multiple PDFs validated independently
- **WHEN** a user uploads 2 PDFs (one 3MB, one 6MB)
- **THEN** the 3MB PDF is accepted and uploaded
- **AND** the 6MB PDF is rejected with error message
- **AND** the user can remove the rejected file and continue

#### Scenario: PDF validation response time
- **WHEN** a PDF file is selected
- **THEN** size validation completes within 100ms
- **AND** does not block the UI or delay user interaction

---

### Requirement: File Type Validation with Magic Byte Checking
The evidence file upload system SHALL validate file types using both MIME type and file signature (magic bytes) to prevent malicious file uploads disguised by renaming.

#### Scenario: Genuine PDF file accepted
- **WHEN** a user uploads a legitimate PDF file
- **THEN** the system validates MIME type (application/pdf) matches file signature (%PDF header bytes: 0x25, 0x50, 0x44, 0x46)
- **AND** the file passes validation and proceeds to size check

#### Scenario: Genuine JPG image accepted
- **WHEN** a user uploads a legitimate JPG file
- **THEN** the system validates MIME type (image/jpeg) matches file signature (0xFF, 0xD8, 0xFF)
- **AND** the file passes validation and proceeds to compression

#### Scenario: Genuine PNG image accepted
- **WHEN** a user uploads a legitimate PNG file
- **THEN** the system validates MIME type (image/png) matches file signature (0x89, 0x50, 0x4E, 0x47)
- **AND** the file passes validation and proceeds to compression

#### Scenario: Executable file renamed to PDF rejected
- **WHEN** a user attempts to upload an .exe file renamed to .pdf
- **THEN** the system detects MIME type mismatch with file signature
- **AND** rejects the file with error: "Loại tệp không hợp lệ. Chỉ chấp nhận ảnh (JPG, PNG, WebP) và PDF."
- **AND** logs a security warning to audit trail

#### Scenario: Text file renamed to JPG rejected
- **WHEN** a user attempts to upload a .txt file renamed to .jpg
- **THEN** the system detects MIME type mismatch with file signature
- **AND** rejects the file with error message
- **AND** prevents upload

#### Scenario: Corrupted image file rejected
- **WHEN** a user uploads a corrupted image file with invalid header
- **THEN** the system detects signature validation failure
- **AND** rejects the file with error: "Loại tệp không hợp lệ hoặc tệp bị hỏng."

#### Scenario: Unsupported file type rejected
- **WHEN** a user uploads a file type not in accepted list (e.g., .docx, .zip, .svg)
- **THEN** the system rejects immediately with error: "Loại tệp không hợp lệ. Chỉ chấp nhận ảnh (JPG, PNG, WebP) và PDF."

---

## MODIFIED Requirements

### Requirement: Accepted File Types (Updated)
The evidence file upload system SHALL accept the following file types for evidence submission: **JPG, PNG, WebP** (images) and **PDF** (documents).

**Change:** Added WebP to accepted image formats (previously only JPG and PNG).

#### Scenario: WebP images accepted (NEW)
- **WHEN** a user uploads a WebP image file
- **THEN** the system accepts it as a valid evidence file type
- **AND** uploads it to R2 storage with proper ContentType

#### Scenario: Server-side validation accepts WebP (NEW)
- **WHEN** a compressed WebP file reaches the API route `/api/files/upload`
- **THEN** the `validateFileType()` function returns true for MIME type `image/webp`
- **AND** the file is stored in R2 successfully

---

### Requirement: File Upload Progress Indicators (Enhanced)
The file upload UI SHALL display clear progress indicators for both **processing** (compression/validation) and **uploading** (network transfer) stages.

**Change:** Added processing stage indicators (was only uploading stage before).

#### Scenario: Processing stage indicator (NEW)
- **WHEN** an image file is being compressed
- **THEN** the UI displays a blue spinner icon and text "Đang xử lý X%" (Processing X%)
- **AND** the progress bar is blue and updates smoothly

#### Scenario: Uploading stage indicator (existing - no change)
- **WHEN** a processed file is being uploaded to server
- **THEN** the UI displays a medical-blue spinner icon and text "Đang tải lên X%" (Uploading X%)
- **AND** the progress bar is medical-blue

#### Scenario: Success state with compression stats (NEW)
- **WHEN** an image file upload completes successfully
- **THEN** the UI displays a green checkmark and "Tải lên thành công" (Upload successful)
- **AND** shows compression statistics: "Đã nén: 5MB → 0.8MB (84% giảm)"

#### Scenario: Error state with bilingual message (ENHANCED)
- **WHEN** a file processing or upload fails
- **THEN** the UI displays a red alert icon and error message in Vietnamese
- **AND** the English error message is available in console logs for debugging

---

### Requirement: Upload Performance (Enhanced)
The file upload system SHALL optimize upload performance through client-side compression, reducing bandwidth usage and upload times.

**Change:** Added compression time metrics and bundle size constraints.

#### Scenario: End-to-end upload time improvement (NEW)
- **WHEN** a user uploads a 5MB image on 3G network (pre-compression)
- **THEN** the upload previously took 15-20 seconds
- **AND** with compression, total time (1s compress + 3s upload) is 4 seconds
- **AND** net improvement is 75% faster

#### Scenario: Bundle size impact acceptable (NEW)
- **WHEN** the compression feature is deployed
- **THEN** the JavaScript bundle size increases by maximum 70KB gzipped
- **AND** the bundle size increase is acceptable given storage cost savings

#### Scenario: Memory usage within limits (NEW)
- **WHEN** compressing 5 images sequentially
- **THEN** peak memory usage stays below 50MB
- **AND** no memory leaks occur
- **AND** Web Worker isolates compression memory from main thread

---

## REMOVED Requirements

None. This change is purely additive and does not remove any existing functionality.

---

## Technical Notes

### Compression Parameters
Default compression settings (configurable via environment variables):
- `maxSizeMB`: 1.0 (target output size)
- `maxWidthOrHeight`: 1920 (maximum dimension)
- `fileType`: 'image/webp' (output format)
- `quality`: 0.8 (high quality, 80%)
- `useWebWorker`: true (offload processing)

### File Signature References
Magic byte signatures for validation:
- **JPG:** `0xFF 0xD8 0xFF`
- **PNG:** `0x89 0x50 0x4E 0x47` (PNG header)
- **WebP:** `0x52 0x49 0x46 0x46` (RIFF)
- **PDF:** `0x25 0x50 0x44 0x46` (%PDF)

### Browser Compatibility
- **Chrome/Edge:** Full support (Web Workers, WebP)
- **Firefox:** Full support
- **Safari:** Full support (iOS 14+, macOS 11+)
- **Legacy browsers:** Graceful degradation (skip compression, upload original)

### Security Considerations
- EXIF data automatically stripped during compression (privacy protection)
- File signature validation prevents malicious file uploads
- Server-side validation remains as defense-in-depth
- No files sent to third-party services (all processing client-side)

### Performance Targets
- Image compression: <3 seconds (5MB file, desktop)
- PDF validation: <100ms
- Upload time improvement: 50-80% reduction for images
- Storage savings: 70-90% per image file

---

## Dependencies

### New Dependencies
- `browser-image-compression` (^2.0.2): Client-side image compression library

### New Files
- `src/lib/utils/fileProcessor.ts`: Core compression and validation logic
- `src/hooks/useFileUpload.ts`: Upload orchestration hook
- `src/types/file-processing.ts`: TypeScript type definitions

### Modified Files
- `src/components/ui/file-upload.tsx`: Enhanced UI with compression feedback
- `src/lib/utils.ts`: Updated file type validation (add WebP)
- `src/app/api/files/upload/route.ts`: Updated error messages (mention WebP)

---

## Testing Requirements

### Unit Tests
- [ ] Test image compression with various sizes (100KB, 1MB, 5MB, 10MB)
- [ ] Test aspect ratio preservation during compression
- [ ] Test PDF size validation (3MB pass, 6MB fail)
- [ ] Test file signature validation (genuine vs fake files)
- [ ] Test compression failure handling
- [ ] Mock `browser-image-compression` library

### Integration Tests
- [ ] Test complete upload flow: select → process → upload → success
- [ ] Test error flow: select → process fail → error display
- [ ] Test multiple file uploads (sequential processing)
- [ ] Test progress tracking accuracy

### Manual Tests
- [ ] Test on desktop browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test with slow network (3G simulation)
- [ ] Test with large files (5MB+, 10MB+)
- [ ] Test with corrupted files
- [ ] Test with renamed malicious files (.exe → .pdf)
- [ ] Verify Vietnamese error messages display correctly

---

## Success Criteria

- ✅ Images automatically compressed to WebP <1MB
- ✅ PDF files >5MB rejected immediately with clear Vietnamese error
- ✅ File signature validation prevents malicious uploads
- ✅ Compression completes in <3 seconds for 5MB image
- ✅ Upload time reduced by 50%+ for images
- ✅ Compression statistics displayed to user
- ✅ All existing upload features continue to work
- ✅ No increase in upload errors
- ✅ Bundle size increase <70KB gzipped
- ✅ Works on Chrome, Firefox, Safari, Edge (latest versions)
- ✅ Works on iOS and Android mobile devices
