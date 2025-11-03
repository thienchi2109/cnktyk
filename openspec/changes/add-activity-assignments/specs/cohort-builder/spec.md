# Spec Delta: Cohort Builder (Modified for Assignments)

## ADDED Requirements

### Requirement: Cohort Builder Reuse for Assignments
The system SHALL allow the existing Cohort Builder component to be reused in the activity assignment workflow for practitioner selection.

#### Scenario: Use cohort builder in assignment wizard
- **GIVEN** DonVi admin starts assignment wizard for "COVID Training"
- **WHEN** admin reaches "Select Practitioners" step
- **THEN** Cohort Builder component renders with filters (department, title, status)
- **AND** selection state persists across wizard steps
- **AND** preview shows practitioner count and sample names

#### Scenario: Select-all across pages for assignment
- **GIVEN** cohort filters resolve to 150 practitioners across 3 pages
- **WHEN** admin clicks "Select all across pages"
- **THEN** mode is set to "all" with excludedIds = []
- **AND** counter shows "150 selected"
- **AND** admin can exclude individuals via chips

#### Scenario: Manual selection for targeted assignment
- **GIVEN** admin wants to assign to specific practitioners only
- **WHEN** admin manually checks 10 practitioners across multiple pages
- **THEN** mode is set to "manual" with selectedIds = [10 practitioner IDs]
- **AND** selection persists when navigating pages
- **AND** counter shows "10 selected"

---

## MODIFIED Requirements

### Requirement: Cohort Selection Context
The system SHALL support cohort builder usage in both bulk approval and assignment contexts with appropriate UI labels.

#### Scenario: Cohort builder in approval context
- **GIVEN** admin navigates to bulk approval workflow
- **WHEN** cohort builder renders
- **THEN** header shows "Select Submissions to Approve"
- **AND** preview button says "Preview Approval"

#### Scenario: Cohort builder in assignment context
- **GIVEN** admin navigates to assignment wizard
- **WHEN** cohort builder renders
- **THEN** header shows "Select Practitioners to Assign"
- **AND** preview button says "Preview Assignment"
- **AND** filters default to "TrangThaiLamViec = DangLamViec" (active staff only)

---

## ADDED Requirements

### Requirement: Assignment Preview Integration
The system SHALL integrate cohort selection with assignment preview to show estimated assignment creation before confirmation.

#### Scenario: Preview assignment creation
- **GIVEN** admin has selected 50 practitioners via cohort builder
- **WHEN** admin clicks "Next" in assignment wizard
- **THEN** preview screen shows "Will create 45 assignments, 5 duplicates skipped"
- **AND** sample practitioner names are displayed (first 10)
- **AND** duplicate IDs are identified (already have this assignment)

#### Scenario: Preview with zero selections
- **GIVEN** admin has not selected any practitioners
- **WHEN** admin attempts to proceed to preview
- **THEN** "Next" button is disabled
- **AND** warning message shows "Please select at least one practitioner"
