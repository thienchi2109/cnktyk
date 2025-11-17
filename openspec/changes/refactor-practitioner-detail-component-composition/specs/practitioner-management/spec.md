# Practitioner Management Specification - Delta

This file contains changes to be applied to `openspec/specs/practitioner-management/spec.md`.

---

## ADDED Requirements

### Requirement: Practitioner Detail Section Components

The system SHALL provide reusable section components for displaying practitioner information in multiple contexts, following the component composition pattern.

#### Scenario: Render basic information section in compact mode
- **GIVEN** a practitioner detail view using the BasicInfoSection component
- **WHEN** the component is rendered with `variant="compact"`
- **THEN** the system SHALL display:
  - Practitioner name (HoVaTen)
  - Job title (ChucDanh) and department (KhoaPhong)
  - Work status badge (DangLamViec/TamHoan/DaNghi)
- **AND** the layout SHALL use reduced spacing (space-y-2)
- **AND** text sizes SHALL be smaller (text-sm)
- **AND** optional edit button SHALL be shown if `showEdit=true`

#### Scenario: Render basic information section in full mode
- **GIVEN** a practitioner detail view using the BasicInfoSection component
- **WHEN** the component is rendered with `variant="full"`
- **THEN** the system SHALL display the same information as compact mode
- **AND** the layout SHALL use spacious spacing (space-y-4)
- **AND** text sizes SHALL be standard (text-base)
- **AND** the section SHALL have more vertical padding

#### Scenario: Render compliance status section with progress visualization
- **GIVEN** a practitioner with compliance status data
- **WHEN** the ComplianceStatusSection component is rendered
- **THEN** the system SHALL display:
  - Compliance percentage with appropriate icon (CheckCircle/Clock/AlertTriangle)
  - Progress bar color-coded by status (green ≥90%, yellow 70-89%, red <70%)
  - Current credits vs required credits (e.g., "45 / 120 tín chỉ")
  - Remaining credits needed ("Còn thiếu: X tín chỉ")
  - Contextual alert for at_risk or non_compliant status
- **AND** all data SHALL match the compliance calculation from the backend

#### Scenario: Render contact information section with missing data
- **GIVEN** a practitioner with no email or phone number
- **WHEN** the ContactInfoSection component is rendered
- **THEN** the system SHALL display "Chưa cung cấp" for missing fields
- **AND** no broken links SHALL be rendered
- **AND** the section SHALL still be visible (not hidden)

#### Scenario: Reuse section components across multiple views
- **GIVEN** section components in practitioner-detail-sections directory
- **WHEN** both PractitionerDetailSheet and PractitionerProfile use the same sections
- **THEN** both views SHALL display identical information
- **AND** both views SHALL use the same TypeScript interfaces
- **AND** changes to section components SHALL automatically propagate to both views

---

### Requirement: Practitioner Detail Standalone Page Enhancement

The standalone practitioner detail page (`/practitioners/[id]`) SHALL provide comprehensive practitioner information including submissions integration, using the same components as the detail sheet.

#### Scenario: View standalone page with all information
- **GIVEN** a user navigates to `/practitioners/{id}` from the DonVi dashboard
- **WHEN** the page loads
- **THEN** the system SHALL display:
  - Basic information section (full variant)
  - License information section (full variant)
  - Contact information section (full variant)
  - Compliance status section (full variant)
  - **NEW:** Submissions section with summary and recent activities (full variant)
- **AND** the layout SHALL use a 3-column grid (2 columns main + 1 column sidebar)
- **AND** all sections SHALL be rendered using shared section components

#### Scenario: Navigate from DonVi dashboard to standalone page
- **GIVEN** a DonVi user viewing their dashboard
- **WHEN** they click the "Chi tiết" button for a practitioner
- **THEN** the system SHALL navigate to `/practitioners/{id}`
- **AND** the standalone page SHALL open in the same tab
- **AND** the browser back button SHALL return to the dashboard

#### Scenario: Edit practitioner from standalone page
- **GIVEN** a user with edit permissions viewing the standalone page
- **WHEN** they click the edit button in the BasicInfoSection
- **THEN** the system SHALL open an edit sheet overlay
- **AND** the sheet SHALL contain the PractitionerForm component
- **AND** upon successful edit, the sheet SHALL close
- **AND** the page SHALL refresh with updated data

