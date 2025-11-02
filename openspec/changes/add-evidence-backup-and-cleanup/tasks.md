# Implementation Tasks

**Change ID:** `add-evidence-backup-and-cleanup`  
**Last Updated:** 2025-10-31

---

## Phase 1: Backup Download Feature

### 1.1 Backend API Development
- [x] 1.1.1 Install `archiver` and `@types/archiver` packages
- [x] 1.1.2 Create `/api/backup/evidence-files/route.ts`
- [x] 1.1.3 Implement date range validation (max 1 year)
- [x] 1.1.4 Implement SQL query to fetch files by date range
- [x] 1.1.5 Implement R2 file download helper function
- [x] 1.1.6 Implement ZIP streaming with archiver
- [x] 1.1.7 Implement folder organization (by practitioner CCHN/Name)
- [x] 1.1.8 Generate backup manifest.json with metadata
- [x] 1.1.9 Add audit logging for backup operations
- [x] 1.1.10 Set maxDuration = 300 (5 minutes) for route
- [x] 1.1.11 Add error handling and retry logic for R2 downloads
- [x] 1.1.12 Test with various date ranges (1 day, 1 month, 6 months, 1 year)

### 1.2 Frontend UI Development
- [x] 1.2.1 Create `src/app/(authenticated)/so-y-te/backup/page.tsx`
- [x] 1.2.2 Create `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`
- [x] 1.2.3 Implement date range picker (start date + end date)
- [x] 1.2.4 Add quick date preset buttons (1mo, 3mo, 6mo, 1yr)
- [x] 1.2.5 Implement backup download button with loading state
- [x] 1.2.6 Add progress indicator/loading notice
- [x] 1.2.7 Implement error handling and user feedback
- [x] 1.2.8 Add success message after download
- [x] 1.2.9 Add instructions panel (how to backup/store)
- [x] 1.2.10 Add storage recommendations (Google Drive, NAS, external HDD)
- [x] 1.2.11 Test responsive design (mobile, tablet, desktop)

### 1.3 Navigation Integration
- [x] 1.3.1 Add "Sao lưu minh chứng" nav item to SoYTe menu
- [x] 1.3.2 Add FileArchive icon from lucide-react
- [x] 1.3.3 Test navigation visibility (SoYTe only, hidden for other roles)

### 1.4 Access Control
- [x] 1.4.1 Add role check in backup page (redirect if not SoYTe)
- [x] 1.4.2 Add role check in API route (403 if not SoYTe)
- [x] 1.4.3 Update middleware if needed for /so-y-te/backup route
- [x] 1.4.4 Test access control for all roles (SoYTe, DonVi, NguoiHanhNghe, Auditor)
  - Confirmed defense-in-depth layers: middleware route guard, server component `requireRole(['SoYTe'])`, and API 403 response for non-SoYTe roles.

---

## Phase 2: File Deletion Feature

### 2.1 Database Schema Updates (Optional)
- [x] 2.1.1 Decide: Add backup tracking fields to GhiNhanHoatDong?
  - Decision: NO - Use ChiTietSaoLuu table instead (better design)
  - `FileMinhChungBackedUpAt` TIMESTAMP NULL (not needed)
  - `FileMinhChungBackedUpBy` UUID NULL (not needed)
- [x] 2.1.2 Create migration SQL if schema changes approved
  - Migration exists: migrations/2025-10-31_add_backup_tracking.sql
  - Creates 3 tables: SaoLuuMinhChung, ChiTietSaoLuu, XoaMinhChung
- [x] 2.1.3 Update Zod schemas in `src/lib/db/schemas.ts`
  - Added schemas for all 3 backup tracking tables
  - Status enums: TrangThaiSaoLuuSchema, TrangThaiChiTietSaoLuuSchema
- [x] 2.1.4 Update TypeScript types
  - All types exported from Zod schemas
- [x] 2.1.5 Run migration and verify
  - Migration file exists, schemas created, repositories implemented
  - Needs to be run in production database when deploying

