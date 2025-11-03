# Implementation Tasks: Add Activity Assignments

## 1. Database & Schema
- [ ] 1.1 Create migration `004_add_activity_assignments.sql` with `GanHoatDong` table, `assignment_status` enum, and indexes
- [ ] 1.2 Add `MaGan` nullable FK column to `GhiNhanHoatDong` for bidirectional linking
- [ ] 1.3 Add unique constraint `UNIQUE(MaDanhMuc, MaNhanVien)` to prevent duplicate assignments
- [ ] 1.4 Create indexes: `idx_gan_hoat_dong_donvi_status`, `idx_gan_hoat_dong_nhanvien`, `idx_gan_hoat_dong_deadline`
- [ ] 1.5 Test migration forward/backward compatibility and verify indexes used by EXPLAIN
- [ ] 1.6 Update Zod schemas: create `GanHoatDongSchema`, `CreateGanHoatDongSchema`, update `GhiNhanHoatDongSchema`

### Acceptance Criteria
- 1.1 Migration runs successfully on test database; `GanHoatDong` table created with all fields and FK constraints
- 1.2 `GhiNhanHoatDong` accepts nullable `MaGan` field; ON DELETE SET NULL behavior verified
- 1.3 Attempting to insert duplicate `(MaDanhMuc, MaNhanVien)` returns UNIQUE constraint violation
- 1.4 EXPLAIN plans use indexes for common queries (find by unit, by practitioner, by deadline)
- 1.5 Rollback migration drops table and restores previous schema without errors
- 1.6 Zod validation passes for valid payloads; rejects invalid status values, missing required fields

---

## 2. Repository & Service Layer
- [ ] 2.1 Create `GanHoatDongRepository` class extending `BaseRepository`
- [ ] 2.2 Implement `createBulkAssignments(catalogId, practitionerIds, assignerId, unitId, deadline?, notes?)` with transaction
- [ ] 2.3 Implement `findByPractitioner(practitionerId, filters)` with status filtering and deadline sorting
- [ ] 2.4 Implement `findByUnit(unitId, filters)` with pagination and tenant isolation
- [ ] 2.5 Implement `getCompletionStats(assignmentIds)` returning aggregate counts by status
- [ ] 2.6 Implement `updateStatus(assignmentId, newStatus, submissionId?)` with audit logging
- [ ] 2.7 Update `GhiNhanHoatDongRepository.create()` to accept `MaGan` and trigger status update
- [ ] 2.8 Update `GhiNhanHoatDongRepository.approveActivities()` to update linked assignment status to `DaHoanThanh`
- [ ] 2.9 Add audit logging for all assignment mutations via `nhatKyHeThongRepo`
- [ ] 2.10 Write unit tests for repository methods covering bulk create, status transitions, tenant isolation

### Acceptance Criteria
- 2.1 `GanHoatDongRepository` instantiates without errors; extends base CRUD methods
- 2.2 Bulk create handles 500+ assignments in <3s; returns `{ created, skipped, duplicates }`; transaction rolls back on error
- 2.3 Practitioner queries filter by `MaNhanVien`; support `status` and `deadline` filters; return enriched objects with activity details
- 2.4 Unit queries enforce `MaDonVi = user.unitId` for DonVi; SoYTe can query all units; pagination works correctly
- 2.5 Stats return accurate counts for `total`, `completed`, `inProgress`, `notStarted`, `overdue`; computed `QuaHan` status based on deadline
- 2.6 Status updates are idempotent; invalid transitions logged as warnings; links to submission when `MaGhiNhan` provided
- 2.7 Submission creation with `MaGan` updates `GanHoatDong.TrangThai` to `DangThucHien` and sets `MaGhiNhan`
- 2.8 Bulk approval updates all linked assignments to `DaHoanThanh`; rejection resets to `ChuaHoanThanh`
- 2.9 Audit log includes action, actor, unitId, affected practitioner IDs, catalog ID, timestamp
- 2.10 All unit tests pass in CI; code coverage ≥ 80% for assignment repository

---

## 3. API Endpoints
- [ ] 3.1 Create `POST /api/assignments/bulk` endpoint for bulk assignment creation
- [ ] 3.2 Create `GET /api/assignments/my-assignments` endpoint for practitioner assignment list
- [ ] 3.3 Create `GET /api/assignments/tracking` endpoint for admin dashboard
- [ ] 3.4 Create `POST /api/assignments/:id/remind` endpoint for sending reminders
- [ ] 3.5 Create `DELETE /api/assignments/:id` endpoint for soft delete
- [ ] 3.6 Update `POST /api/submissions` to accept optional `MaGan` field and link assignment
- [ ] 3.7 Add RBAC checks: DonVi scope to own unit, NguoiHanhNghe to own assignments, SoYTe global access
- [ ] 3.8 Add input validation using Zod schemas; return 400 for invalid payloads
- [ ] 3.9 Add rate limiting to bulk endpoints (10 req/min per user)
- [ ] 3.10 Write integration tests for all endpoints covering success paths, error cases, and RBAC violations

