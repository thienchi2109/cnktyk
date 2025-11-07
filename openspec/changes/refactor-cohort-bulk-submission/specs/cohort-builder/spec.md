## ADDED Requirements

### Requirement: Activity Catalog Selection for Bulk Enrollment
The Cohort Builder workflow SHALL provide activity catalog selection before practitioner selection to enable bulk submission creation for mandatory training activities.

#### Scenario: Display active activities for selection
- **WHEN** a DonVi admin opens the bulk enrollment wizard
- **THEN** the system displays a list of Active activity catalog entries from both the unit's catalog and global catalog
- **AND** filters out Draft and Archived activities

#### Scenario: Activity selection is required
- **WHEN** a DonVi admin attempts to proceed to practitioner selection without selecting an activity
- **THEN** the system displays a validation error "Vui lòng chọn hoạt động"
- **AND** prevents navigation to the cohort selection step

#### Scenario: Display activity details for decision-making
- **WHEN** viewing the activity selection dropdown
- **THEN** each activity displays its name, activity type (Course/Conference/Research/Report), and evidence requirement indicator
- **AND** activities requiring evidence show a badge "Yêu cầu minh chứng"

#### Scenario: Activity scope visibility
- **WHEN** viewing activities in the selector
- **THEN** global activities (MaDonVi = null) display a "Hệ thống" badge
- **AND** unit activities (MaDonVi = user.unitId) display a "Đơn vị" badge

#### Scenario: DonVi cannot select other-unit activities
- **WHEN** a DonVi admin attempts to select an activity where MaDonVi ≠ user.unitId and MaDonVi is not null
- **THEN** the selector disables that activity with tooltip "Hoạt động không thuộc đơn vị của bạn"
- **AND** the Next button remains disabled until a permitted activity is chosen

#### Scenario: Search activities by name
- **WHEN** a DonVi admin types into the activity search input
- **THEN** the activity list filters to show only activities whose names contain the search term (case-insensitive)

#### Scenario: Selected activity persists across wizard steps
- **WHEN** a DonVi admin selects an activity and navigates through cohort selection
- **THEN** the selected activity remains visible in a summary card
- **AND** the admin can change the activity selection via a "Thay đổi" button

#### Scenario: Activity validity period enforcement
- **WHEN** the activity selector loads
- **THEN** it filters out activities where HieuLucDen < current date
- **AND** includes activities where HieuLucTu is null or HieuLucTu <= current date

### Requirement: Bulk Submission Creation Workflow
The system SHALL enable DonVi and SoYTe users to bulk-create activity submissions for a cohort of practitioners, automatically setting initial status based on evidence requirements.

#### Scenario: Bulk create submissions for manual cohort selection
- **WHEN** a DonVi admin selects an activity, manually selects 10 practitioners, and confirms bulk creation
- **THEN** the system creates 10 GhiNhanHoatDong records with MaDanhMuc linked to the selected activity
- **AND** NguoiNhap is set to the admin's account ID
- **AND** NgayGhiNhan is set to the current timestamp

#### Scenario: Bulk create submissions for select-all mode
- **WHEN** a DonVi admin selects "select all" mode with filters that match 50 practitioners and excludes 3
- **THEN** the system resolves the cohort to 47 practitioner IDs
- **AND** creates 47 GhiNhanHoatDong records

#### Scenario: Server resolves cohort without trusting client totals
- **WHEN** a malicious client tampers with the `totalFiltered` property or removes excluded IDs before calling the bulk-create API
- **THEN** the API recomputes the practitioner list on the server using saved filters and unit scoping
- **AND** excluded IDs remain excluded even if the request omits them

#### Scenario: Server normalizes missing cohort properties
- **WHEN** the client omits optional cohort fields such as `excludedIds`, `selectedIds`, or `filters`
- **THEN** the API coerces missing arrays to empty arrays and missing filter objects to safe defaults before executing repository queries
- **AND** every filter value is parameterized to avoid undefined handling defects and mitigate SQL injection risks

#### Scenario: Initial status for activities requiring evidence
- **WHEN** bulk creating submissions for an activity where YeuCauMinhChung = true
- **THEN** all created submissions have TrangThaiDuyet = 'Nhap' (draft status)
- **AND** FileMinhChungUrl = null
- **AND** practitioners must upload evidence before submission can be approved

#### Scenario: Initial status for activities not requiring evidence
- **WHEN** bulk creating submissions for an activity where YeuCauMinhChung = false
- **THEN** all created submissions have TrangThaiDuyet = 'ChoDuyet' (pending approval status)
- **AND** are immediately ready for admin review without evidence upload

#### Scenario: Duplicate submission prevention
- **WHEN** a DonVi admin attempts to bulk create submissions for practitioners who already have submissions for the same activity (MaDanhMuc)
- **THEN** the system skips creation for duplicate practitioners
- **AND** returns a response with skipped count and list of duplicate practitioner IDs
- **AND** relies on a database `ON CONFLICT (MaNhanVien, MaDanhMuc)` safeguard so duplicates are prevented even under concurrent requests
- **AND** creates submissions only for practitioners without existing submissions

