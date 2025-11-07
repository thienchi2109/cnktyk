# Implementation Tasks: Refactor Cohort Builder for Bulk Submission Creation

## 1. API Layer

### 1.1 Create Bulk Submission Endpoint
- [x] 1.1.1 Create `src/app/api/submissions/bulk-create/route.ts`
- [x] 1.1.2 Implement POST handler with Zod validation
- [x] 1.1.3 Add authentication check (DonVi, SoYTe only)
- [x] 1.1.4 Implement cohort resolution logic (mode: all/manual)
- [x] 1.1.5 Add tenant validation (DonVi cannot cross units)
- [x] 1.1.6 Enforce activity ownership check for DonVi users (unit-owned or global only)
- [x] 1.1.7 Implement duplicate detection query
- [x] 1.1.8 Add activity catalog validation (Active status, validity period)
- [x] 1.1.9 Determine initial status based on YeuCauMinhChung
- [x] 1.1.10 Call repository bulkCreate method
- [x] 1.1.11 Add audit logging for bulk operation
- [x] 1.1.12 Return structured response with created/skipped counts
- [x] 1.1.13 Add error handling with proper HTTP status codes
- [x] 1.1.14 Recompute cohort server-side (ignore client-provided totals/exclusions tampering)
- [x] 1.1.15 Merge repository conflicts into duplicate set so skipped count reflects DB `ON CONFLICT`

### 1.2 Request/Response Types
- [x] 1.2.1 Define `BulkSubmissionRequest` interface in types file
- [x] 1.2.2 Define `BulkSubmissionResponse` interface
- [x] 1.2.3 Create Zod schema for request validation
- [x] 1.2.4 Export types for frontend consumption

## 2. Repository Layer

### 2.1 Add Bulk Create Method
- [x] 2.1.1 Add `bulkCreate()` method to `GhiNhanHoatDongRepository`
- [x] 2.1.2 Implement parameterized bulk INSERT query
- [x] 2.1.3 Use RETURNING clause to get created submission IDs
- [x] 2.1.4 Wrap in transaction for atomicity
- [x] 2.1.5 Add batching logic for >500 submissions
- [x] 2.1.6 Add error handling for constraint violations

### 2.2 Helper Functions
- [x] 2.2.1 Implement `resolveCohort()` utility function
- [x] 2.2.2 Implement `validatePractitionersTenancy()` utility
- [x] 2.2.3 Add duplicate detection query helper
- [x] 2.2.4 Create type guards for cohort selection modes

## 3. Credit Calculation Logic

### 3.1 Update Calculation Logic
- [x] 3.1.1 Locate existing credit calculation function
- [x] 3.1.2 Add evidence validation check (YeuCauMinhChung + FileMinhChungUrl)
- [x] 3.1.3 Return 0 credits if evidence required but missing
- [x] 3.1.4 Update unit tests for evidence-dependent logic
- [ ] 3.1.5 Add integration test for approval workflow

## 4. Frontend Components

### 4.1 Rename and Refactor Wizard
- [x] 4.1.1 Rename `bulk-assignment-wizard.tsx` to `bulk-submission-wizard.tsx`
- [x] 4.1.2 Update all imports in parent components
- [x] 4.1.3 Add step state management (1: Activity, 2: Cohort, 3: Preview)
- [x] 4.1.4 Create progress indicator component/section

### 4.2 Step 1: Activity Selection
- [x] 4.2.1 Create `ActivitySelector` component
- [x] 4.2.2 Fetch unit activities + global activities (TanStack Query)
- [x] 4.2.3 Filter by status (Active only)
- [x] 4.2.4 Display activity info: name, type, evidence requirement
- [x] 4.2.5 Add search/filter for activity list
- [x] 4.2.6 Handle selection and transition to Step 2
- [x] 4.2.7 Add validation (activity required)

