# activity-submission Specification Delta

## ADDED Requirements

### Requirement: Submission Deletion for Admin Roles
DonVi (Unit Admin) and SoYTe (DoH Admin) users SHALL be able to delete activity submissions with pending approval status (ChoDuyet) to correct data entry errors and remove duplicate or mistaken submissions.

#### Scenario: More button with delete action for pending submissions (individual)
- **WHEN** a DonVi or SoYTe user views a submission detail page where TrangThaiDuyet is 'ChoDuyet'
- **THEN** a "More" (...) dropdown button is visible containing "Chỉnh sửa" (Edit) and "Xóa" (Delete) menu items

#### Scenario: Delete menu item hidden for approved submissions
- **WHEN** a DonVi or SoYTe user views a submission detail page where TrangThaiDuyet is 'DaDuyet'
- **THEN** the "Xóa" menu item is not visible in the More dropdown, or is disabled with tooltip "Không thể xóa hoạt động đã duyệt"

#### Scenario: Delete menu item hidden for rejected submissions
- **WHEN** a DonVi or SoYTe user views a submission detail page where TrangThaiDuyet is 'TuChoi'
- **THEN** the "Xóa" menu item is not visible in the More dropdown, or is disabled with tooltip "Không thể xóa hoạt động đã từ chối"

#### Scenario: Delete confirmation dialog
- **WHEN** a user clicks the "Xóa" menu item from the More dropdown on a submission detail page
- **THEN** a confirmation dialog appears with the submission title and warning "Hành động này không thể hoàn tác"

#### Scenario: Successful individual deletion
- **WHEN** a user confirms deletion in the dialog
- **THEN** the submission is deleted from the database, the detail sheet closes, the submissions list refreshes, and a success toast appears "Đã xóa hoạt động thành công"

#### Scenario: Deletion failure with error message
- **WHEN** a deletion fails due to server error or permission issue
- **THEN** an error toast appears with the specific error message without closing the detail sheet

#### Scenario: Cancel deletion
- **WHEN** a user clicks "Hủy" (Cancel) in the confirmation dialog
- **THEN** the dialog closes and the submission remains unchanged

### Requirement: Bulk Submission Deletion
Admin users SHALL be able to select multiple pending submissions and delete them in a single operation to efficiently clean up bulk creation errors or duplicate submissions.

#### Scenario: Bulk delete button visibility
- **WHEN** a DonVi or SoYTe user selects 1 or more pending submissions in the submissions list
- **THEN** a "Xóa hàng loạt ([N])" (Bulk Delete) button appears next to the bulk approve button

#### Scenario: Bulk delete only selects pending submissions
- **WHEN** a user selects submissions including both pending and non-pending (approved/rejected) submissions
- **THEN** only the pending submissions are eligible for deletion and the non-pending count is shown in the confirmation dialog as "skipped"

#### Scenario: Bulk delete confirmation with count
- **WHEN** a user clicks the bulk delete button
- **THEN** a confirmation dialog appears showing "Bạn có chắc chắn muốn xóa [N] hoạt động đã chọn?" with a warning about pending-only deletion

#### Scenario: Successful bulk deletion
- **WHEN** a user confirms bulk deletion
- **THEN** the server processes all selected IDs, deletes eligible submissions, returns a summary (deleted, skipped, failed), the list refreshes, selections clear, and a success toast shows "Đã xóa [N] hoạt động (bỏ qua [M] hoạt động)"

#### Scenario: Bulk deletion partial success
- **WHEN** some submissions in a bulk delete operation fail (e.g., permission denied, already processed)
- **THEN** the operation continues for other submissions, returns detailed results, and the toast shows "Đã xóa [N] hoạt động (bỏ qua [M], lỗi [K])"

#### Scenario: Bulk delete loading state
- **WHEN** a bulk delete operation is in progress
- **THEN** the bulk delete button shows a loading spinner, is disabled, and displays text "Đang xóa..."

#### Scenario: Checkbox selection restricted to pending
- **WHEN** a submission in the list has TrangThaiDuyet !== 'ChoDuyet'
- **THEN** the checkbox for that row is disabled or hidden (consistent with bulk approve pattern)