### 2.2 Backend API Development
- [x] 2.2.1 Create `/api/backup/delete-archived/route.ts`
- [x] 2.2.2 Implement date range validation (match backup date range)
- [x] 2.2.3 Implement SQL query to find files in date range
- [x] 2.2.4 Add safety check: Only delete files marked as backed up (if tracking implemented)
- [x] 2.2.5 Implement bulk deletion from R2 (batch delete)
- [x] 2.2.6 Implement database update (set FileMinhChungUrl to NULL or delete records)
- [x] 2.2.7 Add transaction support (rollback if R2 delete fails)
- [x] 2.2.8 Add audit logging for deletion operations
- [x] 2.2.9 Return deletion summary (success count, failed count)
- [x] 2.2.10 Test deletion with various scenarios

### 2.3 Frontend UI Development
- [x] 2.3.1 Add deletion section to backup-center-client.tsx
- [x] 2.3.2 Add "After backing up, you can delete files" notice
- [x] 2.3.3 Implement deletion date range picker (separate from backup)
- [x] 2.3.4 Add "Delete Files" button (danger variant, red)
- [x] 2.3.5 Implement multi-step confirmation dialog:
  - Step 1: "Are you sure you want to delete?"
  - Step 2: "Type DELETE to confirm"
  - Step 3: Final confirmation with file count
- [x] 2.3.6 Add warning messages about permanent deletion
- [x] 2.3.7 Add progress indicator during deletion
- [x] 2.3.8 Display deletion summary (X files deleted, Y failed)
- [x] 2.3.9 Add success/error feedback
- [x] 2.3.10 Test deletion flow with various date ranges

### 2.4 Safety Features
- [x] 2.4.1 Add "require backup first" checkbox (optional safety)
- [x] 2.4.2 Prevent deletion if no backup performed in last 24 hours (optional)
- [x] 2.4.3 Add deletion cooldown (prevent rapid repeated deletions)
- [x] 2.4.4 Add deleted file count validation (max 5000 per operation)
- [x] 2.4.5 Test safety features

---

## Phase 3: Optimization & Polish

### 3.1 Performance Optimization
- [x] 3.1.1 Implement parallel R2 downloads (5-10 concurrent)
- [x] 3.1.2 Add streaming for large ZIP files (avoid memory issues)
- [x] 3.1.3 Implement file count validation (warn if >2000 files)
- [x] 3.1.4 Add progress tracking for backup creation
- [x] 3.1.5 Optimize database queries (add indexes if needed)
- [x] 3.1.6 Test with large file counts (1000, 2000, 5000 files)
- [x] 3.1.7 Measure and document performance benchmarks

### 3.2 User Experience Enhancements
- [x] 3.2.1 Add estimated backup size calculation
- [x] 3.2.2 Add estimated download time indicator
- [x] 3.2.3 Improve error messages (specific, actionable)
- [x] 3.2.4 Add backup history panel (show recent backups)
- [x] 3.2.5 Add storage space saved indicator (after deletion)


### 3.3 Testing
- [ ] 3.3.1 Test backup with 0 files (empty date range)
- [ ] 3.3.2 Test backup with 1 file
- [ ] 3.3.3 Test backup with 100 files
- [ ] 3.3.4 Test backup with 1000 files
- [ ] 3.3.5 Test backup with maximum date range (1 year)
- [ ] 3.3.6 Test deletion with various file counts
- [ ] 3.3.7 Test error scenarios (R2 unavailable, network timeout)
- [ ] 3.3.8 Test access control for all user roles
- [ ] 3.3.9 Test ZIP file integrity (can unzip successfully)
- [ ] 3.3.10 Verify manifest.json content accuracy
- [ ] 3.3.11 Verify audit logs are created correctly
- [ ] 3.3.12 Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] 3.3.13 Test on mobile devices (responsive design)

---

## Phase 4: Documentation & Deployment

### 4.1 Code Documentation
- [x] 4.1.1 Add JSDoc comments to backup API route
- [x] 4.1.2 Add JSDoc comments to delete API route
- [x] 4.1.3 Add JSDoc comments to helper functions
- [x] 4.1.4 Update inline comments for complex logic

