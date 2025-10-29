# user-management Specification

## Purpose
Defines behavioral requirements for user management functionality, including role-based access control and the DonVi (Unit Admin) account management feature flag.
## Requirements
### Requirement: Feature Flag Control for DonVi Account Management
The system SHALL provide a feature flag mechanism to enable or disable account management functionality for DonVi (Unit Admin) role users without requiring code changes.

#### Scenario: Feature flag disabled - DonVi user accesses users page
- **WHEN** a DonVi user navigates to the users management page
- **AND** the `ENABLE_DONVI_ACCOUNT_MANAGEMENT` feature flag is set to `false` or not set
- **THEN** the system SHALL display a friendly informational message in Vietnamese and English
- **AND** the system SHALL not render user management controls (create, edit, delete)

#### Scenario: Feature flag enabled - DonVi user accesses users page
- **WHEN** a DonVi user navigates to the users management page
- **AND** the `ENABLE_DONVI_ACCOUNT_MANAGEMENT` feature flag is set to `true`
- **THEN** the system SHALL render the full user management interface
- **AND** the user SHALL be able to create, edit, and delete user accounts within their unit

#### Scenario: SoYTe user always has access
- **WHEN** a SoYTe (Department of Health) user navigates to the users management page
- **THEN** the system SHALL render the full user management interface
- **AND** the feature flag SHALL not affect SoYTe user access

#### Scenario: Navigation menu reflects feature flag state
- **WHEN** a DonVi user views the navigation menu
- **AND** the `ENABLE_DONVI_ACCOUNT_MANAGEMENT` feature flag is set to `false` or not set
- **THEN** the system SHALL hide the "Users" menu item
- **AND** the navigation SHALL not provide a link to the users page

#### Scenario: API endpoint respects feature flag
- **WHEN** a DonVi user makes an API request to `/api/users` endpoints
- **AND** the `ENABLE_DONVI_ACCOUNT_MANAGEMENT` feature flag is set to `false` or not set
- **THEN** the system SHALL return HTTP 403 Forbidden status
- **AND** the response SHALL include a descriptive error message

### Requirement: Friendly Disabled Feature Messaging
The system SHALL display clear, user-friendly messages when DonVi users attempt to access disabled account management features.

#### Scenario: Disabled feature message displayed
- **WHEN** a DonVi user attempts to access disabled account management
- **THEN** the system SHALL display an informational alert component
- **AND** the message SHALL include Vietnamese text: "Chức năng quản lý tài khoản tạm thời chưa khả dụng cho vai trò Quản trị viên đơn vị. Vui lòng liên hệ Sở Y Tế nếu bạn cần hỗ trợ."
- **AND** the message SHALL include an appropriate icon (Info or AlertCircle)
- **AND** the message SHALL use a non-destructive alert style (info or warning, not error)

#### Scenario: Message provides alternative action
- **WHEN** the disabled feature message is displayed
- **THEN** the message SHALL direct users to contact Department of Health for assistance
- **AND** the message SHALL convey that the restriction is temporary

### Requirement: Role-Based Access Control for User Management
The system SHALL enforce role-based access control for user management functionality, with SoYTe having full access and DonVi access controlled by feature flag configuration.

#### Scenario: DonVi access determined by feature flag
- **WHEN** the system checks DonVi user permissions for account management
- **THEN** the system SHALL evaluate the `ENABLE_DONVI_ACCOUNT_MANAGEMENT` environment variable
- **AND** access SHALL be granted only if the variable is explicitly set to `true`
- **AND** the default behavior (variable not set or set to any other value) SHALL deny access

#### Scenario: Middleware enforces feature flag
- **WHEN** a DonVi user attempts to navigate to `/users` route
- **AND** the feature flag is disabled
- **THEN** the middleware SHALL redirect to the appropriate dashboard
- **AND** the system SHALL not serve the users page content

#### Scenario: Multi-layer enforcement
- **WHEN** feature flag protection is implemented
- **THEN** checks SHALL be enforced at middleware layer
- **AND** checks SHALL be enforced at API route handler layer
- **AND** checks SHALL be enforced at UI component layer
- **AND** all layers SHALL use the same feature flag evaluation logic