### Requirement: Delete Permission and Tenant Isolation
The system SHALL enforce strict role-based access control and tenant isolation for delete operations, ensuring only authorized users can delete submissions within their scope.

#### Scenario: DonVi tenant isolation enforcement
- **WHEN** a DonVi user attempts to delete a submission where submission.MaNhanVien.MaDonVi does not match user.unitId
- **THEN** the server returns 403 Forbidden or 404 Not Found (preventing information disclosure)

#### Scenario: SoYTe cross-unit delete permission
- **WHEN** a SoYTe user attempts to delete any submission where TrangThaiDuyet is 'ChoDuyet'
- **THEN** the deletion succeeds regardless of the submission's unit

#### Scenario: NguoiHanhNghe self-delete permission
- **WHEN** a NguoiHanhNghe user attempts to delete their own pending submission
- **THEN** the deletion succeeds (API already supports this, UI not in scope for this proposal)

#### Scenario: Role validation on server
- **WHEN** an unauthorized role attempts to DELETE a submission
- **THEN** the server returns 401 Unauthorized or 403 Forbidden

#### Scenario: Status validation on server
- **WHEN** a user attempts to DELETE a submission where TrangThaiDuyet is not 'ChoDuyet'
- **THEN** the server returns 400 Bad Request with error "Không thể xóa hoạt động đã xử lý"

#### Scenario: Session expiration during deletion
- **WHEN** a user's session expires while the delete confirmation dialog is open
- **THEN** the DELETE request returns 401 Unauthorized and redirects to login page

### Requirement: Deletion Audit Logging
All submission deletion operations SHALL be logged to NhatKyHeThong with complete context to maintain compliance audit trail and enable forensic analysis.

#### Scenario: Individual deletion audit log
- **WHEN** a user successfully deletes a submission
- **THEN** a NhatKyHeThong record is created with HanhDong='XOA_GHI_NHAN_HOAT_DONG', ChiTiet containing MaGhiNhan, submission details (TenHoatDong, MaNhanVien, practitioner name), and deletion reason if provided

#### Scenario: Bulk deletion audit log
- **WHEN** a user successfully completes a bulk delete operation
- **THEN** a NhatKyHeThong record is created with HanhDong='BULK_SUBMISSION_DELETE', ChiTiet containing requestedIds, deletedCount, skippedCount, and list of deleted IDs

#### Scenario: Audit log includes user identity
- **WHEN** a deletion audit log is created
- **THEN** the record includes MaNguoiDung, TenNguoiDung, MaDonVi (if applicable), VaiTro, and DiaChi (IP address) of the user who performed the deletion

#### Scenario: Audit log timestamp precision
- **WHEN** a deletion occurs
- **THEN** the NgayGio field in NhatKyHeThong records the exact timestamp with timezone information

#### Scenario: Failed deletion attempt logging
- **WHEN** a user attempts to delete but is denied due to permissions or validation
- **THEN** a NhatKyHeThong record is created with HanhDong='THAT_BAI_XOA_GHI_NHAN' and ChiTiet containing the failure reason

#### Scenario: Audit log does not block deletion
- **WHEN** the audit logging operation encounters an error
- **THEN** the deletion operation completes successfully and the logging error is logged separately without failing the user request

### Requirement: Bulk Delete API Endpoint
The system SHALL provide a DELETE endpoint at `/api/submissions/bulk-delete` for deleting multiple submissions in a single transaction.

#### Scenario: Bulk DELETE request with valid IDs
- **WHEN** a DELETE request is sent to `/api/submissions/bulk-delete` with valid JSON body containing array of submission IDs
- **THEN** the server validates each ID, deletes eligible submissions, logs the operation, and returns 200 OK with deletion summary

#### Scenario: Partial success in bulk delete
- **WHEN** some IDs in a bulk delete request cannot be deleted (wrong status, permission denied, not found)
- **THEN** the server continues processing other IDs and returns detailed breakdown (deleted, skipped, failed) without rolling back successful deletions

#### Scenario: Empty IDs array rejection
- **WHEN** a bulk delete request is sent with an empty IDs array
- **THEN** the server returns 400 Bad Request with error "Danh sách ID rỗng"