### Acceptance Criteria
- 3.1 Bulk create accepts cohort selection; resolves to practitioner IDs using existing cohort logic; returns `{ created, skipped, assignmentIds }`; DonVi can only assign to own unit
- 3.2 Practitioner endpoint returns assignments with status, deadline, activity details; supports `status` and `sort` query params; 401 if unauthenticated
- 3.3 Admin tracking endpoint returns assignments, stats, and completion rate; filters by catalogId, unitId, status; enforces unit scope for DonVi
- 3.4 Remind endpoint queues notification (integration with existing `ThongBao` system); returns `{ sent: true }`; 403 if not admin
- 3.5 Delete soft-deletes assignment; unlinks from submission if exists; audit logged; 403 if unauthorized
- 3.6 Submission creation with `MaGan` links to assignment and updates status; validates assignment exists and belongs to practitioner
- 3.7 DonVi attempting to create assignments for other units returns 403; practitioners accessing others' assignments returns 403
- 3.8 Invalid payloads return 400 with Zod error details; missing required fields rejected
- 3.9 Rate limit exceeded returns 429; logged for monitoring
- 3.10 Integration tests cover all endpoints with mock data; test matrix includes (DonVi, SoYTe, NguoiHanhNghe) × (success, unauthorized, forbidden)

---

## 4. Frontend - Practitioner View
- [ ] 4.1 Create `/my-assignments` page for practitioners
- [ ] 4.2 Implement assignment list component with status badges (overdue=red, pending=yellow, completed=green)
- [ ] 4.3 Add sorting by deadline (ascending) and status filtering
- [ ] 4.4 Display days remaining for upcoming deadlines; "Overdue by X days" for past deadlines
- [ ] 4.5 Add "Start Assignment" button that navigates to submission form with `MaGan` pre-filled
- [ ] 4.6 Add empty state: "No assignments yet" with illustration
- [ ] 4.7 Update navigation menu to include "My Assignments" link (badge shows count of pending)
- [ ] 4.8 Test responsive design on mobile (list → cards on small screens)

### Acceptance Criteria
- 4.1 Page accessible at `/my-assignments` for role NguoiHanhNghe; 403 for other roles; fetches data from `/api/assignments/my-assignments`
- 4.2 Status badges render correctly; color-coded by status; icon indicators for overdue (⏰), pending (⏳), completed (✅)
- 4.3 Sort dropdown changes order; filter dropdown updates list; URL query params reflect selections
- 4.4 Deadline display shows "Due in 5 days" or "Overdue by 3 days"; computed client-side from `HanHoanThanh`
- 4.5 Button click navigates to `/submissions/new?assignmentId=<MaGan>`; pre-selects catalog activity; shows assignment context banner
- 4.6 Empty state renders when no assignments; includes CTA to browse available activities
- 4.7 Navigation link appears only for practitioners; badge count updates in real-time on assignment changes
- 4.8 Mobile layout stacks cards vertically; touch-friendly tap targets; swipe actions for quick completion

---

## 5. Frontend - Admin Assignment Wizard
- [ ] 5.1 Add "Assign to Practitioners" button on activity catalog entries (visible to DonVi/SoYTe only)
- [ ] 5.2 Create `AssignmentWizard` component using Sheet/Modal pattern (similar to bulk approval wizard)
- [ ] 5.3 Step 1: Confirm selected activity catalog entry (pre-filled from context)
- [ ] 5.4 Step 2: Integrate existing `CohortBuilder` component for practitioner selection
- [ ] 5.5 Step 3: Add deadline picker (optional) and notes textarea (optional)
- [ ] 5.6 Step 4: Preview screen showing "Will create X assignments, Y duplicates skipped"
- [ ] 5.7 Step 5: Submit to `/api/assignments/bulk` and show success/error feedback
- [ ] 5.8 Add loading states, error handling, and optimistic UI updates
- [ ] 5.9 Test wizard flow end-to-end with cohort filters, select-all, and exclusions

### Acceptance Criteria
- 5.1 Button visible on activities list for DonVi/SoYTe; hidden for other roles; click opens wizard
- 5.2 Wizard renders in Sheet component; multi-step indicator shows progress; back/next navigation works
- 5.3 Step 1 displays activity name, description, credit details; "Next" button proceeds
- 5.4 Step 2 reuses `CohortBuilder` with same filters/selection logic; selection state persists across steps
- 5.5 Step 3 date picker allows future dates only; notes textarea optional; validation shows inline errors
- 5.6 Preview fetches estimated counts (dry-run call); displays breakdown with sample practitioner names
- 5.7 Submit button disabled until preview loads; success shows toast notification with count; error displays retry option
- 5.8 Loading spinner during submission; error boundary catches exceptions; optimistic list update adds new assignments
- 5.9 Manual test checklist passes: (filter by department, select 50, exclude 5, set deadline, preview, confirm) → assignments created

