# Change Proposal: Add Activity Assignments (Mandatory Training)

**Change ID:** `add-activity-assignments`  
**Type:** Feature Addition  
**Status:** Draft  
**Created:** 2025-11-03  
**Author:** AI Assistant (for review)

---

## Why

### Problem Statement
DonVi admins can create activity catalog entries and practitioners can voluntarily submit activities, but there is no mechanism for **mandatory training assignments**. Healthcare units need to:
- Assign required CPD activities to groups of practitioners (e.g., "COVID-19 Safety Training for all nurses")
- Track completion rates and compliance deadlines
- Send reminders for overdue assignments
- Plan training budgets and resource allocation

Currently, admins must manually notify each practitioner via external channels (email, meetings) and track completion in spreadsheets. This creates:
- Poor visibility into training compliance
- Manual overhead for repetitive mandatory training
- No audit trail for who was assigned what and when
- Missed deadlines and compliance gaps

### Current State
- **Catalog exists** (`DanhMucHoatDong`) but serves only as template library
- **Cohort Builder exists** (`/submissions/bulk`) but only for bulk approval, not pre-assignment
- **Submissions** (`GhiNhanHoatDong`) are practitioner-initiated, not admin-assigned
- No link between "activity should be done by X" and "activity was completed by X"

### Business Impact
- **Compliance Risk**: Unable to prove mandatory training was assigned and completed
- **Admin Overhead**: Manual tracking of 100+ practitioners per training cycle
- **Delayed Response**: Weeks to identify non-compliant staff for urgent training
- **Budget Waste**: Training sessions booked without knowing who needs to attend

---

## What Changes

### 1. Data Model & Migration
- **New table** `GanHoatDong` (Activity Assignments) with fields:
  - `MaGan` (UUID, PK)
  - `MaDanhMuc` (FK to `DanhMucHoatDong`) - which activity catalog entry
  - `MaNhanVien` (FK to `NhanVien`) - assigned to whom
  - `MaDonVi` (FK to `DonVi`) - unit ownership for tenancy
  - `NgayGan` (timestamp) - when assigned
  - `HanHoanThanh` (date, nullable) - optional deadline
  - `TrangThai` (enum: `ChuaHoanThanh`, `DangThucHien`, `ChoXacNhan`, `DaHoanThanh`, `QuaHan`)
  - `NguoiGan` (FK to `TaiKhoan`) - who created the assignment
  - `GhiChu` (text, nullable) - admin notes
  - `MaGhiNhan` (FK to `GhiNhanHoatDong`, nullable) - linked submission when completed
  - Unique constraint: `(MaDanhMuc, MaNhanVien)` to prevent duplicate assignments
  - Indexes: `(MaDonVi, TrangThai)`, `(MaNhanVien, TrangThai, HanHoanThanh)`

- **New enum** `assignment_status`:
  ```sql
  CREATE TYPE assignment_status AS ENUM (
    'ChuaHoanThanh',  -- Not started
    'DangThucHien',   -- In progress (submission created but pending approval)
    'ChoXacNhan',     -- Submitted, awaiting approval
    'DaHoanThanh',    -- Approved and completed
    'QuaHan'          -- Overdue (computed via HanHoanThanh < now())
  );
  ```

- **Migration 004**: Create table, indexes, add `MaGan` nullable FK to `GhiNhanHoatDong` for bidirectional link

### 2. Repository & Service Layer
- **New repository** `GanHoatDongRepository` with methods:
  - `createBulkAssignments(catalogId, practitionerIds, assignerId, unitId, deadline?, notes?)` → returns `{ created: number, skipped: number, assignmentIds: string[] }`
  - `findByPractitioner(practitionerId, filters?)` → practitioner's assignments with status
  - `findByUnit(unitId, filters?)` → admin view of all unit assignments
  - `getCompletionStats(assignmentIds)` → `{ total, completed, inProgress, notStarted, overdue }`
  - `updateStatus(assignmentId, newStatus)` → triggered by submission lifecycle
  - `sendReminders(assignmentIds)` → queues notification events
  - Enforce **tenancy**: all queries filter by `MaDonVi` for DonVi role

- **Update** `GhiNhanHoatDongRepository`:
  - `create()` accepts optional `MaGan` to link submission to assignment
  - On create: update `GanHoatDong.TrangThai = 'DangThucHien'` and set `MaGhiNhan`
  - On approval: update `GanHoatDong.TrangThai = 'DaHoanThanh'`
  - On rejection: update `GanHoatDong.TrangThai = 'ChuaHoanThanh'`, clear `MaGhiNhan`

- **Audit logging**: Log all bulk assignments with cohort selection metadata

### 3. API Endpoints

#### New Routes
- **POST `/api/assignments/bulk`** (DonVi, SoYTe)
  - Body: `{ MaDanhMuc, cohort: { mode, filters, selectedIds, excludedIds }, HanHoanThanh?, GhiChu? }`
  - Returns: `{ created, skipped, duplicates, assignmentIds, message }`
  - Idempotent: duplicate assignments skip gracefully

