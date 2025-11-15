# Design Document: Evidence Backup and Cleanup

**Change ID:** `add-evidence-backup-and-cleanup`  
**Version:** 1.0  
**Last Updated:** 2025-10-31

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SoYTe Admin User                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│           Backup Center UI (React Client)                   │
│  • Date Range Picker                                        │
│  • Download Backup Button                                   │
│  • Delete Files Button (Post-backup)                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ POST /api/backup/│   │ POST /api/backup/│
│ evidence-files   │   │ delete-archived  │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         │                      │
    ┌────▼──────────────────────▼────┐
    │     Database Query Layer       │
    │  • Fetch files by date range   │
    │  • Update deletion status      │
    │  • Audit logging               │
    └────┬──────────────────────┬────┘
         │                      │
    ┌────▼─────┐          ┌────▼─────┐
    │ R2 Store │          │ R2 Store │
    │ Download │          │ Delete   │
    └────┬─────┘          └────┬─────┘
         │                      │
    ┌────▼─────┐          ┌────▼─────┐
    │   ZIP    │          │   Free   │
    │ Creation │          │  Space   │
    └────┬─────┘          └──────────┘
         │
         ▼
    ┌─────────┐
    │Download │
    │ to User │
    └─────────┘
```

---

## API Specifications

### 1. Backup API: `POST /api/backup/evidence-files`

#### Request Body
```typescript
{
  startDate: string;  // ISO 8601 date string
  endDate: string;    // ISO 8601 date string
}
```

#### Validation Rules
- Both dates required
- `startDate` must be before `endDate`
- Date range cannot exceed 1 year (365 days)
- `endDate` cannot be in the future
- Dates must be valid ISO 8601 format

#### Response
**Success (200):**
```
Content-Type: application/zip
Content-Disposition: attachment; filename="CNKTYKLT_Backup_2025-01-01_to_2025-06-30.zip"
Body: Binary ZIP file
```

**Errors:**
```typescript
// 400 Bad Request
{ error: "Start date and end date are required" }
{ error: "Start date must be before end date" }
{ error: "Date range cannot exceed 1 year" }

// 403 Forbidden
{ error: "Access denied. SoYTe role required." }

// 404 Not Found
{ error: "No evidence files found in the specified date range" }

// 500 Internal Server Error
{ error: "Error creating backup archive" }
{ error: "Internal server error" }
```

#### Database Query
```sql
SELECT 
  g."MaGhiNhan",
  g."FileMinhChungUrl",
  g."TenHoatDong",
  g."NgayGhiNhan",
  n."HoVaTen" AS practitioner_HoVaTen,
  n."SoCCHN" AS practitioner_SoCCHN
FROM "GhiNhanHoatDong" g
INNER JOIN "NhanVien" n ON n."MaNhanVien" = g."MaNhanVien"
WHERE g."FileMinhChungUrl" IS NOT NULL
  AND g."NgayGhiNhan" >= $1  -- startDate
  AND g."NgayGhiNhan" <= $2  -- endDate
  AND g."TrangThaiDuyet" = 'DaDuyet'  -- Only approved submissions
ORDER BY g."NgayGhiNhan" DESC
```

#### Processing Flow
1. **Validate request** (role check, date validation)
2. **Query database** (fetch files in date range)
3. **Create ZIP archive** (using archiver)
   - For each file:
     - Extract R2 filename from URL
     - Download from R2 (with retry logic)
     - Add to ZIP with organized path: `{CCHN}_{Name}/{Date}_{Activity}_{Filename}`
   - Add manifest.json with metadata
4. **Stream response** (return ZIP to client)
5. **Log audit trail** (backup operation)

#### Audit Log Entry
```typescript
{
  MaTaiKhoan: user.id,
  HanhDong: 'BACKUP_EVIDENCE_FILES',
  ChiTiet: `Backup evidence files from ${startDate} to ${endDate}. Total files: ${count}`,
  IPAddress: request.headers['x-forwarded-for'] || 'unknown',
  NgayGhiNhan: new Date(),
}
```

---

### 2. Delete API: `POST /api/backup/delete-archived`

#### Request Body
```typescript
{
  startDate: string;      // ISO 8601 date string
  endDate: string;        // ISO 8601 date string
  confirmationToken: string;  // Must be "DELETE" (safety check)
}
```

#### Validation Rules
- All fields required
- `confirmationToken` must exactly match "DELETE"
- Date range must match a previous backup operation (optional check)
- Date range validation same as backup API
- Maximum 5000 files per deletion operation

#### Response
**Success (200):**
```typescript
{
  success: true,
  deletedCount: number;      // Files successfully deleted
  failedCount: number;       // Files that failed to delete
  spaceFreeeMB: number;      // Storage space freed (approximate)
  message: string;           // Human-readable summary
}
```

**Errors:**
```typescript
// 400 Bad Request
{ error: "Confirmation token required. Type DELETE to confirm." }
{ error: "Invalid confirmation token" }
{ error: "Date range cannot exceed 1 year" }
{ error: "Cannot delete more than 5000 files at once" }

