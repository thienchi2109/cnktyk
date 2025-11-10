# Implementation Tasks: Fix Evidence Download and Add View

**Change ID:** `fix-evidence-download-add-view`
**Status:** Not Started
**Created:** 2025-11-10

---

## Phase 1: Backend - Fix Download Functionality (Priority: Critical)

### Storage Layer Changes

- [ ] **Update r2-client.ts getSignedUrl() method**
  - [ ] Add `disposition` parameter: `'inline' | 'attachment' = 'inline'`
  - [ ] Implement Content-Disposition header logic for attachment mode
  - [ ] Implement Content-Disposition header logic for inline mode
  - [ ] Add filename extraction from path (handle `/` separators)
  - [ ] Add RFC 6266 compliant filename encoding (ASCII + UTF-8)
  - [ ] Handle Unicode characters in filenames
  - [ ] Handle special characters (spaces, quotes, slashes)
  - [ ] Ensure backward compatibility (default disposition='inline')
  - [ ] Update JSDoc comments with parameter descriptions

### API Endpoint Changes

- [ ] **Update /api/files/[...filename]/route.ts**
  - [ ] Extract `disposition` query parameter from request
  - [ ] Validate disposition value (attachment | inline | undefined)
  - [ ] Default to 'inline' if missing or invalid
  - [ ] Pass disposition to `r2Client.getSignedUrl()`
  - [ ] Update API response structure (unchanged, verify)
  - [ ] Update error handling (unchanged, verify)

### Backend Testing

- [ ] **Unit tests for r2-client.ts**
  - [ ] Test: disposition='attachment' includes Content-Disposition: attachment
  - [ ] Test: disposition='inline' includes Content-Disposition: inline
  - [ ] Test: default (no parameter) uses 'inline'
  - [ ] Test: Unicode filename "Báo cáo.pdf" encoded correctly
  - [ ] Test: Filename with spaces "My Report.pdf" encoded correctly
  - [ ] Test: Filename with quotes 'Report "Final".pdf' encoded correctly
  - [ ] Test: Filename with special chars "#report@2024.pdf" encoded correctly
  - [ ] Test: Edge case - empty filename defaults to "download"
  - [ ] Test: Edge case - filename with path "folder/file.pdf" extracts "file.pdf"

- [ ] **Integration tests for API endpoint**
  - [ ] Test: GET with disposition=attachment returns signed URL with attachment header
  - [ ] Test: GET with disposition=inline returns signed URL with inline header
  - [ ] Test: GET with no disposition defaults to inline
  - [ ] Test: GET with disposition=invalid defaults to inline
  - [ ] Test: Signed URL can be fetched (HTTP 200)
  - [ ] Test: Signed URL has correct Content-Disposition when accessed
  - [ ] Test: File not found returns 404
  - [ ] Test: Unauthorized returns 401

- [ ] **Manual testing**
  - [ ] Generate signed URL with disposition=attachment
  - [ ] Open URL in browser → verify download prompt
  - [ ] Generate signed URL with disposition=inline
  - [ ] Open URL in browser → verify inline display (PDF)
  - [ ] Test with various file types: PDF, PNG, DOCX, ZIP
  - [ ] Verify filename preservation in download

---

## Phase 2: Frontend - Create Evidence File Hook (Priority: Critical)

### New Hook Implementation

- [ ] **Create src/hooks/use-evidence-file.ts**
  - [ ] Define `FileAction` type: 'download' | 'view'
  - [ ] Implement `useEvidenceFile()` hook
  - [ ] Add `isLoading` state
  - [ ] Implement `handleFileAction(fileUrl, action, filename?)` function
  - [ ] Implement `downloadFile(fileUrl, filename?)` wrapper
  - [ ] Implement `viewFile(fileUrl)` wrapper
  - [ ] Add error handling with toast notifications
  - [ ] Add popup blocker detection (check if `window.open()` returns null)
  - [ ] Add loading state management (setIsLoading)
  - [ ] Add try-catch with console.error logging