- **GET `/api/assignments/my-assignments`** (NguoiHanhNghe)
  - Query: `?status=all|pending|completed&sort=deadline|assigned`
  - Returns: `{ assignments: [{ MaGan, activity, deadline, status, daysRemaining }], stats }`

- **GET `/api/assignments/tracking`** (DonVi, SoYTe)
  - Query: `?catalogId=uuid&unitId=uuid&status=filter`
  - Returns: `{ assignments, stats: { total, completed, overdue, completionRate }, practitioners }`

- **POST `/api/assignments/:id/remind`** (DonVi, SoYTe)
  - Body: `{ message? }` (optional custom message)
  - Sends notification to assigned practitioner
  - Returns: `{ sent: boolean, message }`

- **DELETE `/api/assignments/:id`** (DonVi, SoYTe)
  - Soft delete assignment (preserve audit trail)
  - Unlink from submission if exists

#### Modified Routes
- **POST `/api/submissions`**
  - Add optional field: `MaGan?: string` (link to assignment)
  - On success with `MaGan`: update assignment status

### 4. Frontend Components

#### New Pages
- **`/my-assignments`** (NguoiHanhNghe)
  - List view with status badges (overdue in red, pending in yellow, completed in green)
  - Sort by deadline, filter by status
  - Click → opens submission form pre-filled with catalog activity
  - Shows days remaining for deadlines

- **`/assignments/tracking`** (DonVi)
  - Completion dashboard with progress bars per training
  - Filter by activity catalog, deadline range, status
  - Bulk reminder button for overdue/pending assignments
  - Export compliance report (CSV)

#### Modified Components
- **Activities List** (`/activities`)
  - Add **"Assign to Practitioners"** button on catalog entries (DonVi role only)
  - Opens assignment wizard modal/sheet

- **Assignment Wizard** (new component, reuses Cohort Builder)
  1. **Step 1**: Select catalog activity (pre-selected if clicked from activities page)
  2. **Step 2**: Select practitioners using existing `CohortBuilder` component
  3. **Step 3**: Set deadline (optional), add notes (optional)
  4. **Step 4**: Preview (shows: "Will create 45 assignments, 3 duplicates skipped")
  5. **Step 5**: Confirm → POST to `/api/assignments/bulk`

- **Submission Form**
  - Detect if submission is fulfilling an assignment (`MaGan` passed via URL param)
  - Show banner: "📋 Fulfilling assignment: [Activity Name] • Deadline: [Date]"
  - Auto-link submission to assignment on create

- **Cohort Builder** (existing component)
  - No changes needed, just reused in assignment wizard context

### 5. Notifications Integration
- **Trigger events**:
  - On assignment creation → notify practitioner: "You have been assigned: [Activity Name]"
  - 7 days before deadline → reminder notification
  - On deadline → overdue notification
  - On submission approval → confirmation notification

- Uses existing `ThongBao` system with new `LoaiThongBao` values:
  - `GanHoatDong` (assignment created)
  - `NhacNhoHoanThanh` (deadline reminder)
  - `QuaHan` (overdue warning)

### 6. Business Rules & Constraints
- **Assignment scope**: DonVi can only assign to practitioners in their unit
- **Catalog requirements**: Only "Active" catalog entries can be assigned
- **Duplicate prevention**: Same `(MaDanhMuc, MaNhanVien)` pair blocked at DB level
- **Status transitions**:
  - `ChuaHoanThanh` → `DangThucHien` (submission created)
  - `DangThucHien` → `ChoXacNhan` (submission auto-transitions)
  - `ChoXacNhan` → `DaHoanThanh` (admin approves) OR `ChuaHoanThanh` (admin rejects)
  - Any status → `QuaHan` (computed: `HanHoanThanh < now() AND TrangThai != 'DaHoanThanh'`)

- **Overdue logic**: Computed in queries, not stored (avoid stale data)

---

## Impact

### Affected Specifications
- **New**: `specs/activity-assignments/spec.md` (core assignment workflow)
- **Modified**: `specs/activity-submission/spec.md` (add assignment linking)
- **Modified**: `specs/cohort-builder/spec.md` (document reuse in assignment context)
- **Modified**: `specs/notifications/spec.md` (add assignment notification types)

### Code Areas
- **Database**: Migration `migrations/004_add_activity_assignments.sql`
- **Schemas**: `src/lib/db/schemas.ts` (add `GanHoatDong`, update `GhiNhanHoatDong`)
- **Repository**: New `GanHoatDongRepository`, update `GhiNhanHoatDongRepository`
- **API**: New `/api/assignments/*`, modify `/api/submissions`
- **UI**: New pages `/my-assignments`, `/assignments/tracking`, new `AssignmentWizard` component
- **Tests**: New integration tests, update submission tests

### User Impact
- **NguoiHanhNghe**: 
  - New "My Assignments" page shows required activities
  - Clear visibility into deadlines and overdue status
  - Seamless flow from assignment → submission
  
- **DonVi Admin**: 
  - Bulk assign activities to cohorts (save hours vs. manual tracking)
  - Real-time compliance dashboard
  - Automated reminders reduce follow-up overhead

