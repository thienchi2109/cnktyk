# activity-submission Specification Delta

## MODIFIED Requirements

### Requirement: Evidence File Access (MODIFIED)
Users SHALL be able to both view evidence files inline and download them to local storage, with clear UI distinction between these actions.

**Change Summary:**
- **Before:** Single "Download" button that opens files in new tab (incorrect behavior)
- **After:** Separate "View" and "Download" buttons with correct Content-Disposition headers

#### Scenario: Download button triggers file download (FIXED)
- **WHEN** a user clicks the "Tải xuống" (Download) button on an evidence file
- **THEN** the file is downloaded to the user's local machine with the original filename
- **AND** the file does NOT open in a new browser tab

#### Scenario: View button opens file inline (NEW)
- **WHEN** a user clicks the "Xem" (View) button on an evidence file
- **THEN** the file opens inline in a new browser tab for preview
- **AND** the file is NOT automatically downloaded

#### Scenario: Download works for all file types
- **WHEN** a user downloads a PDF, image, document, or archive file
- **THEN** the browser's download dialog appears with the correct filename
- **AND** the file is saved to the user's default download location

#### Scenario: View works for viewable file types
- **WHEN** a user views a PDF, image, or text file
- **THEN** the file displays inline in a new tab
- **AND** the user can interact with it (zoom, scroll, etc.)

#### Scenario: View fallback for non-viewable types
- **WHEN** a user views a non-viewable file type (e.g., DOCX, ZIP)
- **THEN** the browser downloads the file instead (native browser behavior)
- **AND** no error is shown (expected behavior)

#### Scenario: Unicode filename preservation
- **WHEN** a file has a filename with Unicode characters (e.g., "Báo cáo.pdf", "報告.pdf")
- **THEN** the downloaded file retains the original filename correctly
- **AND** no character corruption occurs

#### Scenario: Special character filename handling
- **WHEN** a file has a filename with spaces, quotes, or special characters
- **THEN** the filename is properly encoded in the Content-Disposition header
- **AND** the browser receives and displays the filename correctly

#### Scenario: Loading state during file action
- **WHEN** a user clicks View or Download and the signed URL is being generated
- **THEN** the clicked button shows a loading spinner and is disabled
- **AND** the other button remains enabled (user can cancel and try other action)

#### Scenario: Error handling for file access failure
- **WHEN** file access fails (file not found, permission denied, network error)
- **THEN** a toast notification appears with a specific error message
- **AND** the loading state clears
- **AND** the user can retry the action

#### Scenario: Popup blocker detection
- **WHEN** a user's browser blocks the popup for View or Download
- **THEN** a toast notification appears: "Popup bị chặn - Vui lòng cho phép popup để mở tệp"
- **AND** the user can manually allow popups and retry

---

## ADDED Requirements

### Requirement: File Action Hook (useEvidenceFile)
The system SHALL provide a reusable hook for evidence file operations (view, download) with consistent error handling and loading states.

#### Scenario: Hook initialization
- **WHEN** a component mounts and calls `useEvidenceFile()`
- **THEN** the hook returns `{ downloadFile, viewFile, isLoading }` functions and state

#### Scenario: Download file action
- **WHEN** a component calls `downloadFile(fileUrl, optionalFilename)`
- **THEN** the hook fetches a signed URL with disposition='attachment'
- **AND** opens the URL in a new window/tab
- **AND** updates `isLoading` state during the operation

#### Scenario: View file action
- **WHEN** a component calls `viewFile(fileUrl)`
- **THEN** the hook fetches a signed URL with disposition='inline'
- **AND** opens the URL in a new window/tab
- **AND** updates `isLoading` state during the operation

#### Scenario: Error handling in hook
- **WHEN** file access fails (API error, network error, etc.)
- **THEN** the hook displays a toast notification with the error message
- **AND** sets `isLoading` to false
- **AND** logs the error to console for debugging

#### Scenario: Concurrent actions prevented
- **WHEN** a file action is in progress (`isLoading === true`)
- **THEN** both View and Download buttons are disabled
- **UNTIL** the operation completes (success or error)

### Requirement: Submissions List Evidence Actions
The submissions list SHALL display separate View and Download buttons for evidence files with clear visual distinction.

#### Scenario: Action buttons visibility in submissions list
- **WHEN** a submission row has FileMinhChungUrl (evidence file exists)
- **THEN** three action buttons are visible: View details (Eye), View file (FileText), Download (Download)