#### Scenario: Database unique constraint enforces duplicate prevention
- **WHEN** the bulk submission capability is deployed to any environment
- **THEN** a partial unique index on (MaNhanVien, MaDanhMuc) WHERE MaDanhMuc IS NOT NULL exists in the database schema
- **AND** the application fails fast with an operational diagnostic if the index creation migration has not been applied
- **AND** operators receive rollout instructions to apply the migration before the UI or API entry points are exposed

#### Scenario: Bulk creation success response
- **WHEN** bulk submission creation completes successfully
- **THEN** the system returns a response with created count, skipped (duplicate) count, and failed count
- **AND** includes submission IDs for created records
- **AND** includes practitioner IDs for skipped duplicates
- **AND** includes a localized summary message string that matches the API's established response pattern

#### Scenario: Preview before bulk creation
- **WHEN** a DonVi admin reaches the preview/confirmation step
- **THEN** the system displays a summary: selected activity name, cohort count, estimated duplicates
- **AND** shows sample practitioner names (first 10)
- **AND** displays a warning if duplicates detected: "X nhân viên đã có bản ghi cho hoạt động này"

#### Scenario: Tenancy enforcement for DonVi users
- **WHEN** a DonVi admin attempts to bulk create submissions for practitioners outside their unit
- **THEN** the system validates all practitioner MaDonVi values match user.unitId
- **AND** returns a 403 Forbidden error "Cannot create submissions for other units"
- **AND** does not create any submissions

#### Scenario: SoYTe cross-unit bulk creation
- **WHEN** a SoYTe user bulk creates submissions for practitioners across multiple units
- **THEN** the system allows creation for any unit
- **AND** each submission inherits the practitioner's MaDonVi for proper tenancy scoping

#### Scenario: Submissions persist practitioner tenancy
- **WHEN** any submission is created through the bulk enrollment workflow
- **THEN** the persisted record stores the practitioner's MaDonVi (or equivalent tenancy field) captured during cohort evaluation
- **AND** repository-level validation rejects or repairs attempts to persist a null or mismatched MaDonVi so downstream isolation rules continue to function

#### Scenario: Bulk creation performance baseline
- **WHEN** bulk creating 500 submissions
- **THEN** the operation completes in less than 3 seconds (p95 latency)
- **AND** the database uses a single bulk INSERT query
- **AND** the UI displays a progress indicator during creation

#### Scenario: Audit trail for bulk enrollment
- **WHEN** a bulk submission creation completes
- **THEN** the system logs an immutable audit record with action 'BULK_SUBMISSION_CREATE'
- **AND** includes activity ID, activity name, cohort mode (all/manual), cohort filters, total selected, total excluded, created count, skipped count
- **AND** stores the admin's account ID and timestamp

#### Scenario: Common event date for bulk submissions
- **WHEN** a DonVi admin provides optional NgayBatDau and NgayKetThuc in the bulk creation request
- **THEN** all created submissions use these values for event dates
- **AND** if not provided, NgayBatDau and NgayKetThuc are set to null
- **AND** invalid or non-ISO date strings trigger a 400 response with a validation error message

#### Scenario: Navigation to created submissions
- **WHEN** bulk submission creation completes successfully
- **THEN** the UI displays a success message with created count
- **AND** provides a link to the submissions list filtered by the selected activity
- **AND** allows the admin to view and manage the newly created submissions

#### Scenario: Practitioner view of bulk-created submissions
- **WHEN** a practitioner (NguoiHanhNghe) views their submissions list
- **THEN** bulk-created submissions appear with status 'Nhap' (if evidence required) or 'ChoDuyet' (if no evidence required)
- **AND** the submission shows TenHoatDong from the activity catalog
- **AND** the practitioner can upload evidence and submit for approval (if status = Nhap)

### Requirement: Bulk Creation API Authorization
The bulk submission creation API endpoint SHALL enforce role-based access control to restrict usage to authorized unit administrators and system administrators only.

#### Scenario: DonVi user authorized for bulk creation
- **WHEN** a user with role 'DonVi' calls POST /api/submissions/bulk-create
- **THEN** the system processes the request
- **AND** enforces tenancy restriction to the user's unit

#### Scenario: SoYTe user authorized for bulk creation
- **WHEN** a user with role 'SoYTe' calls POST /api/submissions/bulk-create
- **THEN** the system processes the request
- **AND** allows cross-unit submission creation

#### Scenario: NguoiHanhNghe user unauthorized for bulk creation
- **WHEN** a user with role 'NguoiHanhNghe' calls POST /api/submissions/bulk-create
- **THEN** the system returns a 403 Forbidden error
- **AND** does not create any submissions

#### Scenario: Auditor user unauthorized for bulk creation
- **WHEN** a user with role 'Auditor' calls POST /api/submissions/bulk-create
- **THEN** the system returns a 403 Forbidden error
- **AND** logs the unauthorized access attempt

#### Scenario: Unauthenticated request rejected
- **WHEN** an unauthenticated request is made to POST /api/submissions/bulk-create
- **THEN** the system returns a 401 Unauthorized error
- **AND** does not process the request
