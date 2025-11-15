## ADDED Requirements

### Requirement: Create Healthcare Unit
The system SHALL provide functionality for SoYTe administrators to create new healthcare units in the organizational hierarchy.

#### Scenario: Create unit with complete information
- **WHEN** a SoYTe administrator submits a create unit form with name, management level, parent unit, and active status
- **THEN** the system SHALL validate all required fields
- **AND** the system SHALL verify the parent unit exists and is active
- **AND** the system SHALL create a new unit record in the database
- **AND** the system SHALL log the CREATE operation to the audit trail
- **AND** the system SHALL return the created unit with HTTP 201 status
- **AND** the system SHALL display a success notification to the user

#### Scenario: Create root-level unit without parent
- **WHEN** a SoYTe administrator creates a unit without specifying a parent unit
- **THEN** the system SHALL accept the unit as a root-level organizational node
- **AND** the system SHALL set the parent unit ID to null
- **AND** the system SHALL create the unit successfully

#### Scenario: Create unit with invalid parent
- **WHEN** a SoYTe administrator attempts to create a unit with a non-existent parent unit ID
- **THEN** the system SHALL reject the request with HTTP 400 status
- **AND** the system SHALL return an error message indicating the parent unit does not exist
- **AND** the system SHALL not create the unit

#### Scenario: Create unit as non-SoYTe user
- **WHEN** a user with DonVi, NguoiHanhNghe, or Auditor role attempts to create a unit
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden status
- **AND** the system SHALL not create the unit

### Requirement: Update Healthcare Unit
The system SHALL provide functionality for SoYTe administrators to update existing healthcare unit details including name, management level, parent unit, and status.

#### Scenario: Update unit name
- **WHEN** a SoYTe administrator updates a unit's name
- **THEN** the system SHALL validate the new name is not empty
- **AND** the system SHALL update the unit record in the database
- **AND** the system SHALL log the UPDATE operation to the audit trail with old and new values
- **AND** the system SHALL return the updated unit with HTTP 200 status
- **AND** the system SHALL display a success notification

#### Scenario: Update unit parent (valid hierarchy)
- **WHEN** a SoYTe administrator changes a unit's parent to a different valid unit
- **THEN** the system SHALL verify the new parent unit exists and is active
- **AND** the system SHALL validate the change does not create a circular reference
- **AND** the system SHALL update the parent unit relationship
- **AND** the system SHALL log the hierarchy change to the audit trail
- **AND** the system SHALL return the updated unit

#### Scenario: Update unit parent (circular reference prevention)
- **WHEN** a SoYTe administrator attempts to set a unit's parent to one of its own descendants
- **THEN** the system SHALL detect the circular reference
- **AND** the system SHALL reject the request with HTTP 400 status
- **AND** the system SHALL return an error message explaining the circular reference issue
- **AND** the system SHALL not update the unit

#### Scenario: Update non-existent unit
- **WHEN** a SoYTe administrator attempts to update a unit that does not exist
- **THEN** the system SHALL return HTTP 404 Not Found status
- **AND** the system SHALL return an error message indicating the unit was not found

#### Scenario: Update unit as non-SoYTe user
- **WHEN** a user with DonVi, NguoiHanhNghe, or Auditor role attempts to update a unit
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden status
- **AND** the system SHALL not update the unit

### Requirement: Deactivate Healthcare Unit
The system SHALL provide functionality for SoYTe administrators to deactivate (soft delete) healthcare units that are no longer active, with safeguards to prevent deletion of units with active dependents.

#### Scenario: Deactivate unit with no dependents
- **WHEN** a SoYTe administrator deactivates a unit that has no active child units, practitioners, or user accounts
- **THEN** the system SHALL verify the unit has no active dependents
- **AND** the system SHALL set the unit's status (TrangThai) to false
- **AND** the system SHALL log the DELETE operation to the audit trail
- **AND** the system SHALL return a success message with HTTP 200 status
- **AND** the system SHALL display a success notification

#### Scenario: Prevent deletion of unit with active children
- **WHEN** a SoYTe administrator attempts to deactivate a unit that has one or more active child units
- **THEN** the system SHALL count the active child units
- **AND** the system SHALL reject the request with HTTP 409 Conflict status
- **AND** the system SHALL return an error message indicating the unit has X active child units
- **AND** the system SHALL not deactivate the unit

