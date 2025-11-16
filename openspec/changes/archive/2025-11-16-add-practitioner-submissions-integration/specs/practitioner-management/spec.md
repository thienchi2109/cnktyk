# Practitioner Management - Specification Deltas

**Change ID:** `add-practitioner-submissions-integration`
**Spec:** `practitioner-management`
**Status:** New capability

---

## Purpose

Define requirements for managing healthcare practitioners and viewing their compliance status, including integration with activity submissions for drill-down investigation.

---

## ADDED Requirements

### Requirement: Practitioner Submissions Integration

The practitioner detail view SHALL provide integrated access to a practitioner's activity submissions including summary statistics, recent submissions preview, and navigation to the full submissions list.

#### Scenario: View submissions summary from practitioner detail
- **GIVEN** a DonVi user opens the detail sheet for a practitioner in their unit
- **WHEN** the detail sheet loads
- **THEN** the system SHALL display a summary card showing:
  - Count of pending submissions (ChoDuyet status)
  - Count of approved submissions (DaDuyet status)
  - Count of rejected submissions (TuChoi status)
  - Total count of all submissions
- **AND** each count SHALL be displayed with an appropriate status badge (yellow for pending, green for approved, red for rejected)

#### Scenario: View recent submissions preview
- **GIVEN** a DonVi user opens the detail sheet for a practitioner in their unit
- **WHEN** the detail sheet loads
- **THEN** the system SHALL display a preview table showing the 5 most recent submissions
- **AND** each submission row SHALL display:
  - Activity name (TenHoatDong)
  - Submission date (NgayGhiNhan) formatted as DD/MM/YYYY
  - Status badge (ChoDuyet, DaDuyet, or TuChoi)
  - Credits earned (SoTinChiQuyDoi or calculated from SoGio)

#### Scenario: Navigate to full submissions list
- **GIVEN** a DonVi user is viewing a practitioner's detail sheet
- **WHEN** the user clicks the "View All Submissions" button
- **THEN** the system SHALL navigate to the submissions page at `/submissions`
- **AND** the submissions list SHALL be pre-filtered to show only submissions from that practitioner
- **AND** the practitioner ID SHALL be passed via query parameter: `?practitionerId={MaNhanVien}`

#### Scenario: Empty state for practitioner with no submissions
- **GIVEN** a practitioner has zero activity submissions
- **WHEN** a DonVi user opens their detail sheet
- **THEN** the summary card SHALL display all counts as zero
- **AND** the recent submissions table SHALL show an empty state message: "Chưa có hoạt động gần đây"
- **AND** the "View All Submissions" button SHALL still be visible and functional

#### Scenario: Loading state during data fetch
- **GIVEN** a DonVi user opens a practitioner's detail sheet
- **WHEN** the submissions data is being fetched from the API
- **THEN** the summary card SHALL display a loading skeleton with placeholder content
- **AND** the recent submissions table SHALL display loading skeleton rows (5 rows)
- **AND** the loading state SHALL be visible for no more than 2 seconds under normal network conditions

#### Scenario: Error state on API failure
- **GIVEN** a DonVi user opens a practitioner's detail sheet
- **WHEN** the submissions API request fails (network error, server error, or timeout)
- **THEN** the system SHALL display an error alert with message: "Không thể tải dữ liệu hoạt động. Vui lòng thử lại."
- **AND** the error alert SHALL include a retry button
- **AND** the detail sheet SHALL remain functional (other sections still visible)

---

### Requirement: Practitioner Submissions RBAC

The practitioner submissions integration SHALL enforce role-based access control consistent with existing RBAC policies.

#### Scenario: DonVi user views only own unit's data
- **GIVEN** a DonVi user with unitId "UNIT-001"
- **WHEN** they open the detail sheet for a practitioner from "UNIT-001"
- **THEN** the system SHALL display submissions summary and preview for that practitioner
- **AND** the API SHALL filter submissions to only those from practitioners in "UNIT-001"

#### Scenario: DonVi user cannot access other unit's practitioners
- **GIVEN** a DonVi user with unitId "UNIT-001"
- **WHEN** they attempt to view submissions for a practitioner from "UNIT-002"
- **THEN** the system SHALL return a 403 Forbidden error
- **AND** the detail sheet SHALL display an error message: "Không có quyền truy cập dữ liệu của đơn vị khác"

#### Scenario: SoYTe user views any practitioner's submissions
- **GIVEN** a SoYTe user (Department of Health role)
- **WHEN** they open the detail sheet for any practitioner
- **THEN** the system SHALL display submissions summary and preview for that practitioner
- **AND** no unit-based filtering SHALL be applied
- **AND** the user SHALL see all submissions regardless of unit