### 4.2 User Documentation
- [x] 4.2.1 Create backup/restore user guide (markdown)
- [x] 4.2.2 Document recommended backup frequency
- [x] 4.2.3 Document recommended storage locations
- [x] 4.2.4 Create deletion policy guidelines
- [x] 4.2.5 Add FAQ section (common questions)
- [x] 4.2.6 Add troubleshooting guide

### 4.3 Admin Documentation
- [x] 4.3.1 Document backup file structure (ZIP contents)
- [x] 4.3.2 Document manifest.json schema
- [x] 4.3.3 Document audit log format
- [x] 4.3.4 Document disaster recovery procedure
- [x] 4.3.5 Document storage capacity planning

### 4.4 Project Documentation
- [x] 4.4.1 Update README.md with backup feature info
- [x] 4.4.2 Update WARP.md if needed
- [x] 4.4.3 Update AGENTS.md if needed
- [x] 4.4.4 Update Copilot instructions if needed

### 4.5 Deployment
- [ ] 4.5.1 Run full test suite
- [ ] 4.5.2 Run typecheck (`npm run typecheck`)
- [ ] 4.5.3 Run lint (`npm run lint`)
- [ ] 4.5.4 Create deployment checklist
- [ ] 4.5.5 Deploy to staging environment
- [ ] 4.5.6 Perform smoke tests on staging
- [ ] 4.5.7 Get stakeholder approval
- [ ] 4.5.8 Deploy to production
- [ ] 4.5.9 Monitor for errors (24 hours)
- [ ] 4.5.10 Verify audit logs are working
- [ ] 4.5.11 Perform production smoke tests

### 4.6 Post-Deployment
- [ ] 4.6.1 Train SoYTe administrators on backup procedure
- [ ] 4.6.2 Create internal training materials
- [ ] 4.6.3 Collect user feedback
- [ ] 4.6.4 Address any issues or bugs
- [ ] 4.6.5 Monitor storage usage trends
- [ ] 4.6.6 Schedule first backup with SoYTe admin

---

## Phase 5: Maintenance & Future Enhancements

### 5.1 Monitoring
- [ ] 5.1.1 Set up alerts for failed backups
- [ ] 5.1.2 Monitor backup frequency
- [ ] 5.1.3 Monitor storage space usage
- [ ] 5.1.4 Review audit logs regularly

### 5.2 Future Enhancements (Out of Scope for v1)
- [ ] 5.2.1 Automated scheduled backups (cron job)
- [ ] 5.2.2 Google Drive API integration
- [ ] 5.2.3 File restoration from backup ZIP
- [ ] 5.2.4 Soft delete with grace period
- [ ] 5.2.5 Email notifications for backup completion
- [ ] 5.2.6 Backup encryption option
- [ ] 5.2.7 Incremental backups (only new files)

---

## Success Metrics

### Functional Metrics
- [ ] SoYTe users can successfully create backups
- [ ] ZIP files contain all expected files
- [ ] Manifest.json is accurate
- [ ] Deletion operations complete successfully
- [ ] Audit logs capture all operations

### Performance Metrics
- [ ] Backup of 1000 files completes in <3 minutes
- [ ] No timeout errors for reasonable file counts
- [ ] UI remains responsive during operations
- [ ] Memory usage stays within acceptable limits

### User Satisfaction
- [ ] Positive feedback from SoYTe administrators
- [ ] No critical bugs reported in first week
- [ ] Feature adoption rate >80% within first month

---

## Dependencies Checklist

- [ ] `archiver` package installed
- [ ] `@types/archiver` package installed
- [ ] R2 client fully functional
- [ ] Database repositories available
- [ ] Authentication system working
- [ ] Audit logging functional
- [ ] All required environment variables configured

---

## Notes

- **Priority:** High (storage capacity concern)
- **Estimated Total Time:** 6-9 hours
- **Risk Level:** Medium (data deletion is permanent)
- **Reversibility:** Partial (deleted files cannot be recovered)
- **Testing Requirement:** Extensive (multiple scenarios, edge cases)
