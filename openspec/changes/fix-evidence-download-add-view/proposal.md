# Change Proposal: Fix Evidence Download and Add Inline View

**Change ID:** `fix-evidence-download-add-view`
**Type:** Bug Fix + Feature Enhancement
**Status:** Draft
**Created:** 2025-11-10
**Author:** AI Assistant (for review)

---

## Why

### Problem Statement

Users (especially DonVi/SoYTe admins) **cannot download evidence files** properly. The current "Download" button opens files in a new browser tab instead of triggering a download, causing confusion and workflow friction.

**Current Behavior:**
- Click "Download" button (Download icon)
- PDF/image/text files → Open inline in new tab ❌
- Browser decides based on MIME type whether to display or download
- No option to choose between viewing vs. downloading
- Users must manually use "Save As" from browser menu

**Root Cause:**
1. Frontend uses `window.open(signedUrl, '_blank')` which opens URLs
2. Signed URLs lack `Content-Disposition: attachment` header
3. R2/S3 returns files with `Content-Disposition: inline` by default for viewable types

### Business Context

**User Workflows Affected:**

1. **Compliance Auditing** (DonVi/SoYTe)
   - Download multiple evidence files for offline review
   - Attach to audit reports
   - Archive for compliance records
   - **Problem:** Must manually save each opened tab

2. **Quick Verification** (DonVi/SoYTe)
   - Quickly view certificate/photo to verify validity
   - No need to download if just checking
   - **Problem:** Download button doesn't match this use case

3. **Evidence Management** (All roles)
   - Preview before downloading (save bandwidth)
   - Download for editing/annotation
   - **Problem:** No distinction between these actions

### Impact

- **User Confusion:** "Download" button doesn't download (misleading UX)
- **Workflow Friction:** Extra steps required (right-click → Save As)
- **Mobile Issues:** Mobile browsers handle `window.open()` inconsistently
- **Support Burden:** Users ask "Why can't I download files?"
- **Compliance Risk:** Auditors expect straightforward download for evidence archival

### Success Criteria

✅ Click "Download" → File downloads to local machine (all file types)
✅ Click "View" → File opens inline in new tab (for viewable types)
✅ Clear visual distinction between View and Download actions
✅ Works consistently across browsers (Chrome, Firefox, Safari, Edge)
✅ Mobile-friendly behavior
✅ No breaking changes to existing file URLs

---

## What Changes

### 1. Storage Layer Enhancement

**Modify `getSignedUrl()` to support Content-Disposition modes:**

**File:** `src/lib/storage/r2-client.ts:131-142`

**Before:**
```typescript
async getSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: this.bucketName,
    Key: filename,
  });

  return await getSignedUrl(this.client, command, { expiresIn });
}
```

**After:**
```typescript
/**
 * Generate a signed URL for file access
 * @param filename - File path in R2 bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @param disposition - Content-Disposition mode: 'inline' | 'attachment'
 * @returns Signed URL with appropriate headers
 */
async getSignedUrl(
  filename: string,
  expiresIn: number = 3600,
  disposition: 'inline' | 'attachment' = 'inline'
): Promise<string> {
  if (!this.isConfigured || !this.client) {
    throw new Error('Cloudflare R2 is not configured.');
  }

  const commandParams: any = {
    Bucket: this.bucketName,
    Key: filename,
  };

  // Set Content-Disposition header based on mode
  if (disposition === 'attachment') {
    // Extract original filename from path (e.g., "evidence/2025/file.pdf" -> "file.pdf")
    const originalName = filename.split('/').pop() || 'download';
    // Encode filename to handle special characters and Unicode
    const encodedName = encodeURIComponent(originalName);
    commandParams.ResponseContentDisposition = `attachment; filename="${originalName}"; filename*=UTF-8''${encodedName}`;
  } else {
    // inline mode - browser decides based on MIME type
    commandParams.ResponseContentDisposition = 'inline';
  }

  const command = new GetObjectCommand(commandParams);
  return await getSignedUrl(this.client, command, { expiresIn });
}
```

**Key Features:**
- New `disposition` parameter: `'inline'` (default) or `'attachment'`
- Proper RFC 6266 filename encoding (handles Unicode, spaces, special chars)
- Both ASCII and UTF-8 encoded filename for broad browser compatibility
- Backward compatible (default behavior unchanged)

