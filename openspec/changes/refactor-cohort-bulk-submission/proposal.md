# Change Proposal: Refactor Cohort Builder for Bulk Submission Creation

**Change ID:** `refactor-cohort-bulk-submission`
**Type:** Feature Refactoring
**Status:** Draft
**Created:** 2025-11-06
**Author:** AI Assistant (for review)

---

## Why

### Problem Statement

Unit admins currently lack an efficient way to **bulk-enroll practitioners in mandatory training activities**. The existing cohort builder (`/submissions/bulk`) was designed for a future "assignment" feature but doesn't integrate with the activity catalog or create actual submission records.

**Current Pain Points:**
- No connection between cohort builder and activity catalog entries
- Cannot bulk-create submissions for mandatory training events
- Practitioners must manually create submissions even for required activities
- Admin overhead: announcing training → tracking who registered → chasing no-shows

### Business Context: Mandatory Training Enrollment

Healthcare units frequently conduct mandatory training sessions (e.g., infection control, equipment safety, regulatory compliance). The workflow should be:

1. **Admin creates activity catalog entry**: "COVID-19 Safety Training - Dec 2025"
2. **Admin enrolls target practitioners**: Use cohort builder to select "all nurses in ICU"
3. **System creates submissions**: Practitioners now have pending submissions for this activity
4. **Practitioners attend & complete**: Upload evidence (attendance certificate, completion form)
5. **Admin approves**: Review evidence, approve submissions, credits calculated

**Current State:** Steps 2-3 don't exist. Practitioners must self-register, causing:
- Missed registrations (practitioners don't know they're required)
- Last-minute scrambles before deadlines
- No audit trail of who was supposed to attend
- Manual tracking in spreadsheets

### Impact

- **Admin Efficiency**: Bulk-enroll 50+ practitioners in <1 minute vs. 30+ minutes of manual entry
- **Compliance Visibility**: Clear record of who is enrolled, who completed, who's pending
- **Practitioner Clarity**: Pre-created submissions show "you need to complete this"
- **Audit Trail**: System records enrollment decisions (who was selected, when, by whom)

---

## What Changes

### 1. Cohort Builder Enhancement

**Add activity catalog selection inside cohort builder:**
- Activity selector dropdown at top of cohort builder page
- Shows unit-specific + global activities filtered by status (Active)
- Selected activity appears in preview/confirmation step
- Activity selection required before proceeding to bulk create

**Current:**
```
Cohort Builder → Select Practitioners → Preview → (no action)
```

**After:**
```
Cohort Builder → Select Activity → Select Practitioners → Preview → Bulk Create Submissions
```

### 2. New API Endpoint: Bulk Submission Creation

**POST `/api/submissions/bulk-create`** (DonVi, SoYTe roles only)

**Request:**
```typescript
{
  MaDanhMuc: string; // Activity catalog ID
  cohort: {
    mode: 'all' | 'manual';
    selectedIds: string[]; // manual mode
    excludedIds: string[]; // all mode
    filters: CohortFilters;
    totalFiltered: number;
  };
  // Optional overrides for bulk submissions
  NgayBatDau?: string; // Training event date
  NgayKetThuc?: string;
  DonViToChuc?: string;
}
```

**Response:**
```typescript
{
  success: true;
  created: number; // successfully created
  skipped: number; // duplicates
  failed: number; // errors
  details: {
    submissionIds: string[];
    duplicates: string[]; // practitioner IDs already submitted
    errors: Array<{ practitionerId: string; error: string }>;
  };
}
```

**Business Rules:**
- **Duplicate Prevention**: Enforce database-level uniqueness when possible (e.g. partial unique index or ON CONFLICT DO NOTHING) and report skipped practitioners for any existing (MaNhanVien, MaDanhMuc) submissions
- **Status Assignment**:
  - If YeuCauMinhChung = false: Create as ChoDuyet (ready for approval)
  - If YeuCauMinhChung = true: Create as Nhap (draft - evidence required)
