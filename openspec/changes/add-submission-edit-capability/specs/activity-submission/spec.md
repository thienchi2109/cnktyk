# activity-submission Specification Delta

## ADDED Requirements

### Requirement: Submission Data Editing for Unit Admins
DonVi (Unit Admin) users SHALL be able to edit activity submission data fields while the submission status is ChoDuyet (pending approval) to correct data entry errors without rejecting and recreating submissions.

#### Scenario: Edit button visibility for pending submissions
- **WHEN** a DonVi user views a submission detail page where TrangThaiDuyet is 'ChoDuyet'
- **THEN** an "Chỉnh sửa" (Edit) button is visible and enabled

#### Scenario: Edit button hidden for approved submissions
- **WHEN** a DonVi user views a submission detail page where TrangThaiDuyet is 'DaDuyet'
- **THEN** the edit button is not visible or is disabled with tooltip explaining immutability

#### Scenario: Edit button hidden for rejected submissions
- **WHEN** a DonVi user views a submission detail page where TrangThaiDuyet is 'TuChoi'
- **THEN** the edit button is not visible or is disabled

#### Scenario: Edit form pre-population
- **WHEN** a DonVi user clicks the edit button
- **THEN** a modal/dialog opens with a form pre-populated with all current submission field values

#### Scenario: Edit form field validation
- **WHEN** a DonVi user modifies fields in the edit form
- **THEN** real-time validation applies the same rules as the create submission form (date ranges, credit limits, required fields)

#### Scenario: Successful submission update
- **WHEN** a DonVi user submits valid edited data via the edit form
- **THEN** the submission is updated in the database, the modal closes, and the detail page refreshes with updated data

#### Scenario: Update failure with error message
- **WHEN** a DonVi user submits invalid data or the server returns an error
- **THEN** the form displays specific error messages without closing the modal

#### Scenario: Optimistic UI update
- **WHEN** a DonVi user successfully submits edits
- **THEN** the UI updates immediately with new data before the server response completes

### Requirement: Edit Permission and Tenant Isolation
The system SHALL enforce strict role-based access control and tenant isolation for edit operations, ensuring only authorized unit admins can edit their own unit's submissions.

#### Scenario: DonVi role required for edit
- **WHEN** a user with role NguoiHanhNghe or SoYTe attempts to access the PATCH endpoint
- **THEN** the server returns 403 Forbidden with error message "Chỉ quản trị viên đơn vị có quyền chỉnh sửa"

#### Scenario: Tenant isolation enforcement
- **WHEN** a DonVi user attempts to edit a submission where submission.MaDonVi does not match user.MaDonVi
- **THEN** the server returns 404 Not Found (preventing information disclosure)

#### Scenario: Status validation on server
- **WHEN** a DonVi user attempts to PATCH a submission where TrangThaiDuyet is not 'ChoDuyet'
- **THEN** the server returns 400 Bad Request with error "Chỉ có thể chỉnh sửa ghi nhận đang chờ duyệt"

#### Scenario: Practitioner linkage immutability
- **WHEN** a DonVi user attempts to change the MaNhanVien field via edit
- **THEN** the server ignores the change and maintains the original MaNhanVien value

#### Scenario: Session expiration during edit
- **WHEN** a user's session expires while the edit modal is open
- **THEN** the PATCH request returns 401 Unauthorized and redirects to login page

### Requirement: Comprehensive Audit Logging
All submission edit operations SHALL be logged to NhatKyHeThong with complete before/after state to maintain compliance audit trail and enable debugging.

#### Scenario: Successful edit audit log
- **WHEN** a DonVi user successfully updates a submission
- **THEN** a NhatKyHeThong record is created with HanhDong='SUA_GHI_NHAN_HOAT_DONG', ChiTiet containing MaGhiNhan, before state, after state, and list of changed fields

#### Scenario: Audit log includes user identity
- **WHEN** an edit audit log is created
- **THEN** the record includes MaNguoiDung, TenNguoiDung, MaDonVi, and VaiTro of the user who performed the edit

#### Scenario: Audit log timestamp precision
- **WHEN** an edit occurs
- **THEN** the NgayGio field in NhatKyHeThong records the exact timestamp with timezone information

#### Scenario: Failed edit attempt logging
- **WHEN** a DonVi user attempts to edit but is denied due to permissions or validation
- **THEN** a NhatKyHeThong record is created with HanhDong='THAT_BAI_SUA_GHI_NHAN' and ChiTiet containing the failure reason

#### Scenario: Audit log does not block request
- **WHEN** the audit logging operation encounters an error
- **THEN** the edit operation completes successfully and the error is logged separately without failing the user request

### Requirement: Edit API Endpoint
The system SHALL provide a PATCH endpoint at `/api/submissions/[id]` for partial updates to submission data fields.