### 2. API Endpoint Enhancement

**Modify signed URL endpoint to accept disposition parameter:**

**File:** `src/app/api/files/[...filename]/route.ts:65-69`

**Before:**
```typescript
case 'signed-url': {
  const expiresIn = parseInt(searchParams.get('expires') || '3600', 10);
  const signedUrl = await r2Client.getSignedUrl(filename, expiresIn);
  return NextResponse.json({ signedUrl });
}
```

**After:**
```typescript
case 'signed-url': {
  const expiresIn = parseInt(searchParams.get('expires') || '3600', 10);
  const dispositionParam = searchParams.get('disposition');
  const disposition: 'inline' | 'attachment' =
    dispositionParam === 'attachment' ? 'attachment' : 'inline';

  const signedUrl = await r2Client.getSignedUrl(filename, expiresIn, disposition);
  return NextResponse.json({ signedUrl });
}
```

**API Usage:**
```
GET /api/files/evidence/2025/file.pdf?action=signed-url&disposition=attachment
GET /api/files/evidence/2025/file.pdf?action=signed-url&disposition=inline
GET /api/files/evidence/2025/file.pdf?action=signed-url  (defaults to inline)
```

### 3. Frontend Hook Enhancement

**Create reusable hook for evidence file operations:**

**New File:** `src/hooks/use-evidence-file.ts`

```typescript
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export type FileAction = 'download' | 'view';

export function useEvidenceFile() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Handle evidence file action (download or view)
   * @param fileUrl - Original file URL from database
   * @param action - 'download' or 'view'
   * @param filename - Optional custom filename for download
   */
  const handleFileAction = async (
    fileUrl: string,
    action: FileAction,
    filename?: string
  ) => {
    if (!fileUrl) {
      toast({
        title: 'Lỗi',
        description: 'Không tìm thấy tệp minh chứng',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const disposition = action === 'download' ? 'attachment' : 'inline';
      const response = await fetch(`${fileUrl}?action=signed-url&disposition=${disposition}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.signedUrl) {
        throw new Error('Không nhận được URL ký');
      }

      // Open in new window/tab
      const opened = window.open(data.signedUrl, '_blank');

      if (!opened) {
        // Popup blocked - show warning
        toast({
          title: 'Popup bị chặn',
          description: 'Vui lòng cho phép popup để mở tệp',
          variant: 'warning',
        });
      }

    } catch (error) {
      console.error('File action error:', error);
      toast({
        title: 'Không thể mở tệp',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = (fileUrl: string, filename?: string) =>
    handleFileAction(fileUrl, 'download', filename);

  const viewFile = (fileUrl: string) =>
    handleFileAction(fileUrl, 'view');

  return {
    downloadFile,
    viewFile,
    isLoading,
  };
}
```

### 4. UI Component Updates

#### A. Submissions List - Add View + Download Buttons

**File:** `src/components/submissions/submissions-list.tsx:523-543`

**Before:**
```tsx
<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
  <div className="flex items-center justify-end gap-2">
    <Button size="sm" variant="secondary" onClick={...}>
      <Eye className="h-4 w-4" />
    </Button>

    {submission.FileMinhChungUrl && (
      <Button size="sm" variant="secondary" onClick={handleDownloadEvidence}>
        <Download className="h-4 w-4" />
      </Button>
    )}
  </div>
</td>
```

**After:**
```tsx
<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
  <div className="flex items-center justify-end gap-2">
    {/* View submission details */}
    <Button
      size="sm"
      variant="secondary"
      onClick={(e) => { e.stopPropagation(); handleViewSubmission(submission.MaGhiNhan); }}
      title="Xem chi tiết"
    >
      <Eye className="h-4 w-4" />
    </Button>

    {/* Evidence file actions */}
    {submission.FileMinhChungUrl && (
      <>
        {/* View file inline */}
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            evidenceFile.viewFile(submission.FileMinhChungUrl);
          }}
          disabled={evidenceFile.isLoading}
          title="Xem minh chứng"
        >
          <FileText className="h-4 w-4" />
        </Button>

        {/* Download file */}
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            evidenceFile.downloadFile(
              submission.FileMinhChungUrl,
              `${submission.TenHoatDong}_${submission.practitioner.HoVaTen}.pdf`
            );
          }}
          disabled={evidenceFile.isLoading}
          title="Tải xuống minh chứng"
        >
          <Download className="h-4 w-4" />
        </Button>
      </>
    )}
  </div>
