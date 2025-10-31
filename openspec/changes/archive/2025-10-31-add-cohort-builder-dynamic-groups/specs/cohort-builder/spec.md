## ADDED Requirements

### Requirement: Cohort Builder for DonVi (Dynamic Groups)
The system SHALL provide a Cohort Builder for DonVi admins to select internal practitioners via filters and bulk-select across pages with individual exclusions, and to save reusable dynamic groups.

#### Scenario: Filter by organizational attributes
- WHEN a DonVi admin opens Cohort Builder
- THEN they can filter practitioners by Khoa/Phòng, Chức danh, Trạng thái làm việc (default “Đang làm việc”), and Tag
- AND search within the filtered set

#### Scenario: Select-all across pages with exclusions
- WHEN the admin clicks “Select all” on a filtered list spanning multiple pages
- THEN all currently filtered practitioners are selected (not only visible rows)
- AND the admin can exclude specific individuals via chips that persist across pagination and sorting

#### Scenario: Live counts and preview
- WHEN filters/selection change
- THEN the UI updates counts for total filtered, selected, and excluded
- AND a Preview/Dry-run shows how many records would be created, skipped, or detected as duplicates before confirmation

#### Scenario: Save and reuse “Nhóm thông minh”
- WHEN the admin saves a cohort as a preset
- THEN the system stores the dynamic filter definition (not static members) scoped to the admin’s Đơn vị
- AND loading the preset re-applies filters against the current roster

#### Scenario: Idempotent application in bulk assignment
- WHEN applying the selected cohort to an activity/event
- THEN the system MUST avoid duplicates for the same practitioner and activity (idempotent upsert)
- AND rerunning with the same cohort only adds newly eligible members and does not create duplicates

#### Scenario: RBAC and tenancy
- GIVEN the admin has DonVi role
- THEN the system restricts visibility and selection to practitioners of that Đơn vị only

#### Scenario: Performance baseline
- GIVEN a cohort of up to 2,000 practitioners
- THEN select-all and preview operations complete within p95 ≤ 2s, and pagination remains responsive