// 403 Forbidden
{ error: "Access denied. SoYTe role required." }

// 404 Not Found
{ error: "No files found in the specified date range" }

// 500 Internal Server Error
{ error: "Deletion failed. Please try again." }
```

#### Database Query (Find Files)
```sql
SELECT 
  g."MaGhiNhan",
  g."FileMinhChungUrl",
  g."FileMinhChungSize"
FROM "GhiNhanHoatDong" g
WHERE g."FileMinhChungUrl" IS NOT NULL
  AND g."NgayGhiNhan" >= $1
  AND g."NgayGhiNhan" <= $2
  AND g."TrangThaiDuyet" = 'DaDuyet'
ORDER BY g."NgayGhiNhan" DESC
```

#### Processing Flow
1. **Validate request** (role check, confirmation token, date range)
2. **Query database** (fetch files to delete)
3. **Delete from R2** (batch delete with error handling)
   - For each file:
     - Extract R2 filename
     - Call r2Client.deleteFile(filename)
     - Track success/failure
4. **Update database** (set FileMinhChungUrl to NULL or mark as deleted)
5. **Log audit trail** (deletion operation with counts)
6. **Return summary** (success/failed counts, space freed)

#### Database Update (After Deletion)
```sql
-- Option 1: Set URL to NULL (keep record)
UPDATE "GhiNhanHoatDong"
SET "FileMinhChungUrl" = NULL,
    "FileMinhChungETag" = NULL,
    "FileMinhChungSha256" = NULL,
    "FileMinhChungSize" = NULL
WHERE "MaGhiNhan" = ANY($1::uuid[]);  -- Array of IDs

-- Option 2: Add deletion tracking field (if schema updated)
UPDATE "GhiNhanHoatDong"
SET "FileMinhChungUrl" = NULL,
    "FileMinhChungDeletedAt" = NOW(),
    "FileMinhChungDeletedBy" = $2
WHERE "MaGhiNhan" = ANY($1::uuid[]);
```

#### Audit Log Entry
```typescript
{
  MaTaiKhoan: user.id,
  HanhDong: 'DELETE_ARCHIVED_FILES',
  ChiTiet: `Deleted ${deletedCount} files from ${startDate} to ${endDate}. Failed: ${failedCount}. Space freed: ${spaceMB} MB`,
  IPAddress: request.headers['x-forwarded-for'] || 'unknown',
  NgayGhiNhan: new Date(),
}
```

---

## ZIP File Structure

### Directory Layout
```
CNKTYKLT_Backup_2025-01-01_to_2025-06-30.zip
│
├── BACKUP_MANIFEST.json
│
├── BS12345_Nguyen_Van_A/
│   ├── 2025-01-15_Hoi_thao_Y_khoa_uuid-abc123.pdf
│   ├── 2025-03-20_Khoa_hoc_Dieu_duong_uuid-def456.pdf
│   └── 2025-05-10_Nghien_cuu_Lam_sang_uuid-ghi789.pdf
│
├── BS67890_Tran_Thi_B/
│   ├── 2025-02-10_Hoi_thao_uuid-jkl012.pdf
│   └── 2025-04-15_Khoa_hoc_uuid-mno345.pdf
│
└── ...
```

### Filename Convention
```
{Date}_{ActivityName}_{R2Filename}

