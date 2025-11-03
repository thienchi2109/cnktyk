# Change Proposal: Add Evidence Backup and Cleanup

**Change ID:** `add-evidence-backup-and-cleanup`  
**Type:** Feature Addition  
**Status:** Proposed  
**Created:** 2025-10-31  
**Author:** AI Assistant (for review)

---

## Why

### Problem Statement
With 10,000+ practitioners submitting evidence files for CPD compliance tracking, Cloudflare R2 storage costs and capacity become significant concerns:
- **Storage Growth:** ~30,000 files/year × 0.5 MB = 15 GB/year
- **Free Tier Limit:** 10 GB storage capacity
- **Compliance Requirement:** Evidence files must be retained for audit purposes (5+ years in healthcare)
- **Cost Management:** Need to balance compliance with infrastructure costs

### Current State
- All evidence files stored indefinitely in Cloudflare R2
- No mechanism to archive or remove old files
- No bulk download capability for backup purposes
- SoYTe admins cannot manage storage space

### Business Impact
Without this feature:
- Storage costs will exceed free tier within 8-12 months
- No disaster recovery mechanism (off-site backups)
- Cannot free up space for new submissions
- Compliance risk if storage quota is exceeded (file uploads fail)

---

## What Changes

### High-Level Changes
1. **Backup Center UI** (SoYTe-only)
   - Date range picker for selecting evidence files to backup
   - Download as ZIP archive (organized by practitioner)
   - Progress indicator during backup creation
   - Quick date presets (1 month, 3 months, 6 months, 1 year)

2. **Bulk Delete Capability** (Post-backup)
   - Checkbox/select interface for backed-up file ranges
   - Confirmation dialog with warning about permanent deletion
   - Soft delete option (mark as archived) vs hard delete (permanent removal)
   - Audit logging for all delete operations

3. **Backend API Routes**
   - POST `/api/backup/evidence-files` - Create and download ZIP backup
   - POST `/api/backup/delete-archived` - Permanently delete backed-up files from R2
   - Streaming ZIP generation (handle large file counts)
   - Parallel file downloads from R2 for performance

4. **Database Tracking** (New Tables)
   - `SaoLuuMinhChung` - Track backup operations (date range, file count, admin, size)
   - `ChiTietSaoLuu` - Track individual files in each backup and deletion status
   - `XoaMinhChung` - Track deletion operations (success/failure counts, space freed)
   - Complete audit trail for compliance and operational visibility

---

## Impact

### Affected Specifications
- **New Spec Required:** `evidence-backup-management` (file backup, archival, cleanup)
- **Modified Specs:**
  - `activity-submission` (add backup/deletion status tracking)
  - `role-based-access-control` (SoYTe-only access to backup features)

### Affected Code Areas
- **Frontend:**
  - New page: `src/app/(authenticated)/so-y-te/backup/page.tsx`
  - New component: `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`
  - Navigation: Add "Backup" menu item for SoYTe users
- **Backend:**
  - New API: `src/app/api/backup/evidence-files/route.ts`
  - New API: `src/app/api/backup/delete-archived/route.ts`
  - Repository: Add methods to `SaoLuuMinhChungRepository`, `ChiTietSaoLuuRepository`, `XoaMinhChungRepository`
- **Database:**
  - Migration: `2025-10-31_add_backup_tracking.sql` (3 new tables with indexes)
  - Schema update: Add Zod schemas for backup tracking tables

### User Impact
- **SoYTe Users:** New backup/cleanup capability, improved storage management
- **DonVi Users:** No impact (cannot access backup features)
- **Practitioners:** No impact (transparent to end users)
- **Auditors:** No impact (read-only access maintained)

### Data Flow Changes
```
Before:
Evidence File → R2 Storage → Indefinite retention

After:
Evidence File → R2 Storage → Manual Backup (ZIP) → Optional Deletion
                              ↓
                        Local/Cloud Storage (Admin managed)
```

### Breaking Changes
**None.** This is a purely additive feature with no changes to existing behavior.

### Reversibility
- Backup files are stored outside the system (admin managed)
- Deleted files cannot be recovered from R2 (permanent)
- Feature can be disabled via feature flag without impact
- No schema changes that require rollback

---

## Non-Goals (Out of Scope)

1. **Automated Archival:** No cron jobs or scheduled backups (admin-initiated only)
2. **Cloud Storage Integration:** No Google Drive/Dropbox API integration (manual upload)
3. **File Restoration:** No re-upload mechanism from backup to R2
4. **Tiered Storage:** No automatic movement to cold storage tiers
5. **Compression Optimization:** No file compression before backup (use existing formats)

---

## Security Considerations

### Access Control
- **Backup Feature:** SoYTe role ONLY
- **Delete Feature:** SoYTe role ONLY with confirmation dialog
- **Audit Logging:** All backup/delete operations logged to `NhatKyHeThong`

### Data Protection
- **ZIP Encryption:** Optional (not implemented in v1, use OS-level encryption)
- **Signed URLs:** Existing R2 signed URL mechanism maintained
- **Download Security:** Server-side streaming (no direct R2 access from client)

