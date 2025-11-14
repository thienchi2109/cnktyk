# Spec Delta: Activity Assignments

## ADDED Requirements

### Requirement: Bulk Assignment Creation
The system SHALL allow DonVi and SoYTe admins to create multiple activity assignments by selecting practitioners using cohort filters.

#### Scenario: Successful bulk assignment
- **GIVEN** a DonVi admin selects catalog activity "COVID-19 Training"
- **WHEN** they select 50 practitioners using cohort filters and set deadline 2025-12-31
- **THEN** 50 assignments are created with status "ChuaHoanThanh"
- **AND** each practitioner receives a notification
- **AND** audit log captures the bulk operation with cohort metadata

#### Scenario: Duplicate assignment prevention
- **GIVEN** practitioner Alice already has assignment for "COVID-19 Training"
- **WHEN** admin attempts to assign same activity to Alice again
- **THEN** the duplicate is silently skipped (idempotent)
- **AND** response includes `{ created: 0, skipped: 1, duplicates: ["alice-id"] }`

#### Scenario: Cross-unit assignment blocked
- **GIVEN** a DonVi admin from Unit A
- **WHEN** they attempt to assign activity to practitioners from Unit B
- **THEN** request is rejected with 403 Forbidden
- **AND** audit log captures the attempted violation

---

### Requirement: Assignment Status Tracking
The system SHALL track assignment lifecycle through statuses: ChuaHoanThanh (not started), DangThucHien (in progress), DaHoanThanh (completed), and QuaHan (overdue).

#### Scenario: Assignment starts when submission created
- **GIVEN** an assignment with status "ChuaHoanThanh"
- **WHEN** practitioner creates a submission linked to this assignment
- **THEN** assignment status updates to "DangThucHien"
- **AND** assignment is linked to the submission via MaGhiNhan

#### Scenario: Assignment completes when submission approved
- **GIVEN** an assignment with status "DangThucHien" and linked submission
- **WHEN** admin approves the submission
- **THEN** assignment status updates to "DaHoanThanh"
- **AND** practitioner receives completion notification

#### Scenario: Overdue status computed
- **GIVEN** an assignment with deadline 2025-11-01 and status "ChuaHoanThanh"
- **WHEN** current date is 2025-11-02
- **THEN** effective status is computed as "QuaHan"
- **AND** overdue notification is triggered

#### Scenario: Assignment resets on submission rejection
- **GIVEN** an assignment with status "DangThucHien" and linked submission
- **WHEN** admin rejects the submission
- **THEN** assignment status reverts to "ChuaHoanThanh"
- **AND** MaGhiNhan link is cleared
- **AND** practitioner receives rejection notification

---

### Requirement: Practitioner Assignment View
The system SHALL provide practitioners with a view of their assigned activities including status, deadline, and completion progress.

#### Scenario: List assignments with deadlines
- **GIVEN** practitioner Alice has 3 assignments
- **WHEN** Alice views "/my-assignments"
- **THEN** all 3 assignments are displayed with activity name, deadline, and status
- **AND** assignments are sorted by deadline (earliest first)
- **AND** days remaining are calculated for upcoming deadlines

#### Scenario: Filter by status
- **GIVEN** practitioner has 10 assignments (3 completed, 5 pending, 2 overdue)
- **WHEN** practitioner filters by status "overdue"
- **THEN** only 2 overdue assignments are displayed
- **AND** they are highlighted in red

#### Scenario: Navigate to fulfillment
- **GIVEN** practitioner views pending assignment "Fire Safety Training"
- **WHEN** they click "Start Assignment"
- **THEN** submission form opens with activity pre-selected
- **AND** assignment context banner displays deadline
- **AND** assignment ID is passed as URL parameter

---

### Requirement: Admin Compliance Dashboard
The system SHALL provide admins with a compliance tracking dashboard showing assignment completion rates and overdue practitioners.

#### Scenario: View completion statistics
- **GIVEN** a DonVi admin has assigned "COVID Training" to 100 practitioners
- **WHEN** admin views tracking dashboard
- **THEN** stats show: 60 completed (60%), 25 in progress (25%), 15 overdue (15%)
- **AND** completion rate is displayed as progress bar

#### Scenario: Filter by activity catalog
- **GIVEN** admin has created assignments for 3 different activities
- **WHEN** admin filters by "Fire Safety"
- **THEN** only assignments for "Fire Safety" are displayed
- **AND** stats are recalculated for filtered subset

#### Scenario: Bulk reminder sending
- **GIVEN** 20 assignments are overdue
- **WHEN** admin selects all overdue assignments and clicks "Send Reminders"
- **THEN** 20 reminder notifications are queued
- **AND** success message shows "Sent 20 reminders"

#### Scenario: Export compliance report
- **GIVEN** admin has filtered assignments by date range
- **WHEN** admin clicks "Export CSV"
- **THEN** CSV file downloads with columns: Practitioner, Activity, Status, Deadline, Completed Date
- **AND** file includes only filtered results