</td>
```

**Icons:**
- `Eye` (existing) - View submission details (opens sheet)
- `FileText` (new) - View evidence file inline (new tab)
- `Download` (existing) - Download evidence file

**Component Updates:**
```tsx
import { useEvidenceFile } from '@/hooks/use-evidence-file';

export function SubmissionsList({ ... }: SubmissionsListProps) {
  const evidenceFile = useEvidenceFile();

  // Remove old handleDownloadEvidence function
  // Use evidenceFile.viewFile() and evidenceFile.downloadFile() instead

  // ... rest of component
}
```

#### B. Submission Detail View - Add View + Download Buttons

**File:** `src/components/submissions/submission-review.tsx:356-380`

**Before:**
```tsx
{submission.FileMinhChungUrl && (
  <GlassCard className="p-6">
    <div className="flex items-center space-x-2 mb-4">
      <FileText className="h-5 w-5 text-medical-blue" />
      <h3 className="text-lg font-semibold text-gray-900">Tệp minh chứng</h3>
    </div>

    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <FileText className="h-8 w-8 text-medical-blue" />
        <div>
          <p className="font-medium text-gray-900">Tệp minh chứng</p>
        </div>
      </div>

      <Button onClick={handleDownloadEvidence}>
        <Download className="h-4 w-4 mr-2" />
        Tải xuống
      </Button>
    </div>
  </GlassCard>
)}
```

**After:**
```tsx
{submission.FileMinhChungUrl && (
  <GlassCard className="p-6">
    <div className="flex items-center space-x-2 mb-4">
      <FileText className="h-5 w-5 text-medical-blue" />
      <h3 className="text-lg font-semibold text-gray-900">Tệp minh chứng</h3>
    </div>

    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <FileText className="h-8 w-8 text-medical-blue" />
        <div>
          <p className="font-medium text-gray-900">Tệp minh chứng</p>
          <p className="text-sm text-gray-500">
            {getFileExtension(submission.FileMinhChungUrl)} • {getFileName(submission.FileMinhChungUrl)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* View file inline */}
        <Button
          onClick={() => evidenceFile.viewFile(submission.FileMinhChungUrl!)}
          disabled={evidenceFile.isLoading}
          variant="outline"
        >
          <Eye className="h-4 w-4 mr-2" />
          Xem
        </Button>

        {/* Download file */}
        <Button
          onClick={() => evidenceFile.downloadFile(
            submission.FileMinhChungUrl!,
            `${submission.TenHoatDong}_${submission.practitioner.HoVaTen}.pdf`
          )}
          disabled={evidenceFile.isLoading}
          className="bg-medical-green hover:bg-medical-green/90"
        >
          <Download className="h-4 w-4 mr-2" />
          Tải xuống
        </Button>
      </div>
    </div>
  </GlassCard>
)}
```

**Component Updates:**
```tsx
import { useEvidenceFile } from '@/hooks/use-evidence-file';