#### Scenario: NguoiHanhNghe user views only own submissions
- **GIVEN** a NguoiHanhNghe (Practitioner) user viewing their own profile
- **WHEN** they open their detail view
- **THEN** the system SHALL display only their own submissions
- **AND** the API SHALL enforce that practitionerId matches the logged-in user's practitioner ID

---

### Requirement: Practitioner Submissions Performance

The practitioner submissions integration SHALL load efficiently without degrading the performance of the practitioner detail sheet.

#### Scenario: Parallel API requests
- **GIVEN** a user opens a practitioner's detail sheet
- **WHEN** the submissions data is fetched
- **THEN** the summary statistics request and recent submissions request SHALL be made in parallel (not sequential)
- **AND** the total network time SHALL not exceed 500ms under normal conditions

#### Scenario: Cached data reuse
- **GIVEN** a user has viewed a practitioner's detail sheet with submissions data
- **WHEN** they close the sheet and reopen it within 30 seconds
- **THEN** the system SHALL use cached data from TanStack Query
- **AND** no new API requests SHALL be made (unless explicitly invalidated)

#### Scenario: Optimistic UI updates
- **GIVEN** a user is viewing a practitioner's submissions preview
- **WHEN** they approve a submission from the full submissions page
- **THEN** upon returning to the practitioner detail sheet, the cache SHALL be invalidated
- **AND** fresh data SHALL be fetched showing the updated approval status

---

### Requirement: Practitioner Detail Navigation

The practitioner detail sheet SHALL support contextual navigation to related pages while maintaining user context.

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

---

### Requirement: Practitioner Submissions Accessibility

The practitioner submissions integration SHALL meet WCAG 2.1 AA accessibility standards.

#### Scenario: Keyboard navigation
- **GIVEN** a user navigating with keyboard only
- **WHEN** they tab through the practitioner detail sheet
- **THEN** focus SHALL move logically through: summary card → recent submissions table rows → "View All" button
- **AND** Enter key on "View All" button SHALL trigger navigation
- **AND** focus indicators SHALL be clearly visible

#### Scenario: Screen reader support
- **GIVEN** a user using a screen reader
- **WHEN** they navigate the practitioner detail sheet
- **THEN** the summary card SHALL announce: "Tóm tắt hoạt động: {X} chờ duyệt, {Y} đã duyệt, {Z} từ chối"
- **AND** the recent submissions table SHALL be properly labeled with column headers
- **AND** status badges SHALL have accessible text alternatives

---

### Requirement: Practitioner Submissions Data Integrity

The submissions data displayed in the practitioner detail sheet SHALL be consistent with the data shown in the submissions list page.

#### Scenario: Consistent submission counts
- **GIVEN** a practitioner with 12 approved, 3 pending, and 1 rejected submission
- **WHEN** a user views the summary card in the detail sheet
- **THEN** the counts SHALL match exactly: 12 approved, 3 pending, 1 rejected
- **AND** when navigating to the submissions list with filter applied
- **THEN** the total count SHALL match the sum from the summary card (16 total)

#### Scenario: Consistent credit calculations
- **GIVEN** a submission displayed in the recent submissions table
- **WHEN** the user views the same submission in the full submissions list
- **THEN** the credits shown SHALL be identical
- **AND** the calculation method SHALL be the same (SoTinChiQuyDoi override or SoGio * TyLeQuyDoi)

---

## Notes

### Implementation Considerations

1. **API Reuse:** The existing `/api/submissions` endpoint already supports `practitionerId` filtering. No backend changes required for basic functionality.

2. **Optional Optimization:** A dedicated `/api/submissions/summary?practitionerId={id}` endpoint could improve performance by avoiding fetching full submission data just for counts. Can be implemented later if needed.

3. **Caching Strategy:** Use TanStack Query with 30-second stale time for submissions data. Invalidate cache when:
   - User creates a new submission
   - User approves/rejects a submission
   - User manually refreshes (F5)

4. **Error Handling:** Graceful degradation - if submissions data fails to load, the rest of the practitioner detail sheet should remain functional.

5. **Mobile Responsiveness:** Recent submissions table should stack vertically on small screens or use horizontal scroll with sticky first column.

### Future Enhancements (Out of Scope)

- Quick approval actions directly from preview table
- Visual timeline of submissions over 5-year compliance cycle
- Export individual practitioner compliance report (PDF/Excel)
- Real-time submission count updates via WebSocket
- Bulk selection of submissions from preview table

### Related Specs

- **activity-submission:** Uses submissions API with practitionerId filter
- **dashboard:** Similar drill-down pattern (summary → details)
- **user-management:** RBAC enforcement patterns