Where:
- Date: YYYY-MM-DD (from NgayGhiNhan)
- ActivityName: Sanitized activity name (spaces → underscores, max 50 chars)
- R2Filename: Original R2 filename (preserves UUID for uniqueness)
```

### Manifest Schema
```typescript
// BACKUP_MANIFEST.json
{
  "backupDate": "2025-10-31T14:30:00.000Z",
  "dateRange": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-06-30T23:59:59.999Z"
  },
  "totalFiles": 150,
  "addedFiles": 148,
  "skippedFiles": 2,
  "backupBy": "admin_soyте",
  "files": [
    {
      "submissionId": "uuid-abc-123",
      "activityName": "Hội thảo Y khoa",
      "practitioner": "Nguyễn Văn A",
      "cchn": "BS12345",
      "date": "2025-01-15T10:00:00.000Z",
      "fileUrl": "https://r2.example.com/files/uuid-abc123.pdf"
    },
    // ... more files
  ]
}
```

---

## Database Schema Changes (Optional)

### Option A: No Schema Changes (Recommended for v1)
- Use existing `GhiNhanHoatDong` table
- Track backups only in audit log (`NhatKyHeThong`)
- Set `FileMinhChungUrl` to NULL after deletion
- **Pros:** No migration needed, simpler implementation
- **Cons:** No explicit backup tracking, harder to query backup history

### Option B: Add Backup Tracking Fields
```sql
ALTER TABLE "GhiNhanHoatDong"
  ADD COLUMN "FileMinhChungBackedUpAt" TIMESTAMP NULL,
  ADD COLUMN "FileMinhChungBackedUpBy" UUID NULL REFERENCES "TaiKhoan"("MaTaiKhoan"),
  ADD COLUMN "FileMinhChungDeletedAt" TIMESTAMP NULL,
  ADD COLUMN "FileMinhChungDeletedBy" UUID NULL REFERENCES "TaiKhoan"("MaTaiKhoan");

-- Index for querying backed-up files
CREATE INDEX idx_file_backup_status 
  ON "GhiNhanHoatDong"("FileMinhChungBackedUpAt", "FileMinhChungDeletedAt")
  WHERE "FileMinhChungUrl" IS NOT NULL;
```

**Pros:** Explicit tracking, easier queries, prevents accidental deletion
**Cons:** Migration required, additional fields to maintain

**Recommendation:** Start with Option A, add Option B if needed based on usage patterns.

---

## Security & Safety Mechanisms

### Access Control
```typescript
// Multi-layer protection
1. Middleware: Route protection at /so-y-te/backup
2. Page: Role check in React component (redirect if not SoYTe)
3. API: Role validation in both endpoints (403 if not SoYTe)
```

### Confirmation Flow for Deletion
```typescript
// UI Confirmation Steps
Step 1: Click "Delete Files" button
  → Shows dialog with file count and date range

Step 2: Type "DELETE" in input field
  → Enables final confirmation button

Step 3: Click "Confirm Deletion"
  → Shows final warning with 5-second countdown
  → Sends API request

