# Implementation Tasks - Add Submission Edit Capability

## 1. Database Layer
- [ ] 1.1 Add `updateSubmission()` method to `GhiNhanHoatDongRepository`
- [ ] 1.2 Implement parameterized UPDATE query with WHERE clause for tenant isolation
- [ ] 1.3 Add audit logging helper for capturing before/after state
- [ ] 1.4 Write unit tests for repository update method

## 2. Validation Layer
- [ ] 2.1 Create `updateSubmissionSchema` Zod schema in `src/lib/validations/submission.ts`
- [ ] 2.2 Add status validation (only ChoDuyet editable)
- [ ] 2.3 Reuse existing field validators (dates, credits, text lengths)
- [ ] 2.4 Add optional field support (allow partial updates)

## 3. API Layer
- [ ] 3.1 Implement PATCH `/api/submissions/[id]` handler
- [ ] 3.2 Add role check (only DonVi can edit)
- [ ] 3.3 Add tenant isolation check (MaDonVi must match)
- [ ] 3.4 Add status check (submission.TrangThaiDuyet === 'ChoDuyet')
- [ ] 3.5 Call repository update method with validated data
- [ ] 3.6 Log edit operation to NhatKyHeThong with full audit trail
- [ ] 3.7 Return updated submission with 200 status

## 4. Frontend UI
- [ ] 4.1 Add "Chỉnh sửa" button to submission detail page for DonVi role
- [ ] 4.2 Create edit form modal/dialog component
- [ ] 4.3 Pre-populate form with existing submission data
- [ ] 4.4 Integrate React Hook Form with Zod validation
- [ ] 4.5 Implement PATCH request via TanStack Query mutation
- [ ] 4.6 Show loading state during update
- [ ] 4.7 Show success/error toast notifications
- [ ] 4.8 Refresh submission data after successful edit
- [ ] 4.9 Disable edit button if status !== 'ChoDuyet'

## 5. Testing
- [ ] 5.1 Write API tests for PATCH endpoint success cases
- [ ] 5.2 Write API tests for permission failures (wrong role, wrong unit)
- [ ] 5.3 Write API tests for status validation (cannot edit approved/rejected)
- [ ] 5.4 Write API tests for tenant isolation enforcement
- [ ] 5.5 Write integration tests for audit logging
- [ ] 5.6 Test form validation on frontend
- [ ] 5.7 Test optimistic updates and error rollback

## 6. Documentation
- [ ] 6.1 Update API documentation with PATCH endpoint details
- [ ] 6.2 Document edit permission rules in user guide
- [ ] 6.3 Add audit log format example for edit operations
- [ ] 6.4 Update CHANGELOG.md with edit capability addition