- **Tenancy**: Validate all practitioners belong to admin's unit (DonVi) or any unit (SoYTe)
- **Activity Ownership**: Require that DonVi admins can only bulk enroll into catalog entries owned by their unit (or global). SoYTe may target any active catalog entry but must specify the resulting submission unit via practitioner membership.
- **Catalog Validation**: Activity must be Active, within validity period
- **Catalog Defaults**: Carry catalog-derived defaults (TenHoatDong, LoaiHoatDong, SoGioTinChiQuyDoi, HinhThucCapNhatKienThucYKhoa) into created submissions to keep downstream flows consistent.

### 3. Submission Schema Changes

**No schema changes needed** - use existing fields:
- `MaDanhMuc`: Link to catalog entry
- `TrangThaiDuyet`: `Nhap` (draft) or `ChoDuyet` (pending)
- `NguoiNhap`: Admin who created bulk submissions
- `FileMinhChungUrl`: NULL initially, practitioner uploads later

### 4. Credit Calculation Logic

**Enhancement:** Only calculate credits when:
```typescript
TrangThaiDuyet === 'DaDuyet'
  AND (
    YeuCauMinhChung === false
    OR (YeuCauMinhChung === true AND FileMinhChungUrl !== null)
  )
```

Prevents crediting submissions without required evidence.

### 5. UI Changes

**Modified:** `bulk-assignment-wizard.tsx` → Rename to `bulk-submission-wizard.tsx`

**New Flow:**
1. **Step 1: Select Activity**
   - Dropdown: unit activities + global activities
   - Display: activity name, type, evidence requirement
   - Info badge: "Requires evidence" or "No evidence required"

2. **Step 2: Select Practitioners** (existing cohort builder)
   - Filter by department, title, status
   - Select all / manual selection
   - Exclusions

3. **Step 3: Preview & Confirm**
   - Summary: "Creating [N] submissions for [Activity Name]"
   - Show: duplicate count, will-create count
   - Sample practitioner names (first 10)
   - Optional: Set event dates for all submissions

4. **Step 4: Result**
   - Success metrics: created, skipped, errors
   - Link to submissions list filtered by activity
   - Option to notify practitioners (future enhancement)

**Navigation:**
- Rename: "Bulk Assignment" → "Bulk Enrollment" or "Group Training Enrollment"
- Access: DonVi users only (for now), from Activities or Submissions nav

### 6. Audit Logging

Log bulk operations:
```typescript
{
  action: 'BULK_SUBMISSION_CREATE',
  actor: adminUserId,
  details: {
    activityId: MaDanhMuc,
    activityName: TenDanhMuc,
    cohortMode: 'all' | 'manual',
    cohortFilters: { ... },
    totalSelected: 45,
    totalExcluded: 3,
    created: 40,
    skipped: 2,
    timestamp: ISO8601,
  }
}
```

---

## Impact

### Affected Specifications

- **Modified:** `specs/cohort-builder/spec.md`
  - Add activity selection requirement
  - Add bulk submission creation workflow
  - Update preview/confirmation scenarios

- **Modified:** `specs/activity-submission/spec.md`
  - Add bulk creation requirement
  - Add duplicate prevention requirement
  - Clarify evidence-dependent credit calculation

### Affected Code

- **API**:
  - New: `src/app/api/submissions/bulk-create/route.ts`
  - Modified: Credit calculation logic in repositories (if not already correct)

- **Components**:
  - Modified: `src/components/submissions/bulk-assignment-wizard.tsx` (rename to `bulk-submission-wizard.tsx`)
  - Modified: `src/components/cohorts/cohort-builder.tsx` (add activity selection)

- **Repository**:
  - Modified: `src/lib/db/repositories.ts` - Add `ghiNhanHoatDongRepo.bulkCreate()`

- **Types**:
  - New: `BulkSubmissionRequest`, `BulkSubmissionResponse` types