#### Scenario: Invalid ID format rejection
- **WHEN** a bulk delete request includes malformed UUIDs or non-existent IDs
- **THEN** the server validates each ID and reports them in the "failed" category with specific error messages

#### Scenario: Bulk delete response structure
- **WHEN** a bulk delete operation completes
- **THEN** the response includes `{ success: true, deleted: number, skipped: number, failed: number, details: { deletedIds, skippedIds, errors: Array<{id, error}> } }`

#### Scenario: Bulk delete performance
- **WHEN** a bulk delete request processes 100 submissions
- **THEN** the operation completes within 5 seconds (average ~50ms per submission)

### Requirement: Delete UI Components
The submission delete UI SHALL use consistent patterns with existing destructive actions (reject, bulk operations) to maintain UX coherence. Actions are grouped in a "More" (...) dropdown menu for neatness.

#### Scenario: More dropdown button in submission detail view
- **WHEN** a DonVi or SoYTe user views a submission detail page
- **THEN** a "More" (...) button appears in the header, displaying a dropdown menu with "Chỉnh sửa" (Edit icon) and "Xóa" (Trash2 icon) items based on permissions

#### Scenario: Delete menu item styling (individual)
- **WHEN** the "Xóa" menu item is displayed in the More dropdown
- **THEN** it uses destructive styling with red text color, Trash2 icon, and clear visual distinction from edit action

#### Scenario: More dropdown button in submissions list action column
- **WHEN** a user views the submissions list
- **THEN** each row displays a "More" (...) button in the action column, containing "Xem" (Eye icon), "Tải xuống" (Download icon, if evidence exists), and "Xóa" (Trash2 icon, if canDelete()) menu items

#### Scenario: Delete button styling (bulk)
- **WHEN** the bulk delete button is displayed in the submissions list header
- **THEN** it uses red destructive styling matching the reject button, positioned after the bulk approve button

#### Scenario: Confirmation dialog structure
- **WHEN** a delete confirmation dialog appears
- **THEN** it displays submission title (individual) or count (bulk), warning text "Hành động này không thể hoàn tác", and two buttons: "Hủy" (outline) and "Xác nhận xóa" (destructive)

#### Scenario: Loading state during deletion
- **WHEN** a delete operation is in progress (individual or bulk)
- **THEN** the confirm button shows a loading spinner, is disabled, and displays text "Đang xóa..."

#### Scenario: Success toast notification
- **WHEN** a submission is successfully deleted
- **THEN** a toast notification appears with message "Đã xóa hoạt động thành công" (individual) or "Đã xóa [N] hoạt động" (bulk) and checkmark icon

#### Scenario: Error toast notification
- **WHEN** a deletion fails due to server error
- **THEN** a toast notification appears with message "Không thể xóa hoạt động: [error message]" and error icon

#### Scenario: List refresh after deletion
- **WHEN** a submission is successfully deleted (individual or bulk)
- **THEN** the submissions list automatically refreshes to remove deleted items and update counts

#### Scenario: Sheet closure after individual delete
- **WHEN** an individual submission is successfully deleted from the detail view
- **THEN** the detail sheet closes and the user returns to the submissions list

### Requirement: Data Integrity Protection
Delete operations SHALL enforce business rules to prevent deletion of submissions that must be preserved for compliance or audit purposes.

#### Scenario: Approved submission protection
- **WHEN** a submission has TrangThaiDuyet = 'DaDuyet'
- **THEN** the delete button is hidden or disabled, and any API attempt returns 400 Bad Request

#### Scenario: Rejected submission protection
- **WHEN** a submission has TrangThaiDuyet = 'TuChoi'
- **THEN** the delete button is hidden or disabled, and any API attempt returns 400 Bad Request

#### Scenario: Evidence file orphaning
- **WHEN** a submission with FileMinhChungUrl is deleted
- **THEN** the database record is removed but the file remains in S3/storage (future cleanup job will handle orphans)

#### Scenario: Audit log persistence after deletion
- **WHEN** a submission is deleted
- **THEN** all NhatKyHeThong records related to that submission remain in the database (no cascade delete)

