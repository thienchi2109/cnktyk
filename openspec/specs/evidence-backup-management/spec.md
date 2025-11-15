# evidence-backup-management Specification

## Purpose
Defines behavioral requirements for evidence file backup and cleanup functionality, enabling SoYTe administrators to create offline backups of evidence files and permanently delete backed-up files from R2 storage to manage storage capacity.

## Requirements

### Requirement: SoYTe-Only Backup Access
The backup management feature SHALL be accessible exclusively to users with the SoYTe (Department of Health) role, ensuring centralized control over data archival operations.

#### Scenario: SoYTe user accesses backup center
- **WHEN** a user with SoYTe role navigates to `/so-y-te/backup`
- **THEN** the system SHALL render the Backup Center page with date range selection and backup controls
- **AND** the navigation menu SHALL display a "Backup" menu item

#### Scenario: DonVi user attempts to access backup center
- **WHEN** a user with DonVi role attempts to navigate to `/so-y-te/backup`
- **THEN** the system SHALL return HTTP 403 Forbidden status
- **AND** the middleware SHALL redirect the user to their dashboard

#### Scenario: NguoiHanhNghe user attempts to access backup center
- **WHEN** a user with NguoiHanhNghe role attempts to navigate to `/so-y-te/backup`
- **THEN** the system SHALL return HTTP 403 Forbidden status
- **AND** the middleware SHALL redirect the user to their dashboard

#### Scenario: API endpoints enforce role-based access
- **WHEN** a non-SoYTe user makes a request to `/api/backup/*` endpoints
- **THEN** the system SHALL return HTTP 403 Forbidden status
- **AND** the response SHALL include error message "Access denied. SoYTe role required."

### Requirement: Date Range Backup Creation
The system SHALL allow SoYTe administrators to create ZIP archive backups of approved evidence files within a specified date range.

#### Scenario: Valid date range backup request
- **WHEN** a SoYTe user selects a start date and end date (both valid ISO 8601 dates)
- **AND** the start date is before the end date
- **AND** the date range does not exceed 1 year (365 days)
- **AND** clicks "Download Backup"
- **THEN** the system SHALL query all approved submissions (`TrangThaiDuyet = 'DaDuyet'`) with evidence files in the date range
- **AND** the system SHALL create a ZIP archive with files organized by practitioner
- **AND** the system SHALL stream the ZIP file to the user's browser
- **AND** the filename SHALL follow the pattern `CNKTYKLT_Backup_YYYY-MM-DD_to_YYYY-MM-DD.zip`

#### Scenario: Date range exceeds maximum
- **WHEN** a SoYTe user selects a date range exceeding 1 year
- **THEN** the system SHALL display an error message "Date range cannot exceed 1 year"
- **AND** the system SHALL not process the backup request

#### Scenario: End date before start date
- **WHEN** a SoYTe user selects an end date that is before the start date
- **THEN** the system SHALL display an error message "Start date must be before end date"
- **AND** the system SHALL not process the backup request

#### Scenario: No files found in date range
- **WHEN** a SoYTe user requests a backup for a date range with zero approved evidence files
- **THEN** the system SHALL return HTTP 404 Not Found status
- **AND** the system SHALL display message "No evidence files found in the specified date range"

#### Scenario: Backup includes only approved submissions
- **WHEN** the system creates a backup for a date range
- **THEN** the system SHALL include only submissions with `TrangThaiDuyet = 'DaDuyet'`
- **AND** submissions with status `ChoXetDuyet`, `TuChoi`, or `CanBoSung` SHALL be excluded

### Requirement: ZIP Archive Structure
The backup ZIP archive SHALL organize files by practitioner and include a machine-readable manifest for audit and restoration purposes.

#### Scenario: Files organized by practitioner
- **WHEN** a backup ZIP is created
- **THEN** each practitioner SHALL have a dedicated folder named `{SoCCHN}_{PractitionerName}`
- **AND** files within each folder SHALL be named `{Date}_{ActivityName}_{R2Filename}`
- **AND** the date format SHALL be `YYYY-MM-DD`

#### Scenario: Manifest included in ZIP
- **WHEN** a backup ZIP is created
- **THEN** the ZIP root SHALL contain a file named `BACKUP_MANIFEST.json`
- **AND** the manifest SHALL include backup metadata: `backupDate`, `dateRange`, `totalFiles`, `backupBy`
- **AND** the manifest SHALL include an array of file metadata with fields: `submissionId`, `activityName`, `practitioner`, `cchn`, `date`, `fileUrl`