### 4.3 Step 2: Cohort Selection
- [x] 4.3.1 Display selected activity summary card
- [x] 4.3.2 Add "Change Activity" button to return to Step 1
- [x] 4.3.3 Integrate existing CohortBuilder component
- [x] 4.3.4 Handle cohort selection state
- [x] 4.3.5 Show selected count badge
- [x] 4.3.6 Add "Continue" button with validation
- [x] 4.3.7 Disable continue if no practitioners selected

### 4.4 Step 3: Preview & Confirm
- [x] 4.4.1 Create `PreviewAndConfirm` component
- [x] 4.4.2 Display activity summary
- [x] 4.4.3 Display cohort selection summary (count, mode, filters)
- [x] 4.4.4 Call preview API endpoint (optional dry-run)
- [x] 4.4.5 Show will-create count, duplicates count
- [x] 4.4.6 Display sample practitioner names (first 10)
- [x] 4.4.7 Add optional event date inputs (NgayBatDau, NgayKetThuc)
- [x] 4.4.8 Add "Back" and "Confirm" buttons
- [x] 4.4.9 Handle bulk create API call
- [x] 4.4.10 Show loading state during creation
- [x] 4.4.11 Display success/error results
- [x] 4.4.12 Add navigation to submissions list (filtered by activity)

### 4.5 Component Styling
- [ ] 4.5.1 Apply glassmorphism design system
- [ ] 4.5.2 Match form control styling
- [ ] 4.5.3 Add responsive layout (mobile-friendly)
- [ ] 4.5.4 Add loading skeletons
- [ ] 4.5.5 Add error states
- [ ] 4.5.6 Add accessibility attributes (ARIA labels, roles)

## 5. Navigation & Routes

### 5.1 Update Navigation
- [ ] 5.1.1 Update sidebar/nav label: "Bulk Assignment" → "Bulk Enrollment"
- [ ] 5.1.2 Add icon (Users or UserPlus)
- [ ] 5.1.3 Restrict access to DonVi and SoYTe roles
- [ ] 5.1.4 Update route metadata

### 5.2 Links from Other Pages
- [ ] 5.2.1 Add "Bulk Enroll" button to Activities page (DonVi only)
- [ ] 5.2.2 Pre-select activity when navigating from Activities
- [ ] 5.2.3 Add query param support for pre-selection
- [ ] 5.2.4 Update submissions list to show bulk-created indicator

## 6. Audit Logging

### 6.1 Add Audit Log Entry
- [ ] 6.1.1 Define `BULK_SUBMISSION_CREATE` action constant
- [ ] 6.1.2 Log entry with cohort selection details
- [ ] 6.1.3 Include activity info, counts, filters
- [ ] 6.1.4 Store sample practitioner IDs (first 10)
- [ ] 6.1.5 Add timestamp and actor information
- [ ] 6.1.6 Test audit log retrieval
- [ ] 6.1.7 Use `nhatKyHeThongRepo.logAction` helper instead of ad-hoc writes

## 7. Database Optimization

### 7.1 Add Indexes (if not exist)
- [ ] 7.1.1 Check existing indexes on `GhiNhanHoatDong`
- [ ] 7.1.2 Add index on `(MaDanhMuc, MaNhanVien)` for duplicate detection
- [ ] 7.1.3 Add index on `(TrangThaiDuyet, FileMinhChungUrl)` for credit queries
- [ ] 7.1.4 Test query performance with EXPLAIN
- [ ] 7.1.5 Document indexes in migration notes

## 8. Testing

### 8.1 Unit Tests
- [ ] 8.1.1 Test `bulkCreate()` repository method
- [ ] 8.1.2 Test cohort resolution logic (all/manual modes)
- [ ] 8.1.3 Test duplicate detection
- [ ] 8.1.4 Test tenancy validation (DonVi cannot cross units)
- [ ] 8.1.5 Test status assignment (YeuCauMinhChung logic)
- [ ] 8.1.6 Test credit calculation with/without evidence
- [ ] 8.1.7 Test batch processing (>500 submissions)