#### Scenario: Submissions integration on standalone page
- **GIVEN** a user viewing the standalone practitioner page
- **WHEN** the page loads
- **THEN** the system SHALL display the SubmissionsSection component
- **AND** the section SHALL show the submissions summary card
- **AND** the section SHALL show the recent submissions table
- **AND** the section SHALL show "Xem tất cả hoạt động" button
- **AND** clicking the button SHALL navigate to `/submissions?practitionerId={id}`

---

### Requirement: Practitioner Detail Sheet Progressive Disclosure

The practitioner detail sheet SHALL provide quick preview functionality with clear navigation to the comprehensive standalone page.

#### Scenario: View full details button in sheet
- **GIVEN** a user has opened the practitioner detail sheet from the practitioners list
- **WHEN** the sheet loads
- **THEN** the system SHALL display a prominent "Xem Hồ Sơ Đầy Đủ" button at the top
- **AND** the button SHALL use medical variant styling (blue gradient)
- **AND** the button SHALL be full-width on mobile devices
- **AND** the button SHALL not be visible when in edit mode

#### Scenario: Navigate from sheet to standalone page
- **GIVEN** a user is viewing the practitioner detail sheet
- **WHEN** they click the "Xem Hồ Sơ Đầy Đủ" button
- **THEN** the system SHALL navigate to `/practitioners/{id}`
- **AND** the detail sheet SHALL remain open (browser preserves state)
- **AND** the browser back button SHALL close the standalone page and return to the list with sheet

#### Scenario: Compact layout in sheet view
- **GIVEN** a practitioner detail sheet using section components
- **WHEN** the sheet renders
- **THEN** all sections SHALL use `variant="compact"`
- **AND** the sheet SHALL be space-efficient (fits more info in viewport)
- **AND** font sizes SHALL be smaller than standalone page
- **AND** spacing SHALL be tighter than standalone page

---

### Requirement: Component Composition Architecture

The practitioner detail views SHALL follow the component composition pattern to eliminate code duplication and ensure consistency.

#### Scenario: Section component variant support
- **GIVEN** any section component (BasicInfo, License, Contact, Compliance, Submissions)
- **WHEN** the component receives a `variant` prop
- **THEN** the component SHALL support both "compact" and "full" variants
- **AND** the default variant SHALL be "full" if not specified
- **AND** the variant SHALL control spacing, text size, and padding
- **AND** the variant SHALL not change the data displayed (only layout)

#### Scenario: Section component type safety
- **GIVEN** section components with TypeScript interfaces
- **WHEN** a parent component uses a section component
- **THEN** TypeScript SHALL enforce correct prop types at compile time
- **AND** missing required props SHALL cause TypeScript errors
- **AND** incorrect prop types SHALL cause TypeScript errors
- **AND** the IDE SHALL provide autocomplete for props

#### Scenario: Zero code duplication between views
- **GIVEN** PractitionerDetailSheet and PractitionerProfile components
- **WHEN** both components render practitioner information
- **THEN** both SHALL import and use the same section components
- **AND** neither SHALL contain duplicate rendering logic
- **AND** changes to data display SHALL be made in section components only
- **AND** both views SHALL remain in sync automatically

---

## MODIFIED Requirements

### Requirement: Practitioner Submissions Integration

The practitioner detail view SHALL provide integrated access to a practitioner's activity submissions including summary statistics, recent submissions preview, and navigation to the full submissions list. **This feature SHALL be available in both the detail sheet and the standalone page.**

#### Scenario: View submissions summary from practitioner detail
- **GIVEN** a DonVi user opens the detail sheet **or standalone page** for a practitioner in their unit
- **WHEN** the detail view loads
- **THEN** the system SHALL display a summary card showing:
  - Count of pending submissions (ChoDuyet status)
  - Count of approved submissions (DaDuyet status)
  - Count of rejected submissions (TuChoi status)
  - Total count of all submissions
- **AND** each count SHALL be displayed with an appropriate status badge (yellow for pending, green for approved, red for rejected)
- **AND** the SubmissionsSection component SHALL be used in both views