### Hook Testing

- [ ] **Unit tests for use-evidence-file.ts**
  - [ ] Test: `downloadFile()` calls fetch with disposition=attachment
  - [ ] Test: `viewFile()` calls fetch with disposition=inline
  - [ ] Test: `isLoading` becomes true during operation
  - [ ] Test: `isLoading` becomes false after success
  - [ ] Test: `isLoading` becomes false after error
  - [ ] Test: Error shows toast notification
  - [ ] Test: Popup blocker shows warning toast
  - [ ] Test: Network error shows toast with retry message
  - [ ] Test: File not found (404) shows appropriate toast
  - [ ] Test: Missing fileUrl shows error toast

- [ ] **Integration tests**
  - [ ] Test: Complete download flow (fetch → open → success)
  - [ ] Test: Complete view flow (fetch → open → success)
  - [ ] Test: Error flow (fetch fails → toast shown)
  - [ ] Mock `window.open()` and verify it's called with signed URL
  - [ ] Mock `fetch()` and verify correct API calls

---

## Phase 3: Frontend - Update Submissions List (Priority: High)

### Component Updates

- [ ] **Update src/components/submissions/submissions-list.tsx**
  - [ ] Import `useEvidenceFile` hook
  - [ ] Import `FileText` icon from lucide-react
  - [ ] Initialize hook: `const evidenceFile = useEvidenceFile()`
  - [ ] Remove old `handleDownloadEvidence` function (lines 201-214)
  - [ ] Update action buttons section (lines 523-543)
  - [ ] Add View button with FileText icon
  - [ ] Update Download button to use `evidenceFile.downloadFile()`
  - [ ] Add tooltip "Xem minh chứng" for View button
  - [ ] Add tooltip "Tải xuống minh chứng" for Download button
  - [ ] Add `disabled={evidenceFile.isLoading}` to both buttons
  - [ ] Add `onClick={(e) => e.stopPropagation()}` to prevent row click
  - [ ] Add title attributes for accessibility
  - [ ] Test button spacing and alignment

### UI Polish

- [ ] **Visual refinements**
  - [ ] Ensure 3 buttons fit on one line (Eye, FileText, Download)
  - [ ] Consistent button sizing (all `size="sm"`)
  - [ ] Consistent spacing (gap-2)
  - [ ] Verify icon sizing (all h-4 w-4)
  - [ ] Test responsive layout (mobile view)
  - [ ] Test with long activity names (button alignment)

- [ ] **Accessibility**
  - [ ] Add aria-label to View file button
  - [ ] Add aria-label to Download button
  - [ ] Test keyboard navigation (Tab, Enter)
  - [ ] Test screen reader announcements
  - [ ] Ensure disabled state is announced

### Testing