#### Scenario: Special characters in filenames
- **WHEN** a practitioner name or activity name contains special characters (e.g., spaces, Vietnamese diacritics, slashes)
- **THEN** the system SHALL sanitize the filename by replacing spaces with underscores
- **AND** Vietnamese diacritics SHALL be preserved
- **AND** forbidden characters (`/`, `\`, `?`, `*`, `:`, `|`, `"`, `<`, `>`) SHALL be removed or replaced

#### Scenario: Duplicate filenames
- **WHEN** multiple files would have the same sanitized filename
- **THEN** the system SHALL preserve uniqueness by including the R2 filename (which contains UUID)
- **AND** no files SHALL be overwritten in the ZIP archive

### Requirement: Backup Performance and Reliability
The system SHALL create backups efficiently and handle failures gracefully to ensure SoYTe administrators can successfully backup large file sets.

#### Scenario: Large file set backup (1000 files)
- **WHEN** a backup contains up to 1000 files
- **THEN** the backup SHALL complete within 3 minutes
- **AND** the system SHALL not timeout

#### Scenario: Parallel file downloads
- **WHEN** the system creates a backup
- **THEN** the system SHALL download files from R2 in parallel (5-10 concurrent downloads)
- **AND** parallelization SHALL improve overall backup time

#### Scenario: R2 download failure handling
- **WHEN** a file fails to download from R2 during backup creation
- **THEN** the system SHALL retry the download up to 3 times with exponential backoff
- **AND** if retries fail, the system SHALL skip the file and continue with remaining files
- **AND** skipped files SHALL be listed in the manifest under `skippedFiles` array
- **AND** a warning SHALL be logged to the audit trail

#### Scenario: Streaming ZIP creation
- **WHEN** the system creates a backup ZIP
- **THEN** the ZIP SHALL be streamed directly to the response
- **AND** the system SHALL not write the ZIP to disk
- **AND** memory usage SHALL remain bounded regardless of file count

### Requirement: Backup Tracking and Audit
The system SHALL track all backup operations in a dedicated database table for audit compliance and operational visibility.

#### Scenario: Successful backup recorded
- **WHEN** a backup is successfully created and downloaded
- **THEN** the system SHALL insert a record into the `SaoLuuMinhChung` table
- **AND** the record SHALL include: `NgayBatDau`, `NgayKetThuc`, `TongSoTep`, `DungLuong`, `MaTaiKhoan`, `NgayTao`
- **AND** the `TrangThai` field SHALL be set to `'HoanThanh'`

#### Scenario: Backup details recorded
- **WHEN** a backup is created
- **THEN** the system SHALL insert records into the `ChiTietSaoLuu` table for each file
- **AND** each record SHALL link to the backup (`MaSaoLuu`) and submission (`MaGhiNhan`)
- **AND** the `TrangThai` field SHALL be set to `'DaSaoLuu'`

#### Scenario: Failed backup not recorded
- **WHEN** a backup operation fails before completion (e.g., validation error, no files found)
- **THEN** the system SHALL not insert a record into `SaoLuuMinhChung`
- **AND** the system SHALL log the error to `NhatKyHeThong` with action `'BACKUP_FAILED'`

#### Scenario: Backup history queryable
- **WHEN** a SoYTe user views backup history (future enhancement)
- **THEN** the system SHALL query `SaoLuuMinhChung` ordered by `NgayTao DESC`
- **AND** the results SHALL include backup date range, file count, size, and admin who performed backup

### Requirement: Permanent File Deletion
The system SHALL allow SoYTe administrators to permanently delete backed-up evidence files from R2 storage after confirming the backup is safely stored offline.

#### Scenario: Delete files with valid confirmation
- **WHEN** a SoYTe user selects a date range and clicks "Delete Files"
- **AND** types "DELETE" in the confirmation input field
- **AND** confirms the deletion action
- **THEN** the system SHALL delete all approved evidence files in the date range from R2 storage
- **AND** the system SHALL update the `ChiTietSaoLuu` records with `TrangThai = 'DaXoa'` and `NgayXoa = NOW()`
- **AND** the system SHALL set `FileMinhChungUrl` to NULL in the `GhiNhanHoatDong` table

#### Scenario: Delete without confirmation token
- **WHEN** a SoYTe user attempts to delete files without typing "DELETE" in the confirmation field
- **THEN** the system SHALL return HTTP 400 Bad Request status
- **AND** the response SHALL include error message "Confirmation token required. Type DELETE to confirm."

#### Scenario: Delete file count limit
- **WHEN** a SoYTe user attempts to delete more than 5000 files at once
- **THEN** the system SHALL return HTTP 400 Bad Request status
- **AND** the response SHALL include error message "Cannot delete more than 5000 files at once"
- **AND** the system SHALL suggest splitting into multiple operations

#### Scenario: Partial deletion success
- **WHEN** some files fail to delete from R2 during a batch deletion
- **THEN** the system SHALL continue deleting remaining files
- **AND** the system SHALL track success and failure counts
- **AND** the system SHALL only update database records for successfully deleted files
- **AND** the response SHALL include `deletedCount` and `failedCount`

#### Scenario: Deletion frees storage space
- **WHEN** files are successfully deleted from R2
- **THEN** the Cloudflare R2 storage quota SHALL be freed immediately
- **AND** the response SHALL include approximate space freed in MB (`spaceFreedMB`)

### Requirement: Deletion Tracking and Audit
The system SHALL track all deletion operations with detailed audit trails to ensure accountability and enable compliance reporting.

#### Scenario: Deletion operation recorded
- **WHEN** a deletion operation completes (successful or partial)
- **THEN** the system SHALL insert a record into the `XoaMinhChung` table
- **AND** the record SHALL include: `NgayBatDau`, `NgayKetThuc`, `TongSoTep`, `SoTepThanhCong`, `SoTepThatBai`, `DungLuongGiaiPhong`, `MaTaiKhoan`, `NgayThucHien`

#### Scenario: Deletion linked to backup
- **WHEN** files are deleted after a specific backup operation
- **THEN** the `XoaMinhChung` record SHALL reference the `MaSaoLuu` of the corresponding backup
- **AND** this link SHALL enable audit reports showing which backups led to deletions

#### Scenario: Audit log entry created
- **WHEN** a deletion operation completes
- **THEN** the system SHALL insert a record into `NhatKyHeThong` with action `'DELETE_ARCHIVED_FILES'`
- **AND** the `ChiTiet` field SHALL include date range, deleted count, failed count, and space freed
- **AND** the `IPAddress` field SHALL capture the admin's IP address

### Requirement: Safety Mechanisms
The system SHALL implement multiple confirmation steps and safety checks to prevent accidental deletion of critical evidence files.

#### Scenario: Multi-step confirmation dialog
- **WHEN** a SoYTe user clicks "Delete Files" button
- **THEN** the system SHALL display a warning dialog with file count and date range
- **AND** the dialog SHALL require typing "DELETE" to enable the confirmation button
- **AND** the dialog SHALL display a final warning with 5-second countdown before API call

#### Scenario: Cannot delete without backup
- **WHEN** a SoYTe user attempts to delete files for a date range
- **AND** no backup exists for that date range in `SaoLuuMinhChung` (optional check, not enforced in v1)
- **THEN** the system MAY display a warning "No backup found for this date range. Are you sure?"
- **AND** the system SHALL allow deletion to proceed (soft warning only)

#### Scenario: Deletion is irreversible
- **WHEN** files are deleted from R2 storage
- **THEN** the files SHALL be permanently removed
- **AND** the system SHALL not provide a restoration mechanism (manual restoration from backup only)
- **AND** the confirmation dialog SHALL clearly state "This action is permanent and cannot be undone"

### Requirement: User Interface Requirements
The Backup Center interface SHALL provide clear controls, feedback, and guidance to help SoYTe administrators safely manage evidence backups.

#### Scenario: Date range picker with presets
- **WHEN** a SoYTe user views the Backup Center page
- **THEN** the system SHALL display a date range picker with start and end date inputs
- **AND** the system SHALL provide quick preset buttons: "Last Month", "Last 3 Months", "Last 6 Months", "Last Year"

#### Scenario: Progress indicator during backup
- **WHEN** a backup operation is in progress
- **THEN** the system SHALL display a progress indicator (spinner or progress bar)
- **AND** the "Download Backup" button SHALL be disabled during the operation
- **AND** the system SHALL display status text (e.g., "Creating backup...")

#### Scenario: Success notification
- **WHEN** a backup or deletion operation completes successfully
- **THEN** the system SHALL display a success toast notification
- **AND** the notification SHALL include the operation type and count (e.g., "Backup created with 150 files")

#### Scenario: Error notification
- **WHEN** a backup or deletion operation fails
- **THEN** the system SHALL display an error toast notification
- **AND** the notification SHALL include a user-friendly error message (not technical stack traces)