### 8.2 Integration Tests
- [ ] 8.2.1 Test full bulk create API endpoint (happy path)
- [ ] 8.2.2 Test duplicate handling (skip existing)
- [ ] 8.2.3 Test authorization (DonVi vs SoYTe)
- [ ] 8.2.4 Test error cases (invalid activity, invalid practitioners)
- [ ] 8.2.5 Test audit log creation
- [ ] 8.2.6 Test credit calculation on approval

### 8.3 E2E Tests (Optional)
- [ ] 8.3.1 Test wizard flow: Activity → Cohort → Confirm
- [ ] 8.3.2 Test practitioner view of bulk-created submissions
- [ ] 8.3.3 Test evidence upload on bulk-created submission
- [ ] 8.3.4 Test admin approval workflow

## 9. Documentation

### 9.1 Code Documentation
- [ ] 9.1.1 Add JSDoc comments to API endpoint
- [ ] 9.1.2 Add JSDoc comments to repository methods
- [ ] 9.1.3 Add inline comments for complex logic
- [ ] 9.1.4 Document type interfaces

### 9.2 User Documentation (Optional)
- [ ] 9.2.1 Create admin guide for bulk enrollment
- [ ] 9.2.2 Add tooltips/help text in UI
- [ ] 9.2.3 Create FAQ for common issues

## 10. Deployment Preparation

### 10.1 Code Review
- [ ] 10.1.1 Self-review all code changes
- [ ] 10.1.2 Run TypeScript type check (`npm run typecheck`)
- [ ] 10.1.3 Run linter (`npm run lint`)
- [ ] 10.1.4 Fix all linting warnings
- [ ] 10.1.5 Run all tests (`npm run test`)
- [ ] 10.1.6 Ensure 100% pass rate

### 10.2 Manual Testing
- [ ] 10.2.1 Test as DonVi user: bulk create 10 practitioners
- [ ] 10.2.2 Test as DonVi user: verify duplicate prevention
- [ ] 10.2.3 Test as SoYTe user: bulk create across units
- [ ] 10.2.4 Test practitioner view: see bulk-created submission
- [ ] 10.2.5 Test practitioner: upload evidence
- [ ] 10.2.6 Test admin: approve submission with evidence
- [ ] 10.2.7 Test credit calculation: verify correct credits
- [ ] 10.2.8 Test performance: bulk create 500 submissions
- [ ] 10.2.9 Test error handling: invalid activity, unauthorized access

### 10.3 Prepare Commit
- [ ] 10.3.1 Write descriptive commit message
- [ ] 10.3.2 Reference issue/change ID
- [ ] 10.3.3 List all files changed
- [ ] 10.3.4 Run pre-commit hooks
- [ ] 10.3.5 Create pull request with summary
- [ ] 10.3.6 Add screenshots/demo video to PR

## 11. Post-Deployment

### 11.1 Monitor
- [ ] 11.1.1 Monitor error logs for bulk create endpoint
- [ ] 11.1.2 Monitor database performance (slow queries)
- [ ] 11.1.3 Monitor API response times
- [ ] 11.1.4 Check for unexpected errors

### 11.2 Gather Feedback
- [ ] 11.2.1 Collect feedback from pilot DonVi users
- [ ] 11.2.2 Review audit logs for usage patterns
- [ ] 11.2.3 Identify pain points or confusion
- [ ] 11.2.4 Plan iterative improvements

### 11.3 Archive Change
- [ ] 11.3.1 Update `tasks.md` with all checkmarks
- [ ] 11.3.2 Move change to archive: `openspec/changes/archive/2025-11-06-refactor-cohort-bulk-submission/`
- [ ] 11.3.3 Update affected specs in `openspec/specs/`
- [ ] 11.3.4 Run `openspec validate --strict` (if available)
- [ ] 11.3.5 Commit archive changes

---

## Notes

- Prioritize tasks in sequence (API → Repository → Frontend → Testing)
- Mark each task as `[x]` when completed
- Add notes below tasks if blockers or decisions needed
- Review this list daily during implementation
- Update as new subtasks discovered
