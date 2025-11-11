# Implementation Tasks: Add Submission Delete UI

**Change ID:** `add-submission-delete-ui`
**Status:** Not Started
**Created:** 2025-11-10

---

## Phase 1: Individual Delete UI (Priority: High)

### Backend

- [ ] **Create bulk delete API endpoint**
  - [ ] Create `src/app/api/submissions/bulk-delete/route.ts`
  - [ ] Implement DELETE handler with permission checks
  - [ ] Add tenant isolation for DonVi role
  - [ ] Return detailed summary (deleted, skipped, failed)
  - [ ] Add audit logging for bulk operations
  - [ ] Write unit tests for bulk delete endpoint

### Frontend Hooks

- [ ] **Add delete mutations to hooks**
  - [ ] Add `useDeleteSubmissionMutation()` to `src/hooks/use-submission.ts`
  - [ ] Add `useBulkDeleteSubmissions()` to `src/hooks/use-submissions.ts`
  - [ ] Configure TanStack Query retry logic
  - [ ] Add optimistic updates
  - [ ] Handle error states
  - [ ] Write unit tests for mutation hooks

### UI Components - Individual Delete

- [ ] **Add delete button to submission detail view**
  - [ ] Implement `canDelete()` permission function in `submission-review.tsx`
  - [ ] Add delete button next to edit button (lines ~213-228)
  - [ ] Add Trash2 icon from lucide-react
  - [ ] Apply destructive variant styling
  - [ ] Wire up onClick handler

- [ ] **Create delete confirmation dialog**
  - [ ] Add Dialog component for delete confirmation
  - [ ] Show submission title in confirmation message
  - [ ] Add "Hành động này không thể hoàn tác" warning
  - [ ] Implement cancel and confirm buttons
  - [ ] Add loading state during deletion

- [ ] **Add success/error feedback**
  - [ ] Success toast: "Đã xóa hoạt động thành công"
  - [ ] Error toast with specific error messages
  - [ ] Close detail sheet on successful delete
  - [ ] Refresh submissions list after delete

### Testing - Individual Delete

- [ ] **Unit tests**
  - [ ] Test `canDelete()` logic for all roles
  - [ ] Test permission enforcement (DonVi tenant isolation)
  - [ ] Test status validation (pending only)
  - [ ] Test mutation hook success/error handling

- [ ] **Integration tests**
  - [ ] DonVi deletes own unit's pending submission
  - [ ] DonVi cannot delete other unit's submission
  - [ ] SoYTe deletes any pending submission
  - [ ] Cannot delete approved/rejected submissions

- [ ] **E2E tests**
  - [ ] Complete individual delete workflow (click → confirm → success)
  - [ ] Cancel deletion flow
  - [ ] Error handling (network, permission, validation)

---

## Phase 2: Bulk Delete UI (Priority: High)

### UI Components - Bulk Delete

- [ ] **Add bulk delete button to submissions list**
  - [ ] Add "Xóa hàng loạt" button next to bulk approve (lines ~276-297)
  - [ ] Show button only when 1+ pending submissions selected
  - [ ] Apply destructive styling
  - [ ] Display count in button text: "Xóa hàng loạt ([N])"

- [ ] **Create bulk delete confirmation dialog**
  - [ ] Show count of selected submissions
  - [ ] Add warning about pending-only deletion
  - [ ] Show "Chỉ các hoạt động đang chờ duyệt sẽ được xóa" note
  - [ ] Implement cancel and confirm buttons
  - [ ] Add loading state during bulk operation

- [ ] **Add bulk operation feedback**
  - [ ] Success toast: "Đã xóa [N] hoạt động (bỏ qua [M])"
  - [ ] Error toast with detailed breakdown
  - [ ] Refresh list after bulk delete
  - [ ] Clear selections after completion

- [ ] **Add delete action to table rows**
  - [ ] Add delete button to action column (lines ~523-543)
  - [ ] Show only for pending submissions
  - [ ] Apply same confirmation dialog as detail view
  - [ ] Stop propagation to prevent row click

### Testing - Bulk Delete

- [ ] **Unit tests**
  - [ ] Test bulk delete mutation hook
  - [ ] Test selection filtering (pending only)
  - [ ] Test partial success handling

- [ ] **Integration tests**
  - [ ] Bulk delete processes multiple IDs
  - [ ] Skipped submissions reported correctly
  - [ ] Failed submissions handled gracefully
  - [ ] Tenant isolation enforced in bulk

- [ ] **E2E tests**
  - [ ] Select multiple submissions → bulk delete → success
  - [ ] Mixed selection (pending + approved) → only pending deleted
  - [ ] Network error → retry logic works
  - [ ] Bulk delete performance (100 submissions)

---

## Phase 3: Polish & Error Handling (Priority: Medium)

### Error Handling Improvements

- [ ] **Add specific error messages**
  - [ ] Permission denied: "Bạn không có quyền xóa hoạt động này"
  - [ ] Already processed: "Không thể xóa hoạt động đã duyệt hoặc đã từ chối"
  - [ ] Network error: "Lỗi kết nối. Vui lòng thử lại."
  - [ ] Server error: "Lỗi hệ thống. Vui lòng thử lại sau."

- [ ] **Add retry functionality**
  - [ ] Retry button in error toast
  - [ ] Exponential backoff for network errors
  - [ ] Max 3 retries per TanStack Query config

- [ ] **Add detailed bulk error reporting**
  - [ ] Expandable details section in error toast
  - [ ] List failed IDs with specific errors
  - [ ] Option to retry failed deletions only