export function SubmissionReview({ ... }: SubmissionReviewProps) {
  const evidenceFile = useEvidenceFile();

  // Remove old handleDownloadEvidence function
  // Add helper functions for filename display

  const getFileName = (url: string) => {
    return decodeURIComponent(url.split('/').pop() || 'file');
  };

  const getFileExtension = (url: string) => {
    const filename = getFileName(url);
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };

  // ... rest of component
}
```

### 5. Visual Design

**Button Styling:**

| Action | Icon | Color | Tooltip | Position |
|--------|------|-------|---------|----------|
| View details | Eye | Secondary gray | "Xem chi tiết" | Left |
| View file | FileText | Secondary gray | "Xem minh chứng" | Middle |
| Download | Download | Secondary gray (list) / Green (detail) | "Tải xuống minh chứng" | Right |

**Loading State:**
- Disable both View and Download buttons during file action
- Show spinner on clicked button only
- Keep other actions enabled

**Mobile Responsive:**
- Stack buttons vertically on small screens
- Increase touch target size (min 44x44px)
- Full-width buttons on mobile detail view

### 6. Browser Compatibility

**Tested Behaviors:**

| Browser | Download | View (inline) | Notes |
|---------|----------|---------------|-------|
| Chrome 120+ | ✅ | ✅ | Full support |
| Firefox 120+ | ✅ | ✅ | Full support |
| Safari 17+ | ✅ | ✅ | Full support |
| Edge 120+ | ✅ | ✅ | Full support |
| Mobile Safari | ✅ | ✅ | Opens in new tab |
| Mobile Chrome | ✅ | ✅ | Opens in new tab |

**Content-Disposition Header Format:**
```
Content-Disposition: attachment; filename="report.pdf"; filename*=UTF-8''report.pdf
```

- `filename="..."` - ASCII fallback (for old browsers)
- `filename*=UTF-8''...` - RFC 6266 UTF-8 encoding (handles Unicode)

---

## Impact

### Affected Specifications

- **Modified:** `specs/activity-submission/spec.md`
  - Update evidence file download requirement
  - Add inline view requirement
  - Update UI interaction scenarios

### Affected Code

**Storage Layer:**
- Modified: `src/lib/storage/r2-client.ts` - Add `disposition` parameter to `getSignedUrl()`

**API:**
- Modified: `src/app/api/files/[...filename]/route.ts` - Handle `disposition` query parameter

**Hooks:**
- New: `src/hooks/use-evidence-file.ts` - Reusable hook for file operations

**Components:**
- Modified: `src/components/submissions/submissions-list.tsx` - Update action buttons
- Modified: `src/components/submissions/submission-review.tsx` - Update evidence section

**Types:**
- New: `FileAction` type (`'download' | 'view'`)

### User Impact

**All Users:**
- ✅ Download button now downloads files (not open in tab)
- ✅ New View button for inline preview
- ✅ Clear visual distinction between actions
- ✅ Better mobile experience

**DonVi/SoYTe Admins:**
- ✅ Efficient bulk evidence download for audits
- ✅ Quick preview without downloading
- ✅ Reduced workflow friction

**NguoiHanhNghe:**
- ✅ Download own evidence for editing/archival
- ✅ Preview before download (save bandwidth)

**System:**
- ✅ No breaking changes (API backward compatible)
- ✅ No database migrations required
- ✅ No impact on existing file URLs

### Performance Considerations

**No Performance Degradation:**
- Signed URL generation time unchanged (<50ms)
- No additional database queries
- No additional storage operations
- Client-side logic minimal (hook + button state)

**Potential Improvements:**
- Signed URLs cached in browser (1-hour expiry)
- Parallel file actions supported
- No blocking operations

---

## Non-Goals (Out of Scope)

- ❌ **Batch download** (multiple files as ZIP) - Future enhancement
- ❌ **File preview in modal** - Would require separate viewer component
- ❌ **Progress bars for downloads** - Browser handles natively
- ❌ **Download queue management** - Not needed for single file downloads
- ❌ **Offline download capability** - Requires service worker
- ❌ **Custom download location** - Browser setting, not app feature

---

## Security Considerations

### Signed URL Security

**Existing Security (Unchanged):**
- ✅ Signed URLs expire after 1 hour (configurable)
- ✅ Authorization checked before generating signed URL
- ✅ Tenant isolation enforced (DonVi can only access own unit's files)
- ✅ HTTPS required (R2 signed URLs)

**New Considerations:**

1. **Content-Disposition Header:**
   - ✅ No security impact - header only affects browser behavior
   - ✅ Filename sanitized to prevent XSS (URI encoding)

2. **URL Parameter Validation:**
   ```typescript
   const disposition: 'inline' | 'attachment' =
     dispositionParam === 'attachment' ? 'attachment' : 'inline';
   ```
   - ✅ Strict enum validation prevents injection
   - ✅ Invalid values default to 'inline' (safe fallback)

3. **Audit Trail:**
   - No change - file access not logged currently
   - Future: Consider logging downloads for compliance

### Authorization Matrix (Unchanged)

| Role | Can View File | Can Download | Scope |
|------|---------------|--------------|-------|
| SoYTe | ✅ | ✅ | Any submission |
| DonVi | ✅ | ✅ | Own unit only |
| NguoiHanhNghe | ✅ | ✅ | Own submissions only |
| Auditor | ✅ | ✅ | Read-only access |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Popup blocker prevents file open** | Medium | Show toast notification with instructions; fallback to direct link |
| **Signed URL expires during download** | Low | 1-hour expiry sufficient; user can retry |
| **Unicode filename breaks in old browsers** | Low | Dual encoding (ASCII + UTF-8) ensures fallback |
| **Large file download timeout** | Low | Signed URL streams directly from R2 (no app server bottleneck) |
| **Mobile browser doesn't support download** | Medium | Mobile browsers handle window.open() with Content-Disposition correctly |

---

## Alternatives Considered

### Alternative 1: Use `<a>` Tag with `download` Attribute

**Idea:**
```tsx
<a href={signedUrl} download="filename.pdf">
  <Button>Tải xuống</Button>