#### Scenario: Prevent deletion of unit with practitioners
- **WHEN** a SoYTe administrator attempts to deactivate a unit that has one or more active practitioners
- **THEN** the system SHALL count the active practitioners in the unit
- **AND** the system SHALL reject the request with HTTP 409 Conflict status
- **AND** the system SHALL return an error message indicating the unit has X active practitioners
- **AND** the system SHALL not deactivate the unit

#### Scenario: Prevent deletion of unit with user accounts
- **WHEN** a SoYTe administrator attempts to deactivate a unit that has one or more active user accounts
- **THEN** the system SHALL count the active user accounts associated with the unit
- **AND** the system SHALL reject the request with HTTP 409 Conflict status
- **AND** the system SHALL return an error message indicating the unit has X active user accounts
- **AND** the system SHALL not deactivate the unit

#### Scenario: Display dependent counts before deletion
- **WHEN** a SoYTe administrator opens the delete confirmation dialog for a unit
- **THEN** the system SHALL fetch and display the count of child units
- **AND** the system SHALL fetch and display the count of practitioners in the unit
- **AND** the system SHALL fetch and display the count of user accounts in the unit
- **AND** the system SHALL disable the delete button if any dependents exist
- **AND** the system SHALL show a clear message explaining why deletion is prevented

#### Scenario: Deactivate unit as non-SoYTe user
- **WHEN** a user with DonVi, NguoiHanhNghe, or Auditor role attempts to deactivate a unit
- **THEN** the system SHALL reject the request with HTTP 403 Forbidden status
- **AND** the system SHALL not deactivate the unit

### Requirement: Unit Management User Interface
The system SHALL provide an intuitive user interface for SoYTe administrators to create, edit, and delete healthcare units through the DoH (Department of Health) dashboard.

#### Scenario: Display create unit button
- **WHEN** a SoYTe administrator views the units listing page at `/dashboard/doh/units`
- **THEN** the system SHALL display a "Create Unit" button in the page header
- **AND** clicking the button SHALL open a create unit dialog

#### Scenario: Display edit and delete actions in unit grid
- **WHEN** a SoYTe administrator views the unit comparison grid
- **THEN** the system SHALL display an Edit icon (Pencil) for each unit row
- **AND** the system SHALL display a Delete icon (Trash) for each unit row
- **AND** hovering over icons SHALL show tooltip hints
- **AND** clicking Edit SHALL open the edit unit dialog with pre-populated data
- **AND** clicking Delete SHALL open the delete confirmation dialog

#### Scenario: Display edit and delete actions in unit detail sheet
- **WHEN** a SoYTe administrator opens a unit's detail sheet
- **THEN** the system SHALL display an Edit button in the sheet header
- **AND** the system SHALL display a Delete button in the sheet header
- **AND** clicking Edit SHALL open the edit unit dialog
- **AND** clicking Delete SHALL open the delete confirmation dialog

#### Scenario: Create/Edit unit form fields
- **WHEN** a SoYTe administrator opens the create or edit unit dialog
- **THEN** the system SHALL display a form with the following fields:
  - Unit Name (TenDonVi) - required text input
  - Management Level (CapQuanLy) - required select with options: Tinh, Huyen, Xa, BenhVien, TramYTe, PhongKham
  - Parent Unit (MaDonViCha) - optional hierarchical dropdown showing unit hierarchy
  - Status (TrangThai) - toggle switch, default active
- **AND** the form SHALL validate inputs before submission
- **AND** the form SHALL display Vietnamese error messages for validation failures
- **AND** the form SHALL show loading state during submission
- **AND** the form SHALL use glassmorphism design consistent with existing forms

#### Scenario: Form submission success
- **WHEN** a SoYTe administrator successfully submits a create or edit unit form
- **THEN** the system SHALL display a success toast notification
- **AND** the system SHALL close the dialog
- **AND** the system SHALL invalidate and refetch the units list cache
- **AND** the system SHALL update the displayed units list with the new/updated unit

#### Scenario: Form submission error
- **WHEN** a SoYTe administrator submits a unit form and the API returns an error
- **THEN** the system SHALL display an error toast notification with the error message
- **AND** the system SHALL keep the dialog open
- **AND** the system SHALL clear the loading state
- **AND** the system SHALL allow the user to retry or cancel

#### Scenario: Delete confirmation dialog
- **WHEN** a SoYTe administrator clicks the delete button for a unit
- **THEN** the system SHALL open a confirmation dialog
- **AND** the dialog SHALL display the unit name being deleted
- **AND** the dialog SHALL show a warning about permanent deactivation
- **AND** the dialog SHALL display counts of child units, practitioners, and user accounts
- **AND** the dialog SHALL require confirmation (checkbox or text input)
- **AND** the dialog SHALL disable the confirm button if the unit has active dependents
- **AND** the dialog SHALL show a message explaining why deletion is prevented