#### Scenario: Action buttons hidden when no evidence
- **WHEN** a submission row has FileMinhChungUrl === null
- **THEN** only the View details button (Eye icon) is visible
- **AND** file action buttons (FileText, Download) are hidden

#### Scenario: Button tooltips in submissions list
- **WHEN** a user hovers over action buttons
- **THEN** tooltips appear:
  - Eye: "Xem chi tiết"
  - FileText: "Xem minh chứng"
  - Download: "Tải xuống minh chứng"

#### Scenario: Button click does not trigger row click
- **WHEN** a user clicks View file or Download button in a row
- **THEN** the file action occurs
- **AND** the submission detail sheet does NOT open (event propagation stopped)

#### Scenario: Loading state in submissions list
- **WHEN** a file action is in progress for a specific row
- **THEN** both file action buttons in that row are disabled
- **AND** buttons in other rows remain enabled

### Requirement: Submission Detail Evidence Section
The submission detail view SHALL display file metadata and provide View + Download buttons with enhanced visual hierarchy.

#### Scenario: Evidence section displays file metadata
- **WHEN** a submission detail view loads with FileMinhChungUrl
- **THEN** the evidence section displays:
  - File extension badge (e.g., "PDF", "PNG", "DOCX")
  - Original filename (decoded from URL)
  - Two action buttons: View and Download

#### Scenario: View button styling in detail view
- **WHEN** the evidence section renders
- **THEN** the View button has:
  - Eye icon
  - "Xem" text label
  - Outline variant (secondary styling)
  - Positioned left of Download button

#### Scenario: Download button styling in detail view
- **WHEN** the evidence section renders
- **THEN** the Download button has:
  - Download icon
  - "Tải xuống" text label
  - Medical green background (primary action)
  - Positioned right of View button

#### Scenario: Filename display in detail view
- **WHEN** the evidence section renders
- **THEN** the filename is extracted from FileMinhChungUrl
- **AND** displayed as: "[EXT] • [filename]" (e.g., "PDF • BaoCao.pdf")
- **AND** long filenames are truncated with ellipsis

#### Scenario: Loading state in detail view
- **WHEN** a file action is in progress in the detail view
- **THEN** both View and Download buttons are disabled
- **AND** a loading spinner appears on the clicked button only

### Requirement: Content-Disposition Header Support
The storage layer SHALL support both inline and attachment Content-Disposition modes for signed URLs.

#### Scenario: Generate signed URL with attachment disposition
- **WHEN** the API receives `disposition=attachment` query parameter
- **THEN** `r2Client.getSignedUrl(filename, expiresIn, 'attachment')` is called
- **AND** the signed URL includes: `ResponseContentDisposition: attachment; filename="..."; filename*=UTF-8''...`

#### Scenario: Generate signed URL with inline disposition
- **WHEN** the API receives `disposition=inline` query parameter
- **THEN** `r2Client.getSignedUrl(filename, expiresIn, 'inline')` is called
- **AND** the signed URL includes: `ResponseContentDisposition: inline`

#### Scenario: Default disposition is inline
- **WHEN** the API receives no `disposition` query parameter
- **THEN** the signed URL defaults to `disposition=inline`
- **AND** backward compatibility is maintained with existing code

#### Scenario: Invalid disposition parameter handling
- **WHEN** the API receives an invalid `disposition` value (e.g., "foo")
- **THEN** the system defaults to `disposition=inline`
- **AND** no error is thrown (safe fallback)

#### Scenario: Filename encoding in Content-Disposition
- **WHEN** a filename contains Unicode, spaces, or special characters
- **THEN** the Content-Disposition header includes:
  - `filename="[ASCII-safe]"` (fallback for old browsers)
  - `filename*=UTF-8''[percent-encoded]` (RFC 6266 standard)
- **AND** both modern and legacy browsers display the filename correctly

### Requirement: API Endpoint Enhancement
The file access API SHALL accept a `disposition` query parameter to control Content-Disposition header behavior.

#### Scenario: API accepts disposition query parameter
- **WHEN** a request is made to `GET /api/files/[...filename]?action=signed-url&disposition=attachment`
- **THEN** the API validates the disposition parameter
- **AND** passes it to the storage layer
- **AND** returns a signed URL with the appropriate Content-Disposition header