### User Impact

**DonVi Admins:**
- ✅ Bulk-enroll practitioners in mandatory training (50+ in <1 minute)
- ✅ Clear audit trail of enrollment decisions
- ✅ Reduced manual tracking (system shows pending submissions)
- ⚠️ Learning curve: new workflow, must select activity first

**Practitioners:**
- ✅ Pre-created submissions show "what I need to do"
- ✅ Clarity on mandatory vs. voluntary activities
- ✅ Upload evidence directly to existing submission (no duplicate entry)
- ➖ No breaking changes (existing submission flow unchanged)

**SoYTe:**
- ✅ Can bulk-enroll across units for system-wide training
- ✅ Better compliance visibility

### Performance & Reliability

- **Bulk Create Performance**: <3 seconds for 500 submissions
- **Duplicate Detection**: Database-level check (fast)
- **Transaction Safety**: All-or-nothing bulk insert (rollback on errors)
- **Idempotency**: Re-running same cohort skips existing submissions gracefully

---

## Non-Goals (Out of Scope)

- ❌ **Notifications**: Email/push notifications to practitioners (separate feature)
- ❌ **Assignment Tracking**: Separate "assignment" entity with deadlines (future: `add-activity-assignments`)
- ❌ **Automated Approval**: Bulk submissions still require individual review
- ❌ **Recurring Enrollment**: Annual training cycles (future enhancement)
- ❌ **Training Calendar**: Session scheduling, capacity management (different domain)

---

## Security Considerations

### Tenancy Isolation

- **DonVi Validation**: All selected practitioners MUST belong to `user.unitId`
  ```typescript
  const invalidPractitioners = await db.query(`
    SELECT "MaNhanVien" FROM "NhanVien"
    WHERE "MaNhanVien" = ANY($1) AND "MaDonVi" != $2
  `, [practitionerIds, user.unitId]);

  if (invalidPractitioners.length > 0) {
    throw new ForbiddenError('Cannot create submissions for other units');
  }
  ```

- **SoYTe Exception**: Can bulk-create across units but must explicitly pass `unitId` per submission

### Data Integrity

- **Duplicate Prevention**: UNIQUE constraint on `(MaNhanVien, MaDanhMuc, NgayBatDau)` or app-level check
- **Catalog Validation**: Verify activity exists, is Active, within validity period
- **Audit Logging**: Immutable record of who created bulk submissions for whom

### Authorization

| Role           | Can Bulk Create | Scope                     |
|----------------|-----------------|---------------------------|
| SoYTe          | ✅               | Any unit                  |
| DonVi          | ✅               | Own unit only             |
| NguoiHanhNghe  | ❌               | N/A                       |
| Auditor        | ❌               | Read-only                 |

---

## Risks & Mitigations

| Risk                                      | Impact | Mitigation                                                                 |
|-------------------------------------------|--------|---------------------------------------------------------------------------|
| **Accidental bulk enrollment (wrong cohort)** | High   | Preview step shows practitioner count + sample names; require confirmation |
| **Duplicate submissions**                 | Medium | Database check before insert; show "skipped" count in results             |
| **Performance degradation (1000+ bulk)**  | Medium | Batch insert in chunks of 500; progress indicator; async job for 1000+    |
| **Credit calculation bugs (missing evidence)** | High   | Unit tests for evidence-dependent logic; validation on approval           |
| **Practitioner confusion (unexpected submissions)** | Medium | Future: notification on enrollment; clear UI showing "admin enrolled you" |
| **Audit trail loss**                      | Low    | Immutable audit log with cohort selection details                         |

---

## Alternatives Considered

### Alternative 1: Assignment-First Approach

**Idea:** Implement full "Assignment" entity with deadlines, reminders, status tracking (per `add-activity-assignments` proposal)

**Pros:** More comprehensive compliance tracking
**Cons:** Higher complexity, longer implementation time, requires notification system