#### Scenario: Non-SoYTe user does not see management actions
- **WHEN** a user with DonVi, NguoiHanhNghe, or Auditor role views the units page
- **THEN** the system SHALL not display the Create Unit button
- **AND** the system SHALL not display Edit or Delete icons in the grid
- **AND** the system SHALL not display Edit or Delete buttons in the detail sheet

### Requirement: Unit Hierarchy Validation
The system SHALL validate unit hierarchy relationships to prevent circular references and maintain data integrity.

#### Scenario: Detect circular reference during create
- **WHEN** a SoYTe administrator attempts to create a unit with invalid hierarchy
- **AND** the validation logic detects a potential circular reference
- **THEN** the system SHALL reject the request
- **AND** the system SHALL return an error message explaining the circular reference issue

#### Scenario: Detect circular reference during update
- **WHEN** a SoYTe administrator attempts to change a unit's parent
- **AND** the new parent is a descendant of the unit being updated
- **THEN** the system SHALL traverse the hierarchy to detect the circular reference
- **AND** the system SHALL reject the request with HTTP 400 status
- **AND** the system SHALL return an error message with details of the circular path

#### Scenario: Validate parent unit exists and is active
- **WHEN** the system validates a unit's parent during create or update
- **THEN** the system SHALL query the database for the parent unit
- **AND** the system SHALL verify the parent unit exists
- **AND** the system SHALL verify the parent unit's status (TrangThai) is true
- **AND** if validation fails, the system SHALL reject the request with appropriate error message

### Requirement: Unit Management Audit Logging
The system SHALL log all unit create, update, and delete operations to the audit trail for compliance and operational visibility.

#### Scenario: Log unit creation
- **WHEN** a SoYTe administrator successfully creates a new unit
- **THEN** the system SHALL create an audit log entry in NhatKyHeThong table
- **AND** the log entry SHALL include:
  - Action type: "CREATE"
  - Table name: "DonVi"
  - Primary key: the new unit's MaDonVi
  - User ID: the administrator's MaTaiKhoan
  - Timestamp: current date and time
  - IP address: the request's IP address
  - Content: JSON object with the created unit data

#### Scenario: Log unit update with old and new values
- **WHEN** a SoYTe administrator successfully updates a unit
- **THEN** the system SHALL create an audit log entry
- **AND** the log entry SHALL include:
  - Action type: "UPDATE"
  - Content: JSON object with both old values and new values
  - All other standard audit fields (user, timestamp, IP)

#### Scenario: Log unit deactivation
- **WHEN** a SoYTe administrator successfully deactivates a unit
- **THEN** the system SHALL create an audit log entry
- **AND** the log entry SHALL include:
  - Action type: "DELETE"
  - Content: JSON object with the deactivated unit's details
  - All other standard audit fields

#### Scenario: Audit log is immutable
- **WHEN** any unit management audit log entry is created
- **THEN** the system SHALL use the immutable NhatKyHeThongRepository
- **AND** the log entry SHALL not be modifiable or deletable

### Requirement: Unit Data Validation
The system SHALL validate all unit data using Zod schemas with Vietnamese error messages before database operations.

#### Scenario: Validate required fields
- **WHEN** a create or update request is received
- **THEN** the system SHALL validate using CreateDonViSchema or UpdateDonViSchema
- **AND** the system SHALL require TenDonVi (unit name) to be a non-empty string
- **AND** the system SHALL require CapQuanLy (management level) to be a valid enum value
- **AND** the system SHALL validate MaDonViCha (parent unit ID) is a valid UUID if provided
- **AND** the system SHALL validate TrangThai (status) is a boolean value

#### Scenario: Return validation errors
- **WHEN** Zod validation fails for any field
- **THEN** the system SHALL return HTTP 400 Bad Request status
- **AND** the system SHALL include the Zod error details in the response
- **AND** the system SHALL format error messages in Vietnamese for the UI
- **AND** the system SHALL not proceed with the database operation

#### Scenario: Sanitize input data
- **WHEN** the system receives unit data from the client
- **THEN** the system SHALL validate and parse the data through Zod schemas
- **AND** the system SHALL prevent SQL injection by using parameterized queries
- **AND** the system SHALL prevent XSS by using React's built-in escaping for display