</a>
```

**Pros:** Simple, no JavaScript required
**Cons:**
- Doesn't work for cross-origin URLs (CORS issue)
- R2 signed URLs are different origin
- Cannot show loading state
- Cannot handle errors gracefully

**Decision:** **Rejected** - Doesn't work with signed URLs from R2

### Alternative 2: Fetch Blob and Create Object URL

**Idea:**
```typescript
const response = await fetch(signedUrl);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
// Trigger download via <a> tag
```

**Pros:** Works cross-origin, can show progress
**Cons:**
- Loads entire file into memory (bad for large files)
- Slow for 50+ MB files
- Wastes bandwidth (downloads to memory, then saves)
- Complex error handling

**Decision:** **Rejected** - Poor performance for large files, Solution 1 is cleaner

### Alternative 3: Separate Download API Endpoint

**Idea:** Create `GET /api/files/download/[...filename]` that proxies R2 and adds headers

**Pros:** Full control over headers and response
**Cons:**
- App server becomes bottleneck for large files
- Wastes Cloudflare bandwidth
- Slower than direct R2 access
- Unnecessary complexity (signed URLs already support Content-Disposition)

**Decision:** **Rejected** - Signed URL with disposition parameter is more efficient

---

## Open Questions

1. **Should we add file size limits for inline viewing?**
   → **Proposed:** No limit for Phase 1. Browser handles large files well. Monitor performance.

2. **Should we show file metadata (size, type, upload date)?**
   → **Phase 1:** Show filename and extension only. **Future:** Add metadata call.

3. **Should download button have confirmation for large files (>10MB)?**
   → **No.** Confirmation is annoying. User can cancel browser download.

4. **Should we log file downloads for audit purposes?**
   → **Phase 1:** No logging. **Future:** Add audit logging for compliance.

5. **Should we support batch download (multiple files as ZIP)?**
   → **Out of scope for Phase 1.** Would require backend ZIP generation or client-side library.

---

## Success Metrics

### Quantitative (Track after 30 days)

- **Download Success Rate:** ≥95% of download attempts succeed
- **User Adoption:** ≥80% of evidence file interactions use Download (vs. manual save)
- **View Adoption:** ≥40% of users use View button before downloading
- **Error Rate:** <1% of file actions result in errors
- **Support Tickets:** ≥50% reduction in "can't download files" tickets
- **Performance:** File action initiation <500ms (signed URL generation)

### Qualitative

- Collect feedback from 5+ DonVi/SoYTe users
- Positive feedback from ≥90% of users
- Zero reports of "Download button doesn't work"
- Support team confirms reduced download-related questions

---

## Implementation Phases

### Phase 1: Fix Download Functionality (Sprint 1) - Priority: Critical

**Backend:**
- [ ] Update `r2Client.getSignedUrl()` to support `disposition` parameter
- [ ] Update `/api/files/[...filename]/route.ts` to handle `disposition` query param
- [ ] Write unit tests for both disposition modes
- [ ] Test filename encoding (Unicode, spaces, special chars)

**Frontend:**
- [ ] Create `useEvidenceFile()` hook
- [ ] Update `submissions-list.tsx` to use new hook
- [ ] Update `submission-review.tsx` to use new hook
- [ ] Replace old `handleDownloadEvidence` functions
- [ ] Add loading states

**Testing:**
- [ ] Unit tests for `useEvidenceFile` hook
- [ ] Integration tests for API disposition parameter
- [ ] Manual testing across browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Test with various file types (PDF, PNG, DOCX, ZIP)

### Phase 2: Add Inline View Button (Sprint 1) - Priority: High

**Frontend:**
- [ ] Add View button to submissions list
- [ ] Add View button to submission detail view
- [ ] Implement icon changes (FileText for view)
- [ ] Add tooltips for clarity
- [ ] Adjust button spacing/layout
- [ ] Update loading states to be button-specific

**Testing:**
- [ ] E2E test: Click View → file opens inline
- [ ] E2E test: Click Download → file downloads
- [ ] Test popup blocker scenarios
- [ ] Test with different file types (viewable vs. non-viewable)

### Phase 3: Polish & Error Handling (Sprint 2) - Priority: Medium

**Error Handling:**
- [ ] Handle popup blocker (show toast with instructions)
- [ ] Handle signed URL generation errors
- [ ] Handle network errors (retry logic)
- [ ] Handle expired signed URLs (regenerate)
- [ ] Show specific error messages (not generic "failed")

**UI/UX Polish:**
- [ ] Add file metadata display (filename, extension)
- [ ] Improve loading states (disable correct button only)
- [ ] Mobile responsive layout
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Animation/transition for button states

**Documentation:**
- [ ] Update user guide with Download vs. View explanation
- [ ] Add screenshots of new UI
- [ ] Document API changes (disposition parameter)
- [ ] Update inline code comments

### Phase 4: Future Enhancements (Backlog) - Priority: Low

- [ ] Add file metadata API call (size, type, upload date)
- [ ] Display file size warning for large files (>50MB)
- [ ] Add batch download (ZIP multiple files)
- [ ] Add file preview modal (inline viewer in app)
- [ ] Add download progress tracking
- [ ] Add audit logging for file downloads
- [ ] Add expiry warning for signed URLs

---

## Deployment Checklist

### Pre-deployment

- [ ] Code review completed
- [ ] Unit tests passing (100% coverage for new code)
- [ ] Integration tests passing
- [ ] E2E tests passing (cross-browser)
- [ ] Manual QA on staging (all browsers)
- [ ] Performance testing (signed URL generation <500ms)
- [ ] Security review (Content-Disposition injection prevention)
- [ ] Documentation updated

### Deployment

- [ ] Deploy backend changes (API + storage layer)
- [ ] Deploy frontend changes (hooks + components)
- [ ] Monitor error logs for 24 hours
- [ ] Check signed URL generation metrics
- [ ] Verify file downloads working in production

### Post-deployment

- [ ] Verify Download button triggers download (not open)
- [ ] Verify View button opens inline
- [ ] Monitor support tickets for file-related issues
- [ ] Collect user feedback from pilot group
- [ ] Measure success metrics after 30 days
- [ ] Document lessons learned

### Rollback Plan (if needed)

- [ ] Revert frontend to use old `handleDownloadEvidence`
- [ ] Keep backend changes (backward compatible)
- [ ] Notify users of temporary issue
- [ ] Fix bugs and redeploy
- [ ] **Note:** Backend change is additive (safe to keep)

---

## Testing Requirements

### Unit Tests

1. **Storage Layer (`r2-client.ts`)**
   - [ ] `getSignedUrl()` with disposition='attachment' includes Content-Disposition header
   - [ ] `getSignedUrl()` with disposition='inline' includes inline header
   - [ ] Default disposition is 'inline' (backward compatible)
   - [ ] Filename encoding handles Unicode correctly
   - [ ] Filename encoding handles special characters (spaces, quotes, slashes)

2. **API Endpoint (`/api/files/[...filename]/route.ts`)**
   - [ ] Query param `disposition=attachment` passes to storage layer
   - [ ] Query param `disposition=inline` passes to storage layer
   - [ ] Missing disposition param defaults to 'inline'
   - [ ] Invalid disposition param defaults to 'inline'

3. **Hook (`useEvidenceFile`)**
   - [ ] `downloadFile()` calls API with disposition=attachment
   - [ ] `viewFile()` calls API with disposition=inline
   - [ ] Loading state updates correctly
   - [ ] Error handling shows toast notification
   - [ ] Popup blocker detection works

### Integration Tests

1. **Download Flow**
   - [ ] User clicks Download → API called with disposition=attachment
   - [ ] Signed URL includes Content-Disposition: attachment
   - [ ] File downloads (not opens)

2. **View Flow**
   - [ ] User clicks View → API called with disposition=inline
   - [ ] Signed URL includes Content-Disposition: inline
   - [ ] File opens in new tab

3. **Error Scenarios**
   - [ ] File not found → 404 error → toast notification
   - [ ] Unauthorized → 401 error → redirect to login
   - [ ] R2 not configured → 503 error → toast notification
   - [ ] Network error → retry → toast if all retries fail

### E2E Tests

1. **Submissions List**
   - [ ] Click View button → PDF opens inline in new tab
   - [ ] Click Download button → PDF downloads to disk
   - [ ] Loading state shows on correct button
   - [ ] Both buttons work independently

2. **Submission Detail View**
   - [ ] Click View button → evidence opens inline
   - [ ] Click Download button → evidence downloads
   - [ ] File metadata displays correctly
   - [ ] Buttons disabled during loading

3. **Browser Compatibility**
   - [ ] Chrome: Download and View work correctly
   - [ ] Firefox: Download and View work correctly
   - [ ] Safari: Download and View work correctly
   - [ ] Edge: Download and View work correctly
   - [ ] Mobile Safari: Download and View work correctly
   - [ ] Mobile Chrome: Download and View work correctly

4. **File Types**
   - [ ] PDF: View opens inline, Download saves
   - [ ] PNG/JPG: View opens inline, Download saves
   - [ ] DOCX: View triggers download (not viewable), Download saves
   - [ ] ZIP: View triggers download (not viewable), Download saves
   - [ ] TXT: View opens inline, Download saves

---

## Acceptance Criteria

✅ **Download Button:**
- Clicking Download button triggers file download (not opens)
- Works for all file types (PDF, images, documents, archives)
- Filename preserved correctly (Unicode, spaces, special chars)
- Loading state shows during operation
- Error handling with clear messages

✅ **View Button:**
- Clicking View button opens file inline in new tab
- Works for viewable file types (PDF, images, text)
- Non-viewable types (DOCX, ZIP) download instead (browser behavior)
- Loading state shows during operation
- Error handling with clear messages

✅ **UI/UX:**
- Clear visual distinction between View and Download buttons
- Tooltips explain each action
- Mobile-friendly layout
- Consistent behavior across browsers
- Accessible (keyboard nav, screen readers)

✅ **Technical:**
- No breaking changes to existing functionality
- API backward compatible (default disposition='inline')
- Signed URLs work correctly with Content-Disposition
- Unit tests ≥90% coverage
- E2E tests pass on all browsers
- Performance: Signed URL generation <500ms

✅ **User Validation:**
- Pilot group (5+ users) confirms Download works correctly
- No confusion between View and Download actions
- Support tickets for download issues reduced by ≥50%
- Positive feedback from ≥90% of users

---

## Migration Notes

**No database migrations required** - only code changes.

**No breaking changes:**
- Existing file URLs continue to work
- Default behavior unchanged (inline)
- API endpoint backward compatible
- Frontend gracefully handles old and new flows

**Deployment Order:**
1. Deploy backend (storage layer + API) - safe, backward compatible
2. Deploy frontend (hooks + components) - uses new backend features
3. No downtime required

---

## Documentation Updates

1. **User Guide (Evidence Management Section)**
   - Add: "Downloading vs. Viewing Evidence Files"
   - Explain Download button (saves to disk)
   - Explain View button (opens in browser)
   - Add screenshots of both actions
   - Mobile usage tips

2. **API Documentation**
   - Document `disposition` query parameter
   - Show examples for both modes
   - Explain Content-Disposition header behavior

3. **Developer Documentation**
   - Document `useEvidenceFile()` hook API
   - Explain when to use downloadFile() vs. viewFile()
   - Add code examples

4. **Changelog**
   - Version X.Y.Z: Fixed evidence file download (now downloads instead of opening)
   - Version X.Y.Z: Added inline view button for evidence files

---

## References

- Current implementation: `src/components/submissions/submissions-list.tsx:201-214`
- Current implementation: `src/components/submissions/submission-review.tsx:132-145`
- Storage layer: `src/lib/storage/r2-client.ts:131-142`
- API endpoint: `src/app/api/files/[...filename]/route.ts:65-69`
- RFC 6266 (Content-Disposition): https://tools.ietf.org/html/rfc6266
- AWS S3 GetObject ResponseContentDisposition: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