**Decision:** **Rejected for Phase 1**. Current proposal delivers core value (bulk enrollment) faster. Assignments can be added later as enhancement.

### Alternative 2: Submission Templates

**Idea:** Practitioners create submissions from "templates" pre-configured by admin

**Pros:** Keeps practitioner-initiated workflow
**Cons:** Practitioners can ignore templates, no enrollment audit trail

**Decision:** **Rejected**. Doesn't solve mandatory training enrollment problem.

### Alternative 3: Activity Selection After Cohort Selection

**Idea:** Select practitioners first, then choose activity

**Pros:** Matches current wizard flow
**Cons:** Activity selection impacts preview (need catalog details for evidence requirement, conversion rate)

**Decision:** **Rejected**. Activity-first flow is more intuitive ("enroll cohort in X training").

---

## Open Questions

1. **Should practitioners be notified when enrolled?**
   → **Phase 1:** No notifications, practitioners see submissions in their list. **Future:** Add notification integration.

2. **Can practitioners delete bulk-created submissions?**
   → **Proposed:** No, only admins can delete. Prevents practitioners from "unenrolling" from mandatory training.

3. **Should admins be able to set custom event dates during bulk creation?**
   → **Phase 1:** Optional single `NgayBatDau`/`NgayKetThuc` for all submissions. **Future:** Individual date overrides.

4. **What if activity catalog is deleted after bulk submissions created?**
   → **Proposed:** Soft delete cascade prevention (block catalog deletion if active submissions exist).

5. **Should bulk creation support activities without catalog entries (ad-hoc)?**
   → **No.** Bulk creation is specifically for catalog-based mandatory training. Ad-hoc submissions remain individual.

---

## Success Metrics

### Quantitative

- **Adoption:** 70% of DonVi units use bulk enrollment within 2 months
- **Efficiency:** Avg. time to enroll 50 practitioners: <2 minutes (vs. 30+ manual)
- **Volume:** 500+ bulk submissions created per month across platform
- **Error Rate:** <1% failed bulk creations

### Qualitative

- Admins report "significant time savings" for mandatory training
- Practitioners report "clear visibility into required activities"
- Zero critical bugs in bulk creation logic after 2 weeks
- Positive feedback from 80%+ of pilot users

---

## Implementation Phases

### Phase 1: Core Bulk Enrollment (Sprint 1-2)
- API endpoint for bulk submission creation
- Cohort builder with activity selection
- Preview/confirmation flow
- Audit logging
- Unit tests for duplicate prevention, tenancy checks

### Phase 2: Evidence Validation (Sprint 2)
- Update credit calculation logic (evidence-dependent)
- Validation: block approval if evidence required but missing
- Admin UI: show evidence status in submission list

### Phase 3: Polish & Optimization (Sprint 3)
- Performance optimization for 500+ bulk creates
- Improved error handling and user feedback
- Accessibility audit
- Documentation for admins

### Phase 4: Enhancements (Future)
- Practitioner notifications on enrollment
- Bulk edit (update event dates for cohort)
- Export enrollment report
- Integration with assignment/deadline tracking

---

## Next Steps

1. **Review & Approval:** Share with stakeholders (DonVi admins, tech lead)
2. **Validation:** Confirm business rules with domain expert
3. **Spec Writing:** Complete delta specs for affected capabilities
4. **Tasks Breakdown:** Create detailed `tasks.md` checklist
5. **Design Details:** Write `design.md` with API contracts, state machines
6. **Implementation:** Begin Phase 1 after approval

---

## References

- Existing cohort builder: `src/components/cohorts/cohort-builder.tsx`
- Bulk wizard: `src/components/submissions/bulk-assignment-wizard.tsx`
- Submission API: `src/app/api/submissions/route.ts`
- Activity catalog spec: `openspec/specs/activity-catalog/` (if exists)
- Original assignment proposal: `openspec/changes/add-activity-assignments/proposal.md`
