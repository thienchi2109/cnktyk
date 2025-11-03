# OpenSpec Change Proposal: Evidence Backup and Cleanup

## 📋 Summary
Complete OpenSpec change proposal for adding evidence file backup and cleanup functionality to the CNKTYKLT platform. This feature enables SoYTe administrators to create offline backups of evidence files and permanently delete backed-up files from R2 storage to manage storage capacity.

---

## ✅ Completed Documents

### 1. **proposal.md** (Main Proposal)
**Location:** `openspec/changes/add-evidence-backup-and-cleanup/proposal.md`

**Contents:**
- Problem statement and business impact
- High-level feature description
- Impact analysis (code, users, data flow)
- Security considerations
- Performance requirements
- Success criteria
- Implementation phases (6-9 hours estimated)
- Risks and mitigations
- Open questions (answered)
- Approval checklist

**Key Decisions:**
- Manual backup approach (no automated archival)
- SoYTe-only access (role-based restriction)
- Dedicated database tables for tracking
- Date range limit: 1 year per backup
- Deletion limit: 5000 files per operation

---

### 2. **tasks.md** (Implementation Checklist)
**Location:** `openspec/changes/add-evidence-backup-and-cleanup/tasks.md`

**Contents:**
- 5 implementation phases with ~100 subtasks
  - Phase 1: Backup Download (2-3 hours)
  - Phase 2: File Deletion (2-3 hours)
  - Phase 3: Optimization (1-2 hours)
  - Phase 4: Documentation (1 hour)
  - Phase 5: Maintenance & Monitoring
- Testing checklist (unit, integration, E2E)
- Deployment checklist
- Post-deployment monitoring tasks

---

### 3. **design.md** (Technical Specifications)
**Location:** `openspec/changes/add-evidence-backup-and-cleanup/design.md`

**Contents:**
- Architecture diagram (UI → API → DB → R2 → ZIP)
- Complete API specifications
  - **POST /api/backup/evidence-files** (backup API)
  - **POST /api/backup/delete-archived** (deletion API)
- Request/response schemas
- Database queries (parameterized SQL)
- ZIP file structure and manifest format
- Database schema options (chose dedicated tables)
- Security mechanisms (multi-step confirmation)
- Performance targets (1000 files < 3 minutes)
- Error handling matrix (8 scenarios)
- Testing strategy
- Deployment checklist
- Future enhancements (10 v2 features)

---

### 4. **Database Migration**
**Location:** `migrations/2025-10-31_add_backup_tracking.sql`

**Contents:**
- **3 New Tables:**
  1. `SaoLuuMinhChung` - Backup operations tracking
     - Fields: MaSaoLuu, NgayBatDau, NgayKetThuc, TongSoTep, DungLuong, TrangThai, MaTaiKhoan, NgayTao, GhiChu
  2. `ChiTietSaoLuu` - Individual file tracking
     - Fields: MaChiTiet, MaSaoLuu, MaGhiNhan, TrangThai, NgayXoa, DungLuongTep
  3. `XoaMinhChung` - Deletion operations tracking
     - Fields: MaXoa, MaSaoLuu, NgayBatDau, NgayKetThuc, TongSoTep, SoTepThanhCong, SoTepThatBai, DungLuongGiaiPhong, MaTaiKhoan, NgayThucHien, GhiChu

- **Indexes:** 9 indexes for performance (date ranges, foreign keys, status filters)
- **Constraints:** Check constraints for date validation, unique constraints, cascading deletes
- **Comments:** Full documentation for all tables and columns

---

### 5. **Spec Delta: activity-submission**
**Location:** `openspec/changes/add-evidence-backup-and-cleanup/delta-activity-submission.md`

**Contents:**
- **ADDED Requirements:**
  - Evidence file deletion tracking
  - Submission record preservation after deletion
  - Display behavior when file deleted ("Tệp đã được lưu trữ" message)
  - Backup history queryable per submission
  - Only approved submissions eligible for backup