#### Scenario: Credit calculation unaffected
- **WHEN** a pending submission (never approved) is deleted
- **THEN** the practitioner's credit totals remain unchanged (as pending submissions don't contribute to credits)

#### Scenario: Re-creation allowed after deletion
- **WHEN** a submission is deleted and the same (MaNhanVien, MaDanhMuc) combination is submitted again
- **THEN** a new submission is created with a new MaGhiNhan (no constraint violations)

### Requirement: Permission Matrix Update
The system SHALL reflect updated delete permissions in role-based access control documentation and enforcement.

#### Scenario: Permission matrix for deletion

| Role           | Individual Delete | Bulk Delete | Scope                                    |
|----------------|-------------------|-------------|------------------------------------------|
| SoYTe          | ✅                 | ✅           | Any pending submission (any unit)        |
| DonVi          | ✅                 | ✅           | Own unit's pending submissions only      |
| NguoiHanhNghe  | ✅ (API only)      | ❌           | Own pending submissions only (no UI)     |
| Auditor        | ❌                 | ❌           | Read-only (no delete capability)         |

#### Scenario: Frontend permission check
- **WHEN** the submission list or detail view loads
- **THEN** the `canDelete()` function evaluates `['DonVi', 'SoYTe'].includes(userRole) && submission.TrangThaiDuyet === 'ChoDuyet'` and conditionally renders delete buttons

#### Scenario: Backend permission enforcement
- **WHEN** a DELETE request is received
- **THEN** the API validates role, tenant isolation (DonVi), and submission status before proceeding

### Requirement: Error Handling and User Feedback
Delete operations SHALL provide clear, actionable error messages when failures occur to guide users toward resolution.

#### Scenario: Network error during deletion
- **WHEN** a delete request fails due to network timeout or connection loss
- **THEN** TanStack Query retries up to 3 times, and if all fail, shows error toast "Lỗi kết nối. Vui lòng thử lại."

#### Scenario: Permission denied error
- **WHEN** a delete request returns 403 Forbidden
- **THEN** an error toast appears with message "Bạn không có quyền xóa hoạt động này"

#### Scenario: Already processed error
- **WHEN** a delete request returns 400 Bad Request with "Submission has already been processed"
- **THEN** an error toast appears with message "Không thể xóa hoạt động đã duyệt hoặc đã từ chối"

#### Scenario: Not found error
- **WHEN** a delete request returns 404 Not Found
- **THEN** the UI silently removes the submission from the list (optimistic update) and does not show an error

#### Scenario: Server error with retry option
- **WHEN** a delete request returns 500 Internal Server Error
- **THEN** an error toast appears with message "Lỗi hệ thống. Vui lòng thử lại sau." and a "Thử lại" button

#### Scenario: Bulk delete detailed errors
- **WHEN** a bulk delete operation returns with `failed > 0`
- **THEN** the error toast shows "Đã xóa [N] hoạt động, thất bại [K]" with an expandable details section listing failed IDs and reasons

---

## MODIFIED Requirements

### Requirement: Submission List Action Buttons (MODIFIED)
**Change:** Replace individual action buttons with a "More" (...) dropdown menu containing View, Download, and Delete actions for cleaner UI.

**Before:**
- View button (Eye icon) - standalone
- Download evidence button (Download icon) - standalone, if FileMinhChungUrl exists

**After:**
- More (...) dropdown button containing:
  - Xem (View with Eye icon)
  - Tải xuống (Download with Download icon) - if FileMinhChungUrl exists
  - Xóa (Delete with Trash2 icon) - if canDelete() - NEW

**Location:** `src/components/submissions/submissions-list.tsx:523-543`

### Requirement: Submission Detail View Actions (MODIFIED)
**Change:** Replace individual Edit button with a "More" (...) dropdown menu containing Edit and Delete actions for cleaner, more scalable UI.

**Before:**
- Edit button (DonVi only, pending submissions) - standalone
- Status badge

**After:**
- More (...) dropdown button containing:
  - Chỉnh sửa (Edit with Edit icon) - if canEdit()
  - Xóa (Delete with Trash2 icon) - if canDelete() - NEW