- **SoYTe**: 
  - Can assign system-wide mandatory training (global catalog entries)
  - Cross-unit compliance reporting
  - No UI changes for existing workflows

### Performance & Reliability
- **Query optimization**: Indexes on `(MaDonVi, TrangThai)` and `(MaNhanVien, TrangThai, HanHoanThanh)`
- **Bulk operations**: Create 500 assignments in <3 seconds
- **Status computation**: `QuaHan` computed in SELECT, not UPDATE (avoid cron jobs)
- **Idempotency**: Re-running bulk assignment is safe (no duplicates)

---

## Non-Goals

### Out of Scope for This Change
- **Recurring assignments** (e.g., annual training cycles) → Future enhancement
- **Training calendar integration** (booking slots, capacity management) → Separate feature
- **Auto-assignment rules** (e.g., "All new hires get X") → Future enhancement
- **Completion certificates** (auto-generated PDFs) → Separate feature
- **Points/gamification** (leaderboards, badges) → Not aligned with compliance focus
- **External training providers** (SCORM integration) → Different domain

---

## Security Considerations

### Tenancy Isolation
- All assignment queries **MUST** filter by `MaDonVi` for DonVi role
- Block cross-unit assignments: Validate `MaNhanVien.MaDonVi = user.unitId`
- SoYTe can assign across units but must explicitly pass `unitId`

### Privilege Escalation Prevention
- DonVi cannot assign global activities not visible to them
- Practitioners cannot modify assignment status directly (only via submission approval)
- Audit log captures who assigned what to whom

### Data Privacy
- Assignment notes visible only to assigner and assignee
- Compliance reports aggregate data (no PII in exports)
- Deleted assignments retained for audit (soft delete)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Practitioners ignore assignments | High | Email notifications + overdue warnings + dashboard visibility |
| Bulk assignment errors (wrong cohort) | Medium | Preview step shows affected practitioners; allow cancel/delete |
| Duplicate work (manual + assigned) | Low | UI detects existing assignment, offers "Fulfill now" shortcut |
| Performance degradation (1000+ assignments) | Medium | Paginated queries, background job for notifications, indexes |
| Notification spam | Medium | Configurable reminder frequency (default: 7 days before + deadline day) |
| Deadline confusion (timezones) | Low | Store dates in UTC, display in user's local timezone |

---

## Open Questions

1. **Should assignments be visible to other unit admins?**  
   → **Proposed**: No, only creator + assignee + SoYTe can view. Preserves unit privacy.

2. **Can practitioners reject assignments?**  
   → **Proposed**: No, assignments are mandatory. Practitioners can comment/escalate to admin.

3. **Should we support group deadlines vs. individual deadlines?**  
   → **Phase 1**: Single deadline per bulk assignment. **Phase 2**: Individual overrides.

4. **What happens if catalog activity is deleted after assignment?**  
   → **Proposed**: Soft delete cascade prevention (block deletion if active assignments exist).

5. **Should completed assignments count toward CPD credits?**  
   → **Yes**, via linked `GhiNhanHoatDong` submission (existing logic).

---

## Success Metrics

### Quantitative
- **Adoption**: 80% of DonVi units use assignments within 3 months
- **Efficiency**: Reduce admin time from 2 hours → 15 minutes per training cycle
- **Compliance**: Increase on-time completion rate from 65% → 85%
- **Notification engagement**: 70% of reminders result in submission within 48 hours

### Qualitative
- DonVi admins report "significant reduction in manual tracking"
- Practitioners report "clear visibility into required training"
- Zero escalations for "I didn't know this was required"

---

## Implementation Phases

### Phase 1: Core Assignment Workflow (Sprint 1-2)
- Database schema + migration
- Repository layer with bulk create
- API endpoints (create, list, tracking)
- Basic UI (assignment wizard, practitioner list)
- Link assignments to submissions

### Phase 2: Notifications & Reminders (Sprint 3)
- Notification integration
- Automated reminder system
- Overdue status computation
- Email notifications (if email system exists)

### Phase 3: Dashboard & Reporting (Sprint 4)
- Completion tracking dashboard
- Export compliance reports
- Bulk reminder UI
- Analytics integration

### Phase 4: Polish & Optimization (Sprint 5)
- Performance tuning (indexes, query optimization)
- Accessibility audit
- Mobile responsive improvements
- User feedback incorporation

---

## Next Steps

1. **Review & approval**: Share proposal with stakeholders (DonVi admins, practitioners, SoYTe)
2. **Spec writing**: Create detailed spec deltas for affected capabilities
3. **Technical design**: Write `design.md` with DB schema, API contracts, state machine
4. **Task breakdown**: Create `tasks.md` with concrete implementation checklist
5. **Validation**: Run `openspec validate add-activity-assignments --strict`
6. **Implementation**: Begin Phase 1 after approval

---

## References

- Existing cohort builder: `openspec/changes/archive/2025-10-26-add-cohort-builder-dynamic-groups/`
- Activity catalog scope: `openspec/changes/add-donvi-activities-access/`
- Submission workflow: `src/app/api/submissions/route.ts`
- Current practitioner compliance tracking: `src/lib/db/repositories.ts` (lines 300-420)