- **Database Impact:**
  - New table: `ChiTietSaoLuu` (links submissions to backups)
  - Modified behavior: `GhiNhanHoatDong.FileMinhChungUrl` can be NULL after deletion

- **UI Impact:**
  - Submission detail views must handle NULL file URLs
  - Display "archived" message instead of broken links

---

### 6. **Spec Delta: user-management**
**Location:** `openspec/changes/add-evidence-backup-and-cleanup/delta-user-management.md`

**Contents:**
- **ADDED Requirements:**
  - Role-based access control for backup management (SoYTe only)
  - Multi-layer access enforcement (middleware + page + API)
  - Navigation menu shows backup for SoYTe only

- **Role Permission Matrix:**
  | Feature | SoYTe | DonVi | NguoiHanhNghe | Auditor |
  |---------|-------|-------|---------------|---------|
  | Evidence Backup | ✅ Full | ❌ No | ❌ No | ❌ No |
  | Evidence Deletion | ✅ Full | ❌ No | ❌ No | ❌ No |

- **Middleware Impact:**
  - Route protection: `/so-y-te/backup` → SoYTe only
  - API protection: `/api/backup/*` → SoYTe only

- **Security Rationale:**
  - Centralized authority model (Department of Health oversight)
  - Audit compliance (proper governance)
  - Risk mitigation (prevent accidental deletion)

---

### 7. **New Spec: evidence-backup-management**
**Location:** `openspec/specs/evidence-backup-management/spec.md`

**Contents:** Complete capability specification with 8 major requirements:

1. **SoYTe-Only Backup Access** (4 role scenarios + API enforcement)
2. **Date Range Backup Creation** (validation, query, streaming, filename)
3. **ZIP Archive Structure** (folder organization, manifest, special characters)
4. **Backup Performance and Reliability** (targets, parallelization, error handling)
5. **Backup Tracking and Audit** (database records, history queries)
6. **Permanent File Deletion** (confirmation, limits, partial failures, space freed)
7. **Deletion Tracking and Audit** (operation records, backup linking, audit logs)
8. **Safety Mechanisms** (multi-step confirmation, irreversibility warnings)
9. **User Interface Requirements** (date pickers, progress, notifications)

**Total Scenarios:** 45+ behavioral scenarios with WHEN/THEN format

---

## 📊 Change Statistics

| Metric | Count |
|--------|-------|
| Total Documents Created | 7 |
| New Database Tables | 3 |
| New API Endpoints | 2 |
| New UI Pages | 1 |
| New Indexes | 9 |
| Implementation Tasks | ~100 |
| Test Scenarios | 45+ |
| Estimated Implementation Time | 6-9 hours |

---

## 🔄 Workflow Status

### ✅ Completed Steps
1. ✅ Created proposal.md
2. ✅ Created tasks.md
3. ✅ Created design.md
4. ✅ Created database migration
5. ✅ Created spec delta: activity-submission
6. ✅ Created spec delta: user-management
7. ✅ Created new spec: evidence-backup-management

### 🚧 Next Steps (Awaiting Stakeholder Action)
1. **Review proposal.md** with stakeholders
2. **Review design.md** for technical feasibility
3. **Review spec deltas** for completeness
4. **Run validation:** `openspec validate add-evidence-backup-and-cleanup --strict`
5. **Address validation issues** (if any)
6. **Get approvals:**
   - [ ] Product Owner (business value)
   - [ ] Technical Lead (architecture)
   - [ ] Security Review (access control, audit logging)
   - [ ] Compliance Officer (data retention policy)
   - [ ] SoYTe Admin (UX testing)
7. **Begin implementation** following tasks.md

---

## 🎯 Key Technical Decisions

### 1. Database Tracking Approach
**Decision:** Use dedicated tables instead of adding fields to `GhiNhanHoatDong`

**Rationale:**
- Cleaner separation of concerns
- Better audit trail
- Easier to query backup history
- No impact on existing submission queries
- Supports many-to-many relationship (one backup contains many files)