#### Scenario: API validates disposition parameter
- **WHEN** the disposition parameter is "attachment" or "inline"
- **THEN** the value is used as-is
- **WHEN** the disposition parameter is missing, empty, or invalid
- **THEN** the API defaults to "inline"

#### Scenario: API response includes signed URL
- **WHEN** the signed URL is generated successfully
- **THEN** the API returns `{ signedUrl: "https://..." }`
- **AND** the URL is ready for immediate use (no additional processing needed)

#### Scenario: API error handling
- **WHEN** signed URL generation fails (R2 not configured, file not found, etc.)
- **THEN** the API returns appropriate HTTP status:
  - 404: File not found
  - 401: Unauthorized
  - 503: R2 not configured
  - 500: Internal server error
- **AND** includes error message in response body

### Requirement: Browser Compatibility
File download and view actions SHALL work consistently across all major browsers and mobile platforms.

#### Scenario: Chrome desktop download behavior
- **WHEN** a user clicks Download in Chrome desktop
- **THEN** the file downloads directly (no prompt if setting allows)
- **OR** Chrome's download bar appears at bottom
- **AND** filename is preserved correctly

#### Scenario: Firefox desktop download behavior
- **WHEN** a user clicks Download in Firefox desktop
- **THEN** Firefox download dialog appears (or direct download based on settings)
- **AND** filename is preserved correctly with Unicode support

#### Scenario: Safari desktop download behavior
- **WHEN** a user clicks Download in Safari desktop
- **THEN** the file downloads to default location or prompts for location
- **AND** filename is preserved correctly

#### Scenario: Mobile Safari behavior
- **WHEN** a user clicks Download or View on iOS Safari
- **THEN** the file opens in a new tab
- **AND** the user can use Share → Save to Files for download
- **AND** View opens inline for viewable types

#### Scenario: Mobile Chrome behavior
- **WHEN** a user clicks Download or View on Android Chrome
- **THEN** the file downloads or opens based on Content-Disposition
- **AND** notification shows download progress
- **AND** filename is preserved correctly

#### Scenario: Content-Disposition header compatibility
- **WHEN** a signed URL with Content-Disposition is accessed
- **THEN** all browsers (Chrome 120+, Firefox 120+, Safari 17+, Edge 120+) respect the header
- **AND** download/inline behavior works as specified

### Requirement: Error Handling and User Feedback
File operations SHALL provide clear, actionable error messages and handle edge cases gracefully.

#### Scenario: File not found error
- **WHEN** a file URL points to a non-existent file (404)
- **THEN** a toast notification appears: "Không tìm thấy tệp minh chứng"
- **AND** the operation is aborted

#### Scenario: Permission denied error
- **WHEN** a user lacks permission to access a file (403)
- **THEN** a toast notification appears: "Bạn không có quyền truy cập tệp này"
- **AND** the operation is aborted

#### Scenario: Network error handling
- **WHEN** network request fails (timeout, connection lost)
- **THEN** a toast notification appears: "Lỗi kết nối. Vui lòng thử lại."
- **AND** the error is logged to console
- **AND** the user can retry manually

#### Scenario: R2 not configured error
- **WHEN** R2 storage is not configured (503)
- **THEN** a toast notification appears: "Hệ thống lưu trữ tệp chưa được cấu hình"
- **AND** the operation is aborted

#### Scenario: Generic error fallback
- **WHEN** an unexpected error occurs
- **THEN** a toast notification appears: "Không thể mở tệp. Vui lòng thử lại sau."
- **AND** the error is logged with full details to console

#### Scenario: Popup blocker toast notification
- **WHEN** `window.open()` returns null (popup blocked)
- **THEN** a toast notification appears: "Popup bị chặn. Vui lòng cho phép popup để mở tệp"
- **AND** the operation is considered failed (isLoading = false)

#### Scenario: Retry mechanism
- **WHEN** a file operation fails due to transient error
- **THEN** the user can click the button again to retry
- **AND** no manual page refresh is required
- **AND** state is properly reset between attempts

### Requirement: Performance and Optimization
File operations SHALL complete within acceptable performance thresholds and optimize for user experience.

#### Scenario: Signed URL generation performance
- **WHEN** a signed URL is requested from the API
- **THEN** the operation completes within 500ms (p95)
- **AND** within 200ms for cached scenarios

#### Scenario: No blocking operations
- **WHEN** a user initiates a file action
- **THEN** the UI remains responsive
- **AND** other actions (navigate, scroll, edit) are not blocked
- **AND** only the specific file buttons are disabled