---

## 6. Frontend - Admin Tracking Dashboard
- [ ] 6.1 Create `/assignments/tracking` page for DonVi/SoYTe
- [ ] 6.2 Display completion stats card: total assigned, completed, in progress, overdue, completion rate %
- [ ] 6.3 Add filter controls: activity catalog dropdown, date range picker, status filter
- [ ] 6.4 Implement assignment table with columns: Practitioner, Activity, Assigned Date, Deadline, Status, Actions
- [ ] 6.5 Add bulk reminder button (select multiple overdue assignments → send reminders)
- [ ] 6.6 Add export button to download CSV report (filtered data)
- [ ] 6.7 Add progress bars for visual completion tracking per activity catalog
- [ ] 6.8 Test dashboard performance with 1000+ assignments (pagination, virtualization if needed)

### Acceptance Criteria
- 6.1 Page accessible at `/assignments/tracking` for DonVi/SoYTe; 403 for others; navigation link appears in admin menu
- 6.2 Stats card fetches from `/api/assignments/tracking` with filters; displays aggregate counts; completion % shows progress ring
- 6.3 Filters update URL query params; table refreshes on filter change; debounced search input
- 6.4 Table displays enriched data (practitioner names, activity titles); sortable columns; click row → view assignment details
- 6.5 Checkbox selection enables bulk actions; "Send Reminders" button calls `/api/assignments/:id/remind` for each selected; shows progress toast
- 6.6 Export button generates CSV with headers: "Practitioner Name", "Activity", "Status", "Deadline", "Completed Date"; downloads file
- 6.7 Progress bars show % completion per catalog entry; color-coded green (>80%), yellow (50-80%), red (<50%)
- 6.8 Dashboard renders 1000 assignments in <2s; pagination shows 50 per page; no UI jank on scroll

---

## 7. Notifications Integration
- [ ] 7.1 Add new `LoaiThongBao` enum values: `GanHoatDong`, `NhacNhoHoanThanh`, `QuaHan`
- [ ] 7.2 Implement notification trigger on assignment creation (call existing notification API)
- [ ] 7.3 Implement reminder notification 7 days before deadline (cron job or scheduled task)
- [ ] 7.4 Implement overdue notification on deadline day if not completed
- [ ] 7.5 Add notification template with dynamic fields: activity name, deadline, assigner name
- [ ] 7.6 Update practitioner notification center to link notifications to `/my-assignments`
- [ ] 7.7 Test notification delivery end-to-end (create assignment → verify notification received)

### Acceptance Criteria
- 7.1 Enum updated in database and Zod schema; migration handles existing notifications
- 7.2 Assignment creation triggers notification within 5 seconds; notification includes activity details and deadline
- 7.3 Scheduled job runs daily at 9 AM; sends reminders for assignments with deadline in 7 days; batch processing handles 1000+ reminders
- 7.4 Overdue notifications sent on deadline day at 6 PM; status filter ensures only `ChuaHoanThanh` and `DangThucHien` trigger
- 7.5 Templates render correctly with variables; supports Vietnamese localization; includes deep link to assignment
- 7.6 Clicking notification navigates to `/my-assignments?highlight=<MaGan>`; scrolls to and highlights assignment row
- 7.7 End-to-end test: create assignment, wait for notification (mocked cron), verify content and link

---

## 8. Submission Form Updates
- [ ] 8.1 Update submission form to detect `assignmentId` URL query param
- [ ] 8.2 Fetch assignment details if `assignmentId` present
- [ ] 8.3 Display assignment context banner: "📋 Fulfilling assignment: [Activity Name] • Deadline: [Date]"
- [ ] 8.4 Pre-select catalog activity from assignment (disable activity selector)
- [ ] 8.5 Auto-populate `MaGan` field in submission payload
- [ ] 8.6 Show confirmation message on submit: "Assignment marked as in progress"
- [ ] 8.7 Test fulfillment flow: start from assignment list → submit → verify status update

### Acceptance Criteria
- 8.1 Form reads `assignmentId` from URL; validates UUID format; ignores if invalid
- 8.2 Fetches assignment from `/api/assignments/:id`; handles 404 gracefully; shows loading state
- 8.3 Banner renders above form; displays activity name and deadline; visually distinct (colored border)
- 8.4 Activity selector grayed out with value locked; tooltip explains "Pre-selected from assignment"
- 8.5 Submission POST includes `MaGan` field; server validates assignment exists and matches practitioner
- 8.6 Success toast shows "Assignment started! Complete it before [deadline]"; redirects to `/my-assignments`
- 8.7 Manual test: click "Start Assignment" → fill evidence → submit → verify assignment status changed to `DangThucHien`

