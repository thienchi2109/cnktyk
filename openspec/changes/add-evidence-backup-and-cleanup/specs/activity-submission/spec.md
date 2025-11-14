# Spec Delta: activity-submission

**Change ID:** `add-evidence-backup-and-cleanup`  
**Change Type:** MODIFIED  
**Affected Specification:** `activity-submission`

---

## Summary
This change adds tracking of evidence file backup and deletion status to activity submissions. When evidence files are backed up or deleted by SoYTe administrators, the corresponding submission records are updated to reflect the archival state.

---

## ADDED Requirements

### Requirement: Evidence File Deletion Tracking
Activity submissions with evidence files SHALL track when files are backed up and deleted, maintaining data integrity while allowing storage cleanup.

#### Scenario: Evidence file marked as backed up
- **WHEN** a SoYTe administrator creates a backup containing a submission's evidence file
- **THEN** the system SHALL insert a record into `ChiTietSaoLuu` linking the submission (`MaGhiNhan`) to the backup (`MaSaoLuu`)
- **AND** the record SHALL have `TrangThai = 'DaSaoLuu'`

#### Scenario: Evidence file deleted after backup
- **WHEN** a SoYTe administrator deletes evidence files from R2 storage
- **THEN** the system SHALL set the submission's `FileMinhChungUrl` field to NULL
- **AND** the system SHALL update the `ChiTietSaoLuu` record with `TrangThai = 'DaXoa'` and `NgayXoa = NOW()`

#### Scenario: Submission record preserved after file deletion
- **WHEN** an evidence file is deleted from R2 storage
- **THEN** the submission record (`GhiNhanHoatDong`) SHALL remain in the database
- **AND** all submission metadata SHALL be preserved (activity name, date, points, approval status)
- **AND** only the `FileMinhChungUrl` field SHALL be set to NULL

#### Scenario: Submission display when file deleted
- **WHEN** a user views a submission whose evidence file has been deleted
- **THEN** the system SHALL display the submission details normally
- **AND** the evidence file section SHALL display "Tệp đã được lưu trữ" (File has been archived) instead of the download link
- **AND** the system SHALL not display a broken link or error message

#### Scenario: Backup history queryable per submission
- **WHEN** a SoYTe administrator views a submission's audit history (future enhancement)
- **THEN** the system SHALL query `ChiTietSaoLuu` to show when the file was backed up and deleted
- **AND** the history SHALL include backup date, admin who performed backup, and deletion date

#### Scenario: Only approved submissions eligible for backup
- **WHEN** the system queries submissions for backup
- **THEN** only submissions with `TrangThaiDuyet = 'DaDuyet'` SHALL be included
- **AND** submissions with status `ChoXetDuyet`, `TuChoi`, or `CanBoSung` SHALL never be backed up or deleted

---

## MODIFIED Requirements

No existing requirements are modified. The backup and deletion tracking is additive and does not change existing submission creation, approval, or viewing behavior.

---

## REMOVED Requirements

None.

---

## Database Schema Impact

### New Table: ChiTietSaoLuu
This table tracks the many-to-many relationship between backups and submissions:

```sql
CREATE TABLE "ChiTietSaoLuu" (
    "MaChiTiet" UUID PRIMARY KEY,
    "MaSaoLuu" UUID NOT NULL REFERENCES "SaoLuuMinhChung"("MaSaoLuu"),
    "MaGhiNhan" UUID NOT NULL REFERENCES "GhiNhanHoatDong"("MaGhiNhan"),
    "TrangThai" VARCHAR(50) NOT NULL DEFAULT 'DaSaoLuu', -- DaSaoLuu, DaXoa
    "NgayXoa" TIMESTAMP NULL,
    "DungLuongTep" BIGINT NULL
);
```

### Modified Behavior: GhiNhanHoatDong.FileMinhChungUrl
- **Before:** Always contains R2 URL if file uploaded, never NULL after upload
- **After:** Can be set to NULL when file is deleted from R2 by SoYTe admin
- **Impact:** All code displaying evidence file links must handle NULL case

---

## API Impact

No changes to existing activity submission APIs. Backup and deletion are handled by new endpoints (`/api/backup/*`).

---

## UI Impact

### Modified: Submission Detail Views
All components displaying evidence files must handle the deleted file case:

- **Before:** Always show download link if `FileMinhChungUrl` is not NULL
- **After:** Check if `FileMinhChungUrl` is NULL and display "File has been archived" message
- **Affected Components:**
  - `src/app/(authenticated)/nguoi-hanh-nghe/ghi-nhan/[id]/page.tsx`
  - `src/app/(authenticated)/don-vi/ghi-nhan/[id]/page.tsx`
  - `src/app/(authenticated)/so-y-te/ghi-nhan/[id]/page.tsx`

---

## Testing Additions

### New Test Scenarios
- [ ] Create submission with evidence file
- [ ] Back up the evidence file
- [ ] Verify `ChiTietSaoLuu` record created
- [ ] Delete the evidence file
- [ ] Verify `FileMinhChungUrl` is NULL
- [ ] Verify `ChiTietSaoLuu` record updated with deletion date
- [ ] View submission detail page and verify "archived" message displays
- [ ] Verify submission is still searchable and filterable

---

## Migration Notes

1. No data migration required for existing submissions
2. Existing submissions with evidence files remain unchanged
3. Only future backup/delete operations affect `FileMinhChungUrl`
4. Existing UI components will display NULL URLs as "no file" (graceful degradation)

---

## Backward Compatibility

✅ **Fully backward compatible.** Existing submissions are not affected. The change only adds new tracking capabilities without modifying existing behavior.