#### Scenario: Parallel file actions
- **WHEN** a user clicks Download on Row A and View on Row B concurrently
- **THEN** both operations proceed independently
- **AND** loading states are scoped per row/component
- **AND** no race conditions occur

#### Scenario: Signed URL caching
- **WHEN** a signed URL is generated
- **THEN** the URL is valid for 1 hour (3600 seconds)
- **AND** browser can cache the URL during this period
- **AND** subsequent accesses within 1 hour do not regenerate

#### Scenario: Memory efficiency for large files
- **WHEN** a user downloads a large file (50MB+)
- **THEN** the file streams directly from R2 to browser
- **AND** no intermediate buffering occurs in the app server
- **AND** memory usage remains constant regardless of file size

---

## REMOVED Requirements

None. This proposal only modifies existing behavior and adds new functionality without removing features.

---

## Implementation Details

### Frontend Component Changes

**submissions-list.tsx:**
```tsx
// OLD (lines 201-214)
const handleDownloadEvidence = async (submission: Submission) => {
  const response = await fetch(`${submission.FileMinhChungUrl}?action=signed-url`);
  const data = await response.json();
  if (data.signedUrl) {
    window.open(data.signedUrl, '_blank'); // ❌ Opens in tab
  }
};

// NEW
import { useEvidenceFile } from '@/hooks/use-evidence-file';

export function SubmissionsList({ ... }) {
  const evidenceFile = useEvidenceFile();

  // Remove old handleDownloadEvidence function

  // In JSX:
  <GlassButton onClick={() => evidenceFile.viewFile(submission.FileMinhChungUrl)}>
    <FileText className="h-4 w-4" />
  </GlassButton>

  <GlassButton onClick={() => evidenceFile.downloadFile(submission.FileMinhChungUrl)}>
    <Download className="h-4 w-4" />
  </GlassButton>
}
```

**submission-review.tsx:**
```tsx
// Similar changes as submissions-list.tsx
// Replace handleDownloadEvidence with useEvidenceFile hook
```

### Backend Changes

**r2-client.ts:**
```typescript
// OLD (lines 131-142)
async getSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: this.bucketName,
    Key: filename,
  });
  return await getSignedUrl(this.client, command, { expiresIn });
}

// NEW
async getSignedUrl(
  filename: string,
  expiresIn: number = 3600,
  disposition: 'inline' | 'attachment' = 'inline'
): Promise<string> {
  const commandParams: any = {
    Bucket: this.bucketName,
    Key: filename,
  };

  if (disposition === 'attachment') {
    const originalName = filename.split('/').pop() || 'download';
    const encodedName = encodeURIComponent(originalName);
    commandParams.ResponseContentDisposition =
      `attachment; filename="${originalName}"; filename*=UTF-8''${encodedName}`;
  } else {
    commandParams.ResponseContentDisposition = 'inline';
  }

  const command = new GetObjectCommand(commandParams);
  return await getSignedUrl(this.client, command, { expiresIn });
}
```

**API route.ts:**
```typescript
// OLD (lines 65-69)
case 'signed-url': {
  const expiresIn = parseInt(searchParams.get('expires') || '3600', 10);
  const signedUrl = await r2Client.getSignedUrl(filename, expiresIn);
  return NextResponse.json({ signedUrl });
}

// NEW
case 'signed-url': {
  const expiresIn = parseInt(searchParams.get('expires') || '3600', 10);
  const dispositionParam = searchParams.get('disposition');
  const disposition: 'inline' | 'attachment' =
    dispositionParam === 'attachment' ? 'attachment' : 'inline';
  const signedUrl = await r2Client.getSignedUrl(filename, expiresIn, disposition);
  return NextResponse.json({ signedUrl });
}
```

---

## Testing Requirements

### Unit Tests

1. **Storage Layer Tests**
   - [ ] `getSignedUrl()` with disposition='attachment' includes proper Content-Disposition
   - [ ] `getSignedUrl()` with disposition='inline' includes inline header
   - [ ] Default disposition is 'inline'
   - [ ] Filename with Unicode encoded correctly
   - [ ] Filename with spaces encoded correctly
   - [ ] Filename with quotes encoded correctly