- Status badge

**Location:** `src/components/submissions/submission-review.tsx:213-228`

### Requirement: Bulk Operations (MODIFIED)
**Change:** Add bulk delete capability alongside bulk approve.

**Before:**
- Bulk approve button (when 1+ pending submissions selected)
- Selection checkboxes (pending submissions only)

**After:**
- Bulk approve button (when 1+ pending submissions selected)
- Bulk delete button (when 1+ pending submissions selected)
- Selection checkboxes (pending submissions only)

**Location:** `src/components/submissions/submissions-list.tsx:276-297`

---

## REMOVED Requirements

None. This proposal only adds functionality and does not remove existing capabilities.

---

## Testing Requirements

### Unit Tests

1. **Permission Logic Tests**
   - `canDelete()` returns true for DonVi/SoYTe with pending submissions
   - `canDelete()` returns false for approved/rejected submissions
   - `canDelete()` returns false for non-admin roles

2. **API Endpoint Tests**
   - DELETE /api/submissions/[id] enforces status check
   - DELETE /api/submissions/[id] enforces tenant isolation
   - DELETE /api/submissions/bulk-delete returns correct summary
   - Bulk delete continues on individual failures

3. **Mutation Hook Tests**
   - `useDeleteSubmissionMutation()` calls correct API endpoint
   - `useBulkDeleteSubmissions()` handles partial success
   - Optimistic updates work correctly
   - Error states are properly set

### Integration Tests

1. **DonVi User Flow**
   - DonVi can delete own unit's pending submission
   - DonVi cannot delete other unit's submission (403)
   - DonVi cannot delete approved submission (400)

2. **SoYTe User Flow**
   - SoYTe can delete any pending submission
   - SoYTe cannot delete approved/rejected submissions

3. **Bulk Delete Flow**
   - Bulk delete processes multiple IDs correctly
   - Skipped submissions are reported accurately
   - List refreshes after bulk delete

### E2E Tests

1. **Individual Delete Workflow**
   - Click delete button → confirmation appears
   - Confirm → submission deleted, sheet closes, toast shows
   - Cancel → dialog closes, submission unchanged

2. **Bulk Delete Workflow**
   - Select 5 pending submissions
   - Click bulk delete → confirmation shows "5 hoạt động"
   - Confirm → all deleted, list refreshes, selections clear

3. **Error Handling**
   - Network error → retry logic works
   - Permission error → clear error message
   - Already processed → appropriate error shown

---

## Migration Notes

**No database migrations required** - uses existing schema and API endpoint.

**Deployment steps:**
1. Deploy new UI components (delete buttons, dialogs)
2. Deploy new bulk delete API endpoint
3. Update frontend hooks for delete mutations
4. No downtime required (backward compatible)

**Rollback plan:**
- Remove delete buttons from UI (feature flag if available)
- Disable bulk delete endpoint
- DELETE /api/submissions/[id] already exists, so no rollback needed there

---

## Documentation Updates

1. **User Guide (Admin Section)**
   - Add section: "Deleting Activity Submissions"
   - Explain pending-only restriction
   - Show bulk delete workflow with screenshots

2. **API Documentation**
   - Document DELETE /api/submissions/bulk-delete endpoint
   - Update DELETE /api/submissions/[id] permission matrix

3. **Changelog**
   - Version X.Y.Z: Added delete functionality for activity submissions (individual and bulk)

---

## Acceptance Criteria

✅ DonVi users can delete pending submissions from their unit
✅ SoYTe users can delete any pending submission
✅ Delete button appears only for pending submissions
✅ Confirmation dialog prevents accidental deletions
✅ Bulk delete processes multiple submissions correctly
✅ Audit logs capture all deletion events
✅ Error messages are clear and actionable
✅ List refreshes after successful deletion
✅ Cannot delete approved or rejected submissions
✅ Tenant isolation enforced for DonVi role
✅ Unit tests achieve 90%+ coverage for delete logic
✅ E2E tests pass for all user flows
✅ Performance: Individual delete <500ms, bulk delete <5s for 100 items
✅ No regressions in existing submission workflows