### 2. Access Control Model
**Decision:** SoYTe-only access (no feature flag)

**Rationale:**
- Reflects centralized governance model
- Higher trust level required for permanent deletion
- Prevents unit admins from accidentally deleting files
- Aligns with healthcare compliance oversight

### 3. Backup Approach
**Decision:** Manual backup with admin download (not automated archival)

**Rationale:**
- Simpler implementation (6-9 hours vs weeks)
- No cloud storage API integration needed
- Admin controls when/where backups are stored
- Flexibility in backup storage location

### 4. Deletion Safety
**Decision:** Multi-step confirmation with typed "DELETE" token

**Rationale:**
- Prevents accidental clicks
- Similar to GitHub/AWS deletion patterns
- Clear warning about irreversibility
- Complete audit trail

### 5. Performance Targets
**Decision:** 1000 files < 3 minutes, streaming ZIP, parallel downloads

**Rationale:**
- Typical backup: 3-6 months = ~500-1000 files
- Streaming prevents memory exhaustion
- Parallel downloads improve speed (5-10 concurrent)
- Set maxDuration = 300 seconds for safety

---

## 🔒 Security Features

1. **Multi-layer Access Control:**
   - Middleware route protection
   - Page component role check
   - API endpoint role validation

2. **Audit Trail:**
   - All operations logged to `NhatKyHeThong`
   - Complete backup history in `SaoLuuMinhChung`
   - Complete deletion history in `XoaMinhChung`
   - IP address captured for all operations

3. **Confirmation Mechanisms:**
   - Type "DELETE" to confirm
   - File count display before deletion
   - 5-second countdown (optional)
   - Permanent action warnings

4. **Data Integrity:**
   - Only approved submissions backed up
   - Submission records preserved after file deletion
   - Backup manifest includes file metadata
   - Failed deletions do not update database

---

## 📝 Implementation Notes

### Dependencies to Install
```bash
npm install archiver
npm install --save-dev @types/archiver
```

### Environment Variables
No new environment variables required. Uses existing R2 configuration.

### Database Migration
Run migration after approval:
```bash
npx tsx scripts/run-migrations.ts
# Or manually run: migrations/2025-10-31_add_backup_tracking.sql
```

### Feature Flag
Not using feature flag. Functionality is production-ready from day 1 (SoYTe role gating sufficient).

---

## 📚 References

- **Proposal:** `openspec/changes/add-evidence-backup-and-cleanup/proposal.md`
- **Tasks:** `openspec/changes/add-evidence-backup-and-cleanup/tasks.md`
- **Design:** `openspec/changes/add-evidence-backup-and-cleanup/design.md`
- **Migration:** `migrations/2025-10-31_add_backup_tracking.sql`
- **Spec Deltas:** `openspec/changes/add-evidence-backup-and-cleanup/delta-*.md`
- **New Spec:** `openspec/specs/evidence-backup-management/spec.md`
- **Archiver Package:** https://www.npmjs.com/package/archiver
- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/

---

## ✨ Success Criteria Recap

### Functional ✅
- SoYTe can select date range and download ZIP backup
- ZIP contains all approved evidence files in date range
- Files organized by practitioner (CCHN/Name folders)
- Manifest.json included with backup metadata
- SoYTe can permanently delete backed-up files from R2
- Delete operation requires confirmation
- All operations logged to audit trail

### Performance ✅
- Backup of 1000 files completes within 3 minutes
- No timeout errors for reasonable file counts (<2000 files)
- UI remains responsive during backup creation

### Quality ✅
- Clear error messages for failures
- Progress indicators during long operations
- Confirmation dialogs prevent accidental deletion
- Backup manifest is machine-readable (JSON)

---

**Change Status:** 🟡 **Awaiting Approval**  
**Next Action:** Review with stakeholders and get approval signatures  
**Implementation Start:** After all approvals received
