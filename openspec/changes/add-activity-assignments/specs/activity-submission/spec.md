# Spec Delta: Activity Submission (Modified for Assignments)

## MODIFIED Requirements

### Requirement: Create Activity Submission
The system SHALL allow practitioners and unit admins to create activity submissions with optional evidence files, and optionally link submissions to assignments.

#### Scenario: Create submission without assignment
- **GIVEN** a practitioner selects catalog activity "Fire Safety Training"
- **WHEN** practitioner uploads evidence and submits
- **THEN** submission is created with status "ChoDuyet"
- **AND** MaGan field is NULL (not linked to assignment)

#### Scenario: Create submission linked to assignment
- **GIVEN** practitioner has assignment with MaGan "abc-123" for "Fire Safety Training"
- **WHEN** practitioner creates submission with MaGan "abc-123"
- **THEN** submission is created with status "ChoDuyet"
- **AND** submission.MaGan is set to "abc-123"
- **AND** assignment status updates to "DangThucHien"
- **AND** assignment.MaGhiNhan is set to submission ID

#### Scenario: Link validation prevents cross-practitioner linking
- **GIVEN** practitioner Alice attempts to link submission to Bob's assignment
- **WHEN** Alice provides Bob's MaGan in submission
- **THEN** request is rejected with 403 Forbidden
- **AND** error states "Assignment does not belong to you"

#### Scenario: Custom activity submission without assignment
- **GIVEN** practitioner cannot find activity in catalog
- **WHEN** practitioner creates custom submission without MaDanhMuc or MaGan
- **THEN** submission is created successfully
- **AND** admin must manually verify activity details during approval

---

## ADDED Requirements

### Requirement: Assignment Context Display
The system SHALL display assignment context in submission form when submission is fulfilling an assignment.

#### Scenario: Show assignment banner in form
- **GIVEN** practitioner navigates from "/my-assignments" with assignmentId parameter
- **WHEN** submission form loads
- **THEN** banner displays "📋 Fulfilling assignment: [Activity Name] • Deadline: [Date]"
- **AND** activity selector is pre-filled and locked

#### Scenario: Hide assignment banner for voluntary submissions
- **GIVEN** practitioner navigates to submission form without assignmentId
- **WHEN** form loads
- **THEN** no assignment banner is displayed
- **AND** activity selector is editable

---

## MODIFIED Requirements

### Requirement: Submission Approval Workflow
The system SHALL allow DonVi and SoYTe admins to approve or reject submissions, and update linked assignment status accordingly.

#### Scenario: Approve submission with linked assignment
- **GIVEN** submission with status "ChoDuyet" linked to assignment (MaGan not NULL)
- **WHEN** admin approves submission
- **THEN** submission status updates to "DaDuyet"
- **AND** linked assignment status updates to "DaHoanThanh"
- **AND** practitioner receives approval notification
- **AND** assignment completion notification is sent

#### Scenario: Reject submission with linked assignment
- **GIVEN** submission with status "ChoDuyet" linked to assignment
- **WHEN** admin rejects submission with reason "Insufficient evidence"
- **THEN** submission status updates to "TuChoi"
- **AND** linked assignment status reverts to "ChuaHoanThanh"
- **AND** assignment.MaGhiNhan is cleared
- **AND** practitioner receives rejection notification with reason

#### Scenario: Approve submission without assignment link
- **GIVEN** submission with status "ChoDuyet" and MaGan = NULL
- **WHEN** admin approves submission
- **THEN** submission status updates to "DaDuyet"
- **AND** no assignment status is updated
- **AND** practitioner receives approval notification