- [ ] **Component tests**
  - [ ] Test: View button renders when FileMinhChungUrl exists
  - [ ] Test: View button hidden when FileMinhChungUrl is null
  - [ ] Test: Click View button calls `evidenceFile.viewFile()`
  - [ ] Test: Click Download button calls `evidenceFile.downloadFile()`
  - [ ] Test: Buttons disabled when `isLoading === true`
  - [ ] Test: onClick stops event propagation (detail sheet doesn't open)
  - [ ] Test: Tooltips render correctly

- [ ] **E2E tests**
  - [ ] Navigate to submissions list
  - [ ] Identify submission with evidence file
  - [ ] Click View button → new tab opens with inline file
  - [ ] Close tab, return to list
  - [ ] Click Download button → file downloads
  - [ ] Verify loading state during operation
  - [ ] Test error scenario (network failure)

---

## Phase 4: Frontend - Update Submission Detail View (Priority: High)

### Component Updates

- [ ] **Update src/components/submissions/submission-review.tsx**
  - [ ] Import `useEvidenceFile` hook
  - [ ] Import `Eye` icon from lucide-react (for View button)
  - [ ] Initialize hook: `const evidenceFile = useEvidenceFile()`
  - [ ] Remove old `handleDownloadEvidence` function (lines 132-145)
  - [ ] Update evidence section (lines 356-380)
  - [ ] Add file metadata display (extension, filename)
  - [ ] Implement `getFileName()` helper function
  - [ ] Implement `getFileExtension()` helper function
  - [ ] Add View button with Eye icon and "Xem" label
  - [ ] Update Download button to use `evidenceFile.downloadFile()`
  - [ ] Update Download button label to "Tải xuống"
  - [ ] Add `disabled={evidenceFile.isLoading}` to both buttons
  - [ ] Style View button as outline variant
  - [ ] Style Download button with medical-green background
  - [ ] Add button container with flex layout (gap-2)

### Helper Functions

- [ ] **Implement file metadata helpers**
  ```typescript
  const getFileName = (url: string) => {
    return decodeURIComponent(url.split('/').pop() || 'file');
  };

  const getFileExtension = (url: string) => {
    const filename = getFileName(url);
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };
  ```
  - [ ] Test with various URL formats
  - [ ] Test with Unicode filenames
  - [ ] Test with encoded URLs
  - [ ] Test with missing extensions

### UI Polish

- [ ] **Visual refinements**
  - [ ] File icon styling (FileText, h-8 w-8, medical-blue)
  - [ ] File metadata layout (name, extension badge)
  - [ ] Button spacing (flex gap-2)
  - [ ] View button outline style
  - [ ] Download button green background
  - [ ] Responsive layout for mobile
  - [ ] Loading spinner placement

- [ ] **File metadata display**
  - [ ] Show extension badge (e.g., "PDF", "PNG")
  - [ ] Show filename below icon
  - [ ] Truncate long filenames with ellipsis
  - [ ] Test with various file types
  - [ ] Test with long filenames (>50 chars)

### Testing

- [ ] **Component tests**
  - [ ] Test: Evidence section renders when FileMinhChungUrl exists
  - [ ] Test: Evidence section hidden when FileMinhChungUrl is null
  - [ ] Test: File extension displays correctly
  - [ ] Test: Filename displays correctly
  - [ ] Test: View button calls `evidenceFile.viewFile()`
  - [ ] Test: Download button calls `evidenceFile.downloadFile()`
  - [ ] Test: Buttons disabled when `isLoading === true`
  - [ ] Test: Loading state shows on correct button

- [ ] **E2E tests**
  - [ ] Open submission detail view with evidence
  - [ ] Verify file metadata displays
  - [ ] Click View button → file opens inline in new tab
  - [ ] Close tab, return to detail view
  - [ ] Click Download button → file downloads
  - [ ] Verify loading state during operation
  - [ ] Test error scenario (network failure)
  - [ ] Test popup blocker scenario

---

## Phase 5: Cross-Browser Testing (Priority: High)

### Desktop Browsers

- [ ] **Google Chrome (latest)**
  - [ ] Download button triggers download (not open)
  - [ ] View button opens inline in new tab
  - [ ] Filename preserved correctly
  - [ ] Unicode filenames work
  - [ ] Loading states work
  - [ ] Error handling works

- [ ] **Mozilla Firefox (latest)**
  - [ ] Download button triggers download (not open)
  - [ ] View button opens inline in new tab
  - [ ] Filename preserved correctly
  - [ ] Unicode filenames work
  - [ ] Loading states work
  - [ ] Error handling works

- [ ] **Safari (latest)**
  - [ ] Download button triggers download (not open)
  - [ ] View button opens inline in new tab
  - [ ] Filename preserved correctly
  - [ ] Unicode filenames work
  - [ ] Loading states work
  - [ ] Error handling works

- [ ] **Microsoft Edge (latest)**
  - [ ] Download button triggers download (not open)
  - [ ] View button opens inline in new tab
  - [ ] Filename preserved correctly
  - [ ] Unicode filenames work
  - [ ] Loading states work
  - [ ] Error handling works

### Mobile Browsers

- [ ] **iOS Safari**
  - [ ] Download button opens file (iOS limitation)
  - [ ] View button opens file inline
  - [ ] User can save via Share → Save to Files
  - [ ] Filenames preserved
  - [ ] Touch targets adequate (44x44px minimum)
  - [ ] Loading states visible
  - [ ] Error toasts readable

- [ ] **Android Chrome**
  - [ ] Download button triggers download
  - [ ] View button opens inline
  - [ ] Download notification shows
  - [ ] Filenames preserved
  - [ ] Touch targets adequate
  - [ ] Loading states visible
  - [ ] Error toasts readable

### File Type Testing

- [ ] **PDF files**
  - [ ] View: Opens inline in browser PDF viewer
  - [ ] Download: Saves as PDF with correct filename
  - [ ] Unicode filename preserved

- [ ] **Image files (PNG, JPG)**
  - [ ] View: Opens inline in browser image viewer
  - [ ] Download: Saves with correct filename
  - [ ] Large images (>5MB) work correctly

- [ ] **Document files (DOCX, XLSX)**
  - [ ] View: Browser downloads (not viewable inline)
  - [ ] Download: Saves with correct filename
  - [ ] Unicode filename preserved

- [ ] **Archive files (ZIP, RAR)**
  - [ ] View: Browser downloads (not viewable inline)
  - [ ] Download: Saves with correct filename
  - [ ] Large archives (>50MB) work correctly

- [ ] **Text files (TXT, CSV)**
  - [ ] View: Opens inline in browser
  - [ ] Download: Saves with correct filename

---

## Phase 6: Error Handling and Edge Cases (Priority: Medium)

### Error Scenarios

- [ ] **File not found (404)**
  - [ ] Toast shows: "Không tìm thấy tệp minh chứng"
  - [ ] Loading state clears
  - [ ] User can retry
  - [ ] Error logged to console

- [ ] **Permission denied (403)**
  - [ ] Toast shows: "Bạn không có quyền truy cập tệp này"
  - [ ] Loading state clears
  - [ ] User cannot retry (redirect to login if session expired)

- [ ] **Network error (timeout, connection lost)**
  - [ ] Toast shows: "Lỗi kết nối. Vui lòng thử lại."
  - [ ] Loading state clears
  - [ ] User can retry immediately
  - [ ] Error logged with network details

- [ ] **R2 not configured (503)**
  - [ ] Toast shows: "Hệ thống lưu trữ tệp chưa được cấu hình"
  - [ ] Loading state clears
  - [ ] Error logged to console
  - [ ] Contact admin message shown

- [ ] **Invalid signed URL response**
  - [ ] Toast shows: "Không nhận được URL ký"
  - [ ] Loading state clears
  - [ ] Error logged to console

- [ ] **Popup blocker**
  - [ ] Toast shows: "Popup bị chặn. Vui lòng cho phép popup để mở tệp"
  - [ ] Loading state clears
  - [ ] Instructions provided (browser settings)

### Edge Cases

- [ ] **Empty file URL**
  - [ ] Buttons hidden (no FileMinhChungUrl)
  - [ ] No error shown (expected state)

- [ ] **Malformed URL**
  - [ ] Error caught gracefully
  - [ ] Toast shows generic error message
  - [ ] Error logged to console

- [ ] **Expired signed URL**
  - [ ] User retries → new signed URL generated
  - [ ] Download/view succeeds on retry

- [ ] **Concurrent actions**
  - [ ] User clicks Download then View quickly
  - [ ] Only first action proceeds
  - [ ] Second action waits for first to complete
  - [ ] Both buttons disabled during operation

- [ ] **Very long filenames (>100 chars)**
  - [ ] Display truncated with ellipsis
  - [ ] Full filename preserved in download
  - [ ] Tooltip shows full filename

---

## Phase 7: Performance Testing (Priority: Medium)

### Performance Benchmarks

- [ ] **Signed URL generation time**
  - [ ] Measure: Average time to generate signed URL
  - [ ] Target: <500ms (p95)
  - [ ] Target: <200ms (p50)
  - [ ] Test with 10, 100, 1000 concurrent requests

- [ ] **UI responsiveness**
  - [ ] Click Download → Button disabled within 50ms
  - [ ] Loading state appears within 100ms
  - [ ] Operation completes within 1s (excluding browser download)
  - [ ] No UI freezing or blocking

- [ ] **Memory usage**
  - [ ] Large file (50MB) download → memory usage stable
  - [ ] No memory leaks after multiple operations
  - [ ] Browser memory profiling shows no issues

- [ ] **Network optimization**
  - [ ] Signed URL cached (no redundant requests)
  - [ ] File streams directly from R2 (no app server proxy)
  - [ ] Minimal bandwidth usage (no double downloads)

### Load Testing

- [ ] **Multiple users downloading simultaneously**
  - [ ] 10 users download different files → all succeed
  - [ ] 50 users download different files → all succeed
  - [ ] 100 users download different files → monitor performance

- [ ] **Large file handling**
  - [ ] 10MB file → download completes smoothly
  - [ ] 50MB file → download completes smoothly
  - [ ] 100MB file → download completes smoothly
  - [ ] 500MB file → download completes (may take time, no errors)

---

## Phase 8: Documentation and Deployment (Priority: Medium)

### Documentation Updates

- [ ] **User Guide**
  - [ ] Add section: "Viewing and Downloading Evidence Files"
  - [ ] Explain difference between View and Download buttons
  - [ ] Add screenshots of both buttons
  - [ ] Explain expected behavior for different file types
  - [ ] Mobile usage tips (iOS Share → Save to Files)
  - [ ] Troubleshooting: Popup blocker instructions
  - [ ] Troubleshooting: Download not starting

- [ ] **API Documentation**
  - [ ] Document `disposition` query parameter
  - [ ] Show examples for attachment mode
  - [ ] Show examples for inline mode
  - [ ] Explain Content-Disposition header format
  - [ ] Document error responses

- [ ] **Developer Documentation**
  - [ ] Document `useEvidenceFile()` hook API
  - [ ] Explain when to use `downloadFile()` vs `viewFile()`
  - [ ] Provide code examples
  - [ ] Document helper functions (getFileName, getFileExtension)
  - [ ] Explain Content-Disposition implementation

- [ ] **Changelog**
  - [ ] Add entry for version X.Y.Z
  - [ ] Describe bug fix: Download now downloads instead of opening
  - [ ] Describe new feature: View button for inline preview
  - [ ] Note: No breaking changes

### Code Comments

- [ ] **Add JSDoc comments**
  - [ ] `r2Client.getSignedUrl()` - document disposition parameter
  - [ ] `useEvidenceFile()` hook - document return values
  - [ ] Helper functions - document edge cases

### Deployment Preparation

- [ ] **Pre-deployment checklist**
  - [ ] All unit tests passing (≥95% coverage)
  - [ ] All integration tests passing
  - [ ] All E2E tests passing
  - [ ] Cross-browser testing complete
  - [ ] Performance benchmarks met
  - [ ] Security review completed
  - [ ] Documentation updated
  - [ ] Changelog updated
  - [ ] Code review approved

- [ ] **Deployment plan**
  - [ ] Step 1: Deploy backend changes (storage + API)
  - [ ] Step 2: Verify backend in production (curl test)
  - [ ] Step 3: Deploy frontend changes (hook + components)
  - [ ] Step 4: Verify frontend in production (manual test)
  - [ ] Step 5: Monitor error logs for 24 hours
  - [ ] Step 6: Collect user feedback from pilot group

- [ ] **Rollback plan**
  - [ ] Frontend rollback: Revert to old handleDownloadEvidence
  - [ ] Backend rollback: Revert r2-client.ts and route.ts (if critical bug)
  - [ ] Communication: Notify users, provide workaround
  - [ ] Timeline: Fix and redeploy within 24 hours

### Post-Deployment

- [ ] **Monitoring (Week 1)**
  - [ ] Monitor error logs for file access errors
  - [ ] Monitor signed URL generation time (p95, p99)
  - [ ] Monitor support tickets for download issues
  - [ ] Check browser analytics (which browsers used?)
  - [ ] Verify no increase in 404/403/500 errors

- [ ] **User Feedback Collection**
  - [ ] Survey 5+ DonVi admins
  - [ ] Survey 5+ SoYTe admins
  - [ ] Questions:
    - "Does the Download button work as expected?"
    - "Is the View button useful?"
    - "Any issues with file downloads?"
    - "Any confusion about View vs Download?"
  - [ ] Analyze feedback and prioritize improvements

- [ ] **Success Metrics (Week 4)**
  - [ ] Download success rate: ≥95%
  - [ ] User adoption: ≥80% use Download button
  - [ ] View adoption: ≥40% use View button
  - [ ] Error rate: <1%
  - [ ] Support ticket reduction: ≥50%
  - [ ] User satisfaction: ≥90% positive feedback

---

## Phase 9: Future Enhancements (Priority: Low)

- [ ] **Batch download (ZIP multiple files)**
  - [ ] Design: Server-side ZIP generation or client-side library?
  - [ ] UI: Checkbox selection + "Download All" button
  - [ ] Implementation: Stream ZIP to user

- [ ] **File preview modal**
  - [ ] In-app PDF viewer (react-pdf)
  - [ ] Image viewer with zoom/pan
  - [ ] Avoid external tab for quick previews

- [ ] **Download progress tracking**
  - [ ] Show progress bar for large files
  - [ ] Estimate time remaining
  - [ ] Cancel download option

- [ ] **Download history**
  - [ ] Track user downloads in database
  - [ ] Show "Downloaded on [date]" badge
  - [ ] Admin analytics: most downloaded files

- [ ] **Audit logging for downloads**
  - [ ] Log all file access to NhatKyHeThong
  - [ ] Track: who, when, which file, action (view/download)
  - [ ] Compliance reporting

- [ ] **File metadata caching**
  - [ ] Cache file size, type, upload date
  - [ ] Display in UI: "PDF • 2.5 MB • Uploaded 2025-01-15"
  - [ ] Reduce API calls

---

## Dependencies

- Existing: `r2Client` (src/lib/storage/r2-client.ts)
- Existing: Toast system (src/hooks/use-toast.ts)
- Existing: File API endpoint (src/app/api/files/[...filename]/route.ts)
- New: `useEvidenceFile` hook
- lucide-react: FileText, Eye, Download icons
- AWS SDK: GetObjectCommand, getSignedUrl

---

## Risk Mitigation

- [ ] **Risk: Popup blocker prevents file open**
  - Mitigation: Show toast with instructions
  - Fallback: Provide direct link in toast

- [ ] **Risk: Unicode filename breaks in old browsers**
  - Mitigation: Dual encoding (ASCII + UTF-8)
  - Testing: Test on Safari 16, Firefox 119

- [ ] **Risk: Large file download timeout**
  - Mitigation: Signed URL streams from R2 (no timeout)
  - Testing: Test 500MB+ files

- [ ] **Risk: Mobile browsers don't support download**
  - Mitigation: Document expected mobile behavior
  - Workaround: iOS Share → Save to Files

- [ ] **Risk: Signed URL expires during download**
  - Mitigation: 1-hour expiry is sufficient
  - Fallback: User can retry

---

## Notes

- Download bug is **critical** - affects all users trying to download evidence
- View feature is **high priority** - improves UX significantly
- Backend changes are **safe and additive** - backward compatible
- No database migrations required
- Focus on cross-browser testing (many edge cases)
- Mobile behavior may differ from desktop (document in user guide)