// Backend Validation
- Verify confirmationToken === "DELETE"
- Verify role === "SoYTe"
- Verify file count < 5000
- Log operation to audit trail
```

### Error Handling
```typescript
// R2 Download Failures
- Retry up to 3 times with exponential backoff
- Skip failed files (don't halt entire backup)
- Include skipped files in manifest
- Log warnings for failed downloads

// R2 Delete Failures
- Continue with remaining files if one fails
- Track failed deletions
- Return summary with success/failure counts
- Do not update database for failed deletions
```

### Audit Trail
```typescript
// All operations logged to NhatKyHeThong
- Backup: Who, when, date range, file count
- Deletion: Who, when, date range, deleted count, failed count
- Queryable for compliance audits
```

---

## Performance Considerations

### Backup Performance
```typescript
// Target: 1000 files in < 3 minutes
Optimizations:
1. Parallel R2 downloads (5-10 concurrent)
2. Stream ZIP directly to response (no disk writes)
3. Set maxDuration = 300 seconds
4. Skip failed files (don't block on errors)

// Memory Management
- Stream files through archiver (don't load all in memory)
- Use chunks for R2 downloads
- Limit concurrent downloads to prevent memory exhaustion
```

### Deletion Performance
```typescript
// Target: 1000 files in < 1 minute
Optimizations:
1. Batch R2 delete operations (10 files per batch)
2. Parallel deletion within batches
3. Use database transaction for safety
4. Update database in bulk (single UPDATE with array)

// Safety Limits
- Maximum 5000 files per operation
- Recommend multiple operations for larger ranges
```

### Database Query Optimization
```sql
-- Ensure index exists for date range queries
CREATE INDEX IF NOT EXISTS idx_ghinhan_ngayghinhan_trangthai
  ON "GhiNhanHoatDong"("NgayGhiNhan", "TrangThaiDuyet")
  WHERE "FileMinhChungUrl" IS NOT NULL;
```

---

## Error Scenarios & Handling

| Error Scenario | Detection | Handling | User Impact |
|---------------|-----------|----------|-------------|
| R2 unavailable | API call fails | Retry 3x, then skip file | Partial backup with warning |
| Network timeout | Request timeout | Retry with backoff | Temporary delay |
| Memory exhaustion | Process crash | Reduce concurrent downloads | Recommend smaller date range |
| Invalid date range | Validation check | Return 400 error | Clear error message |
| No files found | Empty query result | Return 404 error | Inform user no files in range |
| Unauthorized access | Role check | Return 403 error | Redirect to dashboard |
| R2 delete fails | API call fails | Continue with next file | Report failed count |
| Database update fails | SQL error | Rollback transaction | Retry or manual fix |

---

## Testing Strategy

### Unit Tests
- [ ] Date validation logic
- [ ] Confirmation token validation
- [ ] R2 filename extraction
- [ ] ZIP path generation
- [ ] Error handling functions

### Integration Tests
- [ ] Backup API with mocked R2
- [ ] Delete API with mocked R2
- [ ] Database query correctness
- [ ] Audit log creation

### End-to-End Tests
- [ ] Full backup flow (small dataset)
- [ ] Full deletion flow (small dataset)
- [ ] Error scenarios (R2 unavailable)
- [ ] Access control (non-SoYTe user)
- [ ] ZIP file integrity

### Performance Tests
- [ ] Backup 100 files
- [ ] Backup 1000 files
- [ ] Backup 2000 files (stress test)
- [ ] Delete 100 files
- [ ] Delete 1000 files

### Manual Tests
- [ ] Download ZIP and verify contents
- [ ] Unzip and open files
- [ ] Read manifest.json
- [ ] Verify folder structure
- [ ] Test on different browsers
- [ ] Test on mobile devices

---

## Deployment Checklist

- [ ] Install dependencies (`archiver`, `@types/archiver`)
- [ ] Run TypeScript type checking
- [ ] Run ESLint
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Test on staging environment
- [ ] Review security (role checks, confirmation dialogs)
- [ ] Review performance (benchmark with real data)
- [ ] Update documentation
- [ ] Get stakeholder approval
- [ ] Deploy to production
- [ ] Monitor for errors (24 hours)
- [ ] Verify audit logs
- [ ] Train SoYTe administrators

---

## Future Enhancements (Post-v1)

1. **Scheduled Backups:** Cron job for monthly automated backups
2. **Google Drive Integration:** Direct upload to Google Drive via API
3. **File Restoration:** Re-upload files from backup ZIP
4. **Soft Delete:** Grace period before permanent deletion
5. **Email Notifications:** Notify admins when backup completes
6. **Backup Encryption:** Encrypt ZIP files with password
7. **Incremental Backups:** Only backup new/changed files
8. **Storage Analytics:** Dashboard showing storage trends
9. **Multi-region Backup:** Replicate backups to multiple locations
10. **Backup Verification:** Automated integrity checks

---

## References

- Archiver npm package: https://www.npmjs.com/package/archiver
- Cloudflare R2 API: https://developers.cloudflare.com/r2/api/s3/
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Stream API: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