2. **API Tests**
   - [ ] `disposition=attachment` query param works
   - [ ] `disposition=inline` query param works
   - [ ] Missing disposition defaults to 'inline'
   - [ ] Invalid disposition defaults to 'inline'
   - [ ] Signed URL response format correct

3. **Hook Tests**
   - [ ] `downloadFile()` calls API with disposition=attachment
   - [ ] `viewFile()` calls API with disposition=inline
   - [ ] isLoading state updates correctly
   - [ ] Error toast appears on failure
   - [ ] Popup blocker detection works

### Integration Tests

1. **Download Flow**
   - [ ] Click Download → API called with disposition=attachment
   - [ ] Signed URL has Content-Disposition: attachment
   - [ ] File downloads (manual verification needed)

2. **View Flow**
   - [ ] Click View → API called with disposition=inline
   - [ ] Signed URL has Content-Disposition: inline
   - [ ] File opens in new tab (manual verification needed)

3. **Error Handling**
   - [ ] File not found → 404 → toast shown
   - [ ] Permission denied → 403 → toast shown
   - [ ] Network error → retry → toast shown
   - [ ] R2 not configured → 503 → toast shown

### E2E Tests

1. **Submissions List**
   - [ ] View button opens PDF inline
   - [ ] Download button downloads PDF
   - [ ] Loading state shows on correct button
   - [ ] Error handling works

2. **Submission Detail**
   - [ ] View button opens evidence inline
   - [ ] Download button downloads evidence
   - [ ] File metadata displays
   - [ ] Buttons work independently

3. **Cross-Browser Testing**
   - [ ] Chrome: Download and View work
   - [ ] Firefox: Download and View work
   - [ ] Safari: Download and View work
   - [ ] Edge: Download and View work
   - [ ] Mobile Safari: Both work (with browser limitations)
   - [ ] Mobile Chrome: Both work

4. **File Type Testing**
   - [ ] PDF: View inline, Download saves
   - [ ] PNG: View inline, Download saves
   - [ ] DOCX: View downloads, Download saves
   - [ ] ZIP: View downloads, Download saves
   - [ ] Unicode filename: Download preserves name

---

## Migration Notes

**No database migrations required.**

**Backward Compatibility:**
- ✅ Existing code calling `getSignedUrl(filename, expiresIn)` works unchanged (default disposition='inline')
- ✅ Existing file URLs work unchanged
- ✅ API endpoint backward compatible (disposition parameter optional)

**Deployment Order:**
1. Deploy backend (storage layer + API endpoint) - safe, no breaking changes
2. Deploy frontend (hook + components) - uses new backend features
3. No rollback needed unless bugs discovered

---

## Acceptance Criteria

✅ **Download Functionality:**
- Download button triggers file download to disk (not open)
- Works for all file types (PDF, images, documents, archives)
- Filename preserved with Unicode and special characters
- Works across all major browsers

✅ **View Functionality:**
- View button opens file inline in new tab
- Works for viewable types (PDF, images, text)
- Non-viewable types download (expected browser behavior)
- Works across all major browsers

✅ **UI/UX:**
- Clear visual distinction between View and Download buttons
- Tooltips explain each action
- Loading states scoped per button
- Error messages are specific and actionable
- Mobile-friendly layout

✅ **Technical:**
- Content-Disposition header correct for both modes
- Signed URLs include proper filename encoding
- API backward compatible
- Unit tests ≥95% coverage for new code
- E2E tests pass on all browsers
- Performance: Signed URL generation <500ms

✅ **User Validation:**
- Support tickets for "can't download" reduced by ≥50%
- User feedback confirms both buttons work correctly
- No confusion between View and Download actions
- Pilot group (5+ users) validates both flows

---

## Rollback Plan

**If bugs are discovered after deployment:**

1. **Frontend rollback (low risk):**
   - Revert to old `handleDownloadEvidence` function
   - Remove View button (keep Download only)
   - Use old API call (without disposition parameter)

2. **Backend rollback (very low risk):**
   - Backend changes are additive and backward compatible
   - No rollback needed unless critical bug in `getSignedUrl()`
   - If needed: revert `r2-client.ts` and `route.ts` changes

3. **Communication:**
   - Notify users of temporary issue
   - Provide workaround (right-click → Save As)
   - Fix bugs and redeploy within 24 hours

**Rollback is unlikely because:**
- Backend changes are safe (additive, optional parameter)
- Frontend changes are isolated (hook + components)
- No database changes
- Extensive testing before deployment