#### Scenario: View recent submissions preview
- **GIVEN** a DonVi user opens the detail sheet **or standalone page** for a practitioner in their unit
- **WHEN** the detail view loads
- **THEN** the system SHALL display a preview table showing the 5 most recent submissions
- **AND** each submission row SHALL display:
  - Activity name (TenHoatDong)
  - Submission date (NgayGhiNhan) formatted as DD/MM/YYYY
  - Status badge (ChoDuyet, DaDuyet, or TuChoi)
  - Credits earned (SoTinChiQuyDoi or calculated from SoGio)
- **AND** the same RecentSubmissionsTable component SHALL be used in both views

#### Scenario: Navigate to full submissions list
- **GIVEN** a DonVi user is viewing a practitioner's detail sheet **or standalone page**
- **WHEN** the user clicks the "View All Submissions" button
- **THEN** the system SHALL navigate to the submissions page at `/submissions`
- **AND** the submissions list SHALL be pre-filtered to show only submissions from that practitioner
- **AND** the practitioner ID SHALL be passed via query parameter: `?practitionerId={MaNhanVien}`
- **AND** the button SHALL be available in both views

#### Scenario: Empty state for practitioner with no submissions
- **GIVEN** a practitioner has zero activity submissions
- **WHEN** a DonVi user opens their detail sheet **or standalone page**
- **THEN** the summary card SHALL display all counts as zero
- **AND** the recent submissions table SHALL show an empty state message: "Chưa có hoạt động gần đây"
- **AND** the "View All Submissions" button SHALL still be visible and functional
- **AND** the behavior SHALL be identical in both views

#### Scenario: Loading state during data fetch
- **GIVEN** a DonVi user opens a practitioner's detail sheet **or standalone page**
- **WHEN** the submissions data is being fetched from the API
- **THEN** the summary card SHALL display a loading skeleton with placeholder content
- **AND** the recent submissions table SHALL display loading skeleton rows (5 rows)
- **AND** the loading state SHALL be visible for no more than 2 seconds under normal network conditions
- **AND** the SubmissionsSection component SHALL handle loading states internally

#### Scenario: Error state on API failure
- **GIVEN** a DonVi user opens a practitioner's detail sheet **or standalone page**
- **WHEN** the submissions API request fails (network error, server error, or timeout)
- **THEN** the system SHALL display an error alert with message: "Không thể tải dữ liệu hoạt động. Vui lòng thử lại."
- **AND** the error alert SHALL include a retry button
- **AND** the detail view SHALL remain functional (other sections still visible)
- **AND** the error handling SHALL be consistent in both views

---

### Requirement: Practitioner Detail Navigation

The practitioner detail sheet SHALL support contextual navigation to related pages **and to the standalone detail page** while maintaining user context.

#### Scenario: Navigate to submissions and return
- **GIVEN** a user is on the practitioners list page
- **WHEN** they open a practitioner's detail sheet and click "View All Submissions"
- **THEN** the system SHALL navigate to `/submissions?practitionerId={id}`
- **AND** the browser back button SHALL return to the practitioners list page
- **AND** the detail sheet SHALL be closed upon return (expected behavior)

#### Scenario: Direct link to filtered submissions
- **GIVEN** a user receives a link to `/submissions?practitionerId={id}`
- **WHEN** they visit the link
- **THEN** the submissions list SHALL automatically apply the practitionerId filter
- **AND** an info notice SHALL be displayed: "Đang hiển thị hoạt động của: {Practitioner Name}"
- **AND** a "Clear Filter" button SHALL be available to remove the filter

#### Scenario: Navigate from sheet to standalone page
- **GIVEN** a user is viewing the practitioner detail sheet
- **WHEN** they click the "Xem Hồ Sơ Đầy Đủ" button
- **THEN** the system SHALL navigate to `/practitioners/{id}`
- **AND** the standalone page SHALL load with full detail view
- **AND** the browser back button SHALL return to the previous page (list or dashboard)

#### Scenario: Navigate from standalone page to submissions
- **GIVEN** a user is viewing the standalone practitioner detail page
- **WHEN** they click "Xem tất cả hoạt động" in the SubmissionsSection
- **THEN** the system SHALL navigate to `/submissions?practitionerId={id}`
- **AND** the browser back button SHALL return to the standalone page

---

## REMOVED Requirements

None. This is an additive change that enhances existing functionality.

---

## RENAMED Requirements

None. All existing requirements retain their names.