#### Scenario: PATCH request with valid data
- **WHEN** a PATCH request is sent to `/api/submissions/[id]` with valid JSON body containing updated fields
- **THEN** the server validates the data, updates the submission, logs the change, and returns 200 OK with the updated submission

#### Scenario: Partial field updates
- **WHEN** a PATCH request includes only a subset of editable fields (e.g., only TenHoatDong and SoDiemCPD)
- **THEN** the server updates only the provided fields and leaves other fields unchanged

#### Scenario: Invalid field type rejection
- **WHEN** a PATCH request includes fields with wrong data types (e.g., string for SoDiemCPD)
- **THEN** the server returns 400 Bad Request with Zod validation error details

#### Scenario: Unknown field rejection
- **WHEN** a PATCH request includes fields not in the schema
- **THEN** the server strips unknown fields and processes only valid fields (Zod .strip() mode)

#### Scenario: Empty body rejection
- **WHEN** a PATCH request is sent with an empty JSON body or no fields to update
- **THEN** the server returns 400 Bad Request with error "Không có trường nào để cập nhật"

#### Scenario: Concurrent modification detection
- **WHEN** a PATCH request is processed and the submission was modified by another user after the current user fetched it
- **THEN** the server returns 409 Conflict with error "Ghi nhận đã được cập nhật bởi người dùng khác" (future enhancement)

### Requirement: Edit Form UI Components
The submission edit UI SHALL reuse existing form components and patterns to maintain consistency with the create submission flow.

#### Scenario: Modal dialog presentation
- **WHEN** the edit button is clicked
- **THEN** a modal dialog opens with glassmorphism styling matching the create submission form

#### Scenario: Form field layout consistency
- **WHEN** the edit form is displayed
- **THEN** the field layout, labels, placeholders, and validation messages match the create submission form exactly

#### Scenario: Cancel without saving
- **WHEN** a user clicks "Hủy" or presses Escape key in the edit modal
- **THEN** the modal closes without saving changes and a confirmation prompt appears if fields were modified

#### Scenario: Loading state during update
- **WHEN** the edit form is submitted and the PATCH request is in progress
- **THEN** the submit button shows a loading spinner, is disabled, and displays text "Đang cập nhật..."

#### Scenario: Success toast notification
- **WHEN** a submission is successfully updated
- **THEN** a toast notification appears with message "Cập nhật ghi nhận thành công" and checkmark icon

#### Scenario: Error toast notification
- **WHEN** a submission update fails due to server error
- **THEN** a toast notification appears with message "Lỗi khi cập nhật ghi nhận: [error message]" and error icon

### Requirement: Data Integrity and Validation
Edit operations SHALL maintain the same data integrity and validation rules as creation operations to prevent invalid data entry.

#### Scenario: Required field validation
- **WHEN** a user clears a required field (e.g., TenHoatDong) and submits the edit form
- **THEN** the form displays error "Trường này là bắt buộc" and prevents submission

#### Scenario: Date range validation
- **WHEN** a user sets NgayKetThuc before NgayBatDau
- **THEN** the form displays error "Ngày kết thúc phải sau ngày bắt đầu"

#### Scenario: Credit limit validation
- **WHEN** a user enters SoDiemCPD exceeding the allowed range (e.g., > 100)
- **THEN** the form displays error "Số điểm CPD phải từ 0 đến 100"

#### Scenario: Text length validation
- **WHEN** a user enters TenHoatDong exceeding 500 characters
- **THEN** the form displays error "Tên hoạt động không được vượt quá 500 ký tự"

#### Scenario: Activity template validation
- **WHEN** a user selects MaHoatDong (activity template) that doesn't exist or belongs to a different tenant
- **THEN** the server returns 400 Bad Request with error "Mẫu hoạt động không hợp lệ"

#### Scenario: Unique constraint preservation
- **WHEN** a user attempts to edit a submission in a way that would violate unique constraints
- **THEN** the server returns 400 Bad Request with specific constraint error

### Requirement: Performance and Responsiveness
Edit operations SHALL complete within acceptable performance thresholds to maintain a responsive user experience.

#### Scenario: Edit form load time
- **WHEN** the edit button is clicked and the modal opens
- **THEN** the form appears fully rendered within 200ms

#### Scenario: Update request completion
- **WHEN** a user submits valid edits
- **THEN** the PATCH request completes within 1 second under normal network conditions

#### Scenario: Optimistic update immediate feedback
- **WHEN** a user submits edits and optimistic updates are enabled
- **THEN** the UI reflects changes within 50ms before server confirmation

#### Scenario: Large field update performance
- **WHEN** a user updates text fields with maximum allowed length (e.g., 1000 characters in MoTa)
- **THEN** the update completes without performance degradation

#### Scenario: Network error retry
- **WHEN** a PATCH request fails due to network error (not validation error)
- **THEN** TanStack Query automatically retries up to 3 times before showing error to user