### Compliance
- **Audit Trail:** Complete logging of who backed up/deleted what and when
- **Warning Messages:** Clear warnings about permanent deletion
- **Backup Verification:** Include manifest.json with file metadata in ZIP

---

## Performance Considerations

### Backup Performance
- **Batch Processing:** Limit to 1000 files per backup (prevent timeout)
- **Streaming:** Stream ZIP directly to response (no disk writes)
- **Parallel Downloads:** Download multiple files from R2 concurrently (5-10 parallel)
- **Timeout:** Set 5-minute maxDuration for large backups

### Storage Impact
- **Immediate:** ZIP creation uses memory (consider file count limits)
- **Long-term:** Deletion frees up R2 storage space immediately

### Database Impact
- **Backup Query:** Indexed query on `NgayGhiNhan` + `TrangThaiDuyet`
- **Delete Operation:** Bulk deletion with transaction support
- **Audit Logging:** Batch insert for efficiency

---

## Success Criteria

### Functional Requirements
- ✅ SoYTe can select date range and download ZIP backup
- ✅ ZIP contains all approved evidence files in date range
- ✅ Files organized by practitioner (CCHN/Name folders)
- ✅ Manifest.json included with backup metadata
- ✅ SoYTe can permanently delete backed-up files from R2
- ✅ Delete operation requires confirmation
- ✅ All operations logged to audit trail

### Performance Requirements
- ✅ Backup of 1000 files completes within 3 minutes
- ✅ No timeout errors for reasonable file counts (<2000 files)
- ✅ UI remains responsive during backup creation

### Quality Requirements
- ✅ Clear error messages for failures
- ✅ Progress indicators during long operations
- ✅ Confirmation dialogs prevent accidental deletion
- ✅ Backup manifest is machine-readable (JSON)

---

## Dependencies

### External Packages
- `archiver` (^7.0.0) - ZIP file creation
- `@types/archiver` - TypeScript types

### Existing System Components
- Cloudflare R2 client (`src/lib/storage/r2-client.ts`)
- Database repositories (`src/lib/db/repositories.ts`)
- Authentication system (`src/lib/auth/`)
- Audit logging (`NhatKyHeThongRepository`)

### Environment Variables
- Existing R2 configuration (no new env vars required)

---

## Implementation Phases

### Phase 1: Backup Download (Priority: High)
- Create backup API route
- Build backup UI page
- Add to SoYTe navigation
- Test with various date ranges

**Estimated Time:** 2-3 hours

### Phase 2: File Deletion (Priority: High)
- Add delete API route
- Build deletion UI interface
- Implement confirmation dialogs
- Add audit logging

**Estimated Time:** 2-3 hours

### Phase 3: Optimization (Priority: Medium)
- Add progress indicators
- Implement parallel downloads
- Add file count validation
- Performance testing

**Estimated Time:** 1-2 hours

### Phase 4: Documentation (Priority: Medium)
- User guide for backup/restore process
- Admin documentation
- Update README

**Estimated Time:** 1 hour

**Total Estimated Time:** 6-9 hours

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Accidental deletion of needed files | High | Medium | Multi-step confirmation, audit logging |
| Backup file too large (timeout) | Medium | Medium | Limit date range to 1 year, batch processing |
| Memory exhaustion during ZIP | Medium | Low | Stream processing, file count limits |
| Loss of backup files (admin storage) | High | Low | Documentation emphasizes multiple backup copies |
| R2 download failures | Medium | Low | Retry logic, skip failed files with warning |

---

## Open Questions

1. **Should we add a "soft delete" option?**
   - Mark files as archived in DB but keep in R2 for grace period?
   - **Recommendation:** Not in v1, add if requested

2. **Should backup history be stored in database?**
   - Track backup dates, file counts, admin who performed backup?
   - **Decision:** ✅ **YES** - Using dedicated tables (`SaoLuuMinhChung`, `ChiTietSaoLuu`, `XoaMinhChung`)

3. **Maximum date range limit?**
   - Prevent backups of 5+ years at once?
   - **Recommendation:** 1 year maximum per backup

4. **File restoration capability?**
   - Allow re-upload from backup ZIP?
   - **Recommendation:** Not in v1, manual process acceptable

---

## Approval Checklist

- [ ] Product Owner: Confirms business value and priority
- [ ] Technical Lead: Reviews architectural decisions
- [ ] Security Review: Confirms access control and audit logging
- [ ] Compliance Officer: Approves data retention policy changes
- [ ] SoYTe Admin: Tests UX flow and confirms usability

---

## Next Steps

1. **Review this proposal** with stakeholders
2. **Answer open questions** and finalize scope
3. **Create `tasks.md`** with implementation checklist
4. **Create `design.md`** with technical details (API contracts, ZIP structure)
5. **Create spec deltas** for affected capabilities
6. **Get approval** before starting implementation
7. **Implement in phases** following tasks.md
8. **Test thoroughly** with various date ranges and file counts
9. **Deploy to production** with feature flag protection
10. **Archive change** after successful deployment

---

## References

- Healthcare data retention regulations (5+ years)
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Archiver npm package: https://www.npmjs.com/package/archiver