---

### Requirement: Automated Reminder Notifications
The system SHALL send automated reminder notifications for upcoming and overdue assignment deadlines.

#### Scenario: Reminder 7 days before deadline
- **GIVEN** an assignment with deadline 2025-11-10 and status "ChuaHoanThanh"
- **WHEN** date is 2025-11-03 and scheduled job runs
- **THEN** reminder notification is sent to assigned practitioner
- **AND** notification includes activity name and deadline

#### Scenario: Overdue notification on deadline day
- **GIVEN** an assignment with deadline 2025-11-01 and status "ChuaHoanThanh"
- **WHEN** date is 2025-11-01 at 6 PM and scheduled job runs
- **THEN** overdue notification is sent to practitioner
- **AND** admin receives escalation notification

#### Scenario: No reminder for completed assignments
- **GIVEN** an assignment with status "DaHoanThanh"
- **WHEN** scheduled reminder job runs
- **THEN** no notification is sent (assignment is complete)

---

### Requirement: Assignment-Submission Linking
The system SHALL link activity submissions to assignments to enable completion tracking and credit attribution.

#### Scenario: Create submission with assignment link
- **GIVEN** practitioner has assignment with MaGan "abc-123"
- **WHEN** practitioner submits activity with MaGan "abc-123"
- **THEN** submission is created with MaGan field populated
- **AND** assignment status updates to "DangThucHien"
- **AND** assignment's MaGhiNhan is set to submission ID

#### Scenario: Prevent linking to wrong practitioner's assignment
- **GIVEN** practitioner Alice attempts to create submission for assignment belonging to Bob
- **WHEN** submission includes Bob's MaGan
- **THEN** request is rejected with 403 Forbidden
- **AND** error message states "Assignment does not belong to you"

#### Scenario: Credits counted via linked submission
- **GIVEN** assignment linked to approved submission with 10 credits
- **WHEN** compliance report is generated
- **THEN** credits from linked submission count toward practitioner's total
- **AND** assignment shows as contributing to CPD compliance

---

### Requirement: Tenancy Isolation for Assignments
The system SHALL enforce unit-level tenancy isolation for all assignment operations to prevent cross-unit data access.

#### Scenario: DonVi queries filtered by unit
- **GIVEN** a DonVi admin from Unit A
- **WHEN** admin queries tracking dashboard
- **THEN** only assignments created for Unit A practitioners are returned
- **AND** assignments from other units are not visible

#### Scenario: SoYTe can view all units
- **GIVEN** a SoYTe admin
- **WHEN** SoYTe queries tracking dashboard without unit filter
- **THEN** assignments from all units are returned
- **AND** results include unit identification

#### Scenario: Practitioner sees only own assignments
- **GIVEN** practitioner Alice from Unit A
- **WHEN** Alice views "/my-assignments"
- **THEN** only Alice's assignments are returned
- **AND** other practitioners' assignments are not visible

---

### Requirement: Assignment Deadline Management
The system SHALL support optional assignment deadlines and compute overdue status based on deadline dates.

#### Scenario: Assignment without deadline
- **GIVEN** admin creates assignment with no deadline (HanHoanThanh = NULL)
- **WHEN** practitioner views assignment
- **THEN** deadline field shows "No deadline"
- **AND** overdue status is never computed

#### Scenario: Assignment with past deadline at creation
- **GIVEN** admin creates assignment with deadline 2025-10-01 on 2025-11-01
- **WHEN** assignment is created
- **THEN** system allows creation but shows warning "Deadline is in the past"
- **AND** effective status immediately computes as "QuaHan"

#### Scenario: Deadline extension
- **GIVEN** an assignment with deadline 2025-11-01
- **WHEN** admin updates deadline to 2025-12-01
- **THEN** assignment deadline is updated
- **AND** overdue status recalculates if applicable
- **AND** practitioner receives notification of extension

---

### Requirement: Assignment Audit Trail
The system SHALL log all assignment creation, status changes, and bulk operations for compliance auditing.

#### Scenario: Bulk assignment logged
- **GIVEN** admin creates 50 assignments via bulk endpoint
- **WHEN** assignments are created
- **THEN** audit log entry captures: action "GAN_HOAT_DONG_HANG_LOAT", admin ID, catalog ID, cohort metadata, created count
- **AND** timestamp and IP address are recorded

#### Scenario: Status change logged
- **GIVEN** assignment status changes from "ChuaHoanThanh" to "DangThucHien"
- **WHEN** status update occurs
- **THEN** audit log entry captures: assignment ID, old status, new status, trigger (submission creation), timestamp

#### Scenario: Reminder sending logged
- **GIVEN** admin sends bulk reminder to 20 practitioners
- **WHEN** reminders are queued
- **THEN** audit log entry captures: action "GOI_NHAC_NHO", admin ID, assignment IDs, reminder count