### UI/UX Polish

- [ ] **Loading states**
  - [ ] Individual delete: button spinner + "Đang xóa..."
  - [ ] Bulk delete: button spinner + "Đang xóa..."
  - [ ] Disable buttons during operation
  - [ ] Progress indicator for bulk operations

- [ ] **Accessibility improvements**
  - [ ] Keyboard navigation for delete buttons
  - [ ] Screen reader announcements for delete actions
  - [ ] Focus management after dialog close
  - [ ] ARIA labels for all buttons and dialogs

- [ ] **Visual feedback**
  - [ ] Row fade-out animation on delete
  - [ ] Optimistic removal from list
  - [ ] Count updates in real-time
  - [ ] Disabled state for non-deletable submissions

### Documentation

- [ ] **Update user guide**
  - [ ] Add "Deleting Activity Submissions" section
  - [ ] Explain pending-only restriction
  - [ ] Document bulk delete workflow
  - [ ] Add screenshots of UI

- [ ] **Update API documentation**
  - [ ] Document DELETE /api/submissions/bulk-delete
  - [ ] Update permission matrix for delete operations
  - [ ] Add examples for bulk delete requests/responses

- [ ] **Update changelog**
  - [ ] Add entry for version X.Y.Z
  - [ ] Describe new delete functionality
  - [ ] Note breaking changes (none expected)

---

## Phase 4: Future Enhancements (Priority: Low)

- [ ] **Soft delete / trash bin**
  - [ ] Add new status: 'Deleted'
  - [ ] Create trash bin view for recovery
  - [ ] Auto-purge after 30 days
  - [ ] Add restore functionality

- [ ] **Evidence file cleanup**
  - [ ] Create background job to detect orphaned files
  - [ ] Delete orphaned files after 30-day grace period
  - [ ] Add admin dashboard for file cleanup metrics

- [ ] **Deletion reporting**
  - [ ] Create admin dashboard for deletion trends
  - [ ] Show who deleted what, when
  - [ ] Alert on unusual deletion patterns (e.g., >50 in 1 day)

- [ ] **Practitioner notifications**
  - [ ] Notify practitioner when admin deletes their submission
  - [ ] Show deletion reason in notification
  - [ ] Add deletion history in practitioner profile

- [ ] **Practitioner self-delete UI**
  - [ ] Add delete button to NguoiHanhNghe submission list
  - [ ] Same restrictions (pending only)
  - [ ] Confirmation dialog
  - [ ] Audit logging

---

## Deployment Checklist

### Pre-deployment

- [ ] Code review completed
- [ ] Unit tests passing (90%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Accessibility audit completed
- [ ] Performance testing (bulk delete 100+ submissions)
- [ ] Security review (permission checks, tenant isolation)

### Deployment

- [ ] Deploy backend (bulk delete API endpoint)
- [ ] Deploy frontend (UI components, hooks)
- [ ] Enable feature flag (if applicable)
- [ ] Monitor error logs for 24 hours
- [ ] Check audit logs for deletion events

### Post-deployment

- [ ] Verify delete functionality in production
- [ ] Monitor support tickets for delete-related issues
- [ ] Collect user feedback from DonVi/SoYTe admins
- [ ] Measure success metrics (adoption, support reduction)
- [ ] Update documentation with final screenshots

### Rollback Plan (if needed)

- [ ] Disable delete buttons via feature flag
- [ ] Disable bulk delete API endpoint
- [ ] Notify users of temporary unavailability
- [ ] Fix issues and redeploy

---

## Success Metrics

### Quantitative (Track after 30 days)

- [ ] Adoption: ≥60% of DonVi admins use delete at least once
- [ ] Support reduction: ≥25% fewer deletion-related support tickets
- [ ] Usage volume: ≥200 deletions per month platform-wide
- [ ] Error rate: <0.5% accidental deletions (restore requests)
- [ ] Performance: Individual delete <500ms, bulk delete <5s for 100 items

### Qualitative

- [ ] Collect feedback from 5+ pilot DonVi admins
- [ ] Positive feedback from ≥80% of users
- [ ] Zero data integrity incidents (no approved submissions deleted)
- [ ] Support team reports reduced deletion workload

---

## Risk Mitigation

- [ ] **Accidental deletion risk**
  - ✅ Confirmation dialogs implemented
  - ✅ Pending-only restriction enforced
  - ✅ Audit trail captures all deletions
  - [ ] Monitor for restore requests (track metric)

- [ ] **Permission bypass risk**
  - ✅ Server-side validation enforced
  - ✅ Tenant isolation tested
  - [ ] Security audit completed

- [ ] **Performance risk**
  - [ ] Load test bulk delete with 500 submissions
  - [ ] Optimize if >5s completion time
  - [ ] Add pagination/chunking if needed

- [ ] **Data integrity risk**
  - ✅ Approved/rejected protection enforced
  - ✅ Audit logs persist after deletion
  - [ ] Verify credit calculations unaffected

---

## Dependencies

- Existing DELETE endpoint: `src/app/api/submissions/[id]/route.ts:421-492`
- TanStack Query (React Query) for mutations
- Existing confirmation dialog components
- Existing toast notification system
- lucide-react for Trash2 icon

---

## Notes

- DELETE API endpoint already exists - only UI integration needed for individual delete
- Bulk delete requires new API endpoint
- No database schema changes required
- Feature is additive - no breaking changes expected
- Audit logging infrastructure already exists
- Permission checks reuse existing patterns (canEdit, canReview)