---

## 9. Testing & Quality
- [ ] 9.1 Write unit tests for repository layer (bulk create, status transitions, stats computation)
- [ ] 9.2 Write integration tests for API endpoints (success, error, RBAC paths)
- [ ] 9.3 Write E2E tests with Playwright: (create assignment → practitioner fulfills → admin approves → verify completion)
- [ ] 9.4 Test idempotency: re-run bulk assignment → verify no duplicates created
- [ ] 9.5 Test edge cases: deadline in past, invalid catalog ID, practitioner from different unit
- [ ] 9.6 Test performance: bulk create 1000 assignments, query tracking dashboard
- [ ] 9.7 Run accessibility audit (WCAG 2.1 AA compliance)
- [ ] 9.8 Test mobile responsiveness (iOS/Android)

### Acceptance Criteria
- 9.1 Unit tests cover ≥80% of repository code; all pass in CI; test isolation (no shared state)
- 9.2 Integration tests cover all endpoints; test matrix includes role × action × outcome; mock database calls
- 9.3 E2E test completes full workflow in <30s; runs in headless browser; screenshots on failure
- 9.4 Idempotency test: run bulk create twice with same params → second run skips all (0 created)
- 9.5 Edge cases handled gracefully: past deadline shows warning but allows creation; invalid IDs return 400; cross-unit assignment blocked
- 9.6 Performance benchmarks: 1000 assignments created in <5s; dashboard renders in <2s with 1000 rows
- 9.7 No critical a11y violations (automated scan); keyboard navigation works; screen reader tested
- 9.8 UI functional on iPhone SE (375px) and iPad (768px); no horizontal scroll; touch targets ≥44px

---

## 10. Documentation & Rollout
- [ ] 10.1 Update user documentation: "How to assign mandatory training" (admin guide)
- [ ] 10.2 Update user documentation: "How to complete assigned activities" (practitioner guide)
- [ ] 10.3 Create admin training video (5 min screencast)
- [ ] 10.4 Update API documentation with new endpoints and examples
- [ ] 10.5 Add feature announcement banner in app (dismissible)
- [ ] 10.6 Monitor usage metrics: assignments created per week, completion rate, reminder effectiveness
- [ ] 10.7 Collect user feedback via in-app survey (first 2 weeks)
- [ ] 10.8 Plan gradual rollout: pilot with 3 units → expand to all units

### Acceptance Criteria
- 10.1 Admin guide published in docs site; includes screenshots and step-by-step instructions; reviewed by DonVi admin
- 10.2 Practitioner guide published; includes FAQ ("What if I miss deadline?", "Can I reject?"); accessible from `/my-assignments`
- 10.3 Screencast uploaded to internal training portal; covers wizard flow, tracking dashboard, reminders
- 10.4 API docs updated with OpenAPI spec; includes request/response examples, error codes
- 10.5 Banner appears on login for DonVi/NguoiHanhNghe; links to guides; dismissal state persists
- 10.6 Analytics dashboard tracks metrics; weekly reports sent to stakeholders; alerts for <50% completion rate
- 10.7 Survey shows ≥4/5 satisfaction rating; feedback categorized and prioritized
- 10.8 Pilot units (3) use feature for 2 weeks; collect feedback; fix critical issues before full rollout

---

## Rollout Phases

### Phase 1: Core Infrastructure (Week 1-2)
- Tasks: 1.1-1.6, 2.1-2.10, 3.1-3.10
- Deliverable: Backend functional with API endpoints

### Phase 2: Practitioner Experience (Week 3)
- Tasks: 4.1-4.8, 8.1-8.7
- Deliverable: Practitioners can view and fulfill assignments

### Phase 3: Admin Tools (Week 4)
- Tasks: 5.1-5.9, 6.1-6.8
- Deliverable: Admins can create and track assignments

### Phase 4: Automation & Polish (Week 5)
- Tasks: 7.1-7.7, 9.1-9.8, 10.1-10.8
- Deliverable: Notifications, testing, documentation complete

### Phase 5: Pilot & Rollout (Week 6+)
- 3 pilot units test for 2 weeks
- Collect feedback and iterate
- Full rollout to all units

---

## Definition of Done

- [ ] All tasks marked complete with `[x]`
- [ ] Code merged to `main` branch via PR with 2+ approvals
- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance benchmarks met (defined in acceptance criteria)
- [ ] Accessibility audit passed
- [ ] Documentation published
- [ ] Deployed to staging and verified by QA
- [ ] Deployed to production with feature flag enabled for pilot units
- [ ] Metrics dashboard configured and monitored
- [ ] Post-deployment review scheduled (2 weeks after pilot)
