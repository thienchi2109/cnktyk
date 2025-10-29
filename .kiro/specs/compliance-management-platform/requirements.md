# Requirements Document

## Introduction

The CNKTYKLT Compliance Management Platform is a web-based system designed to streamline healthcare practitioner compliance tracking across the Department of Health and healthcare units. The platform will replace manual spreadsheet-based processes with an automated system that tracks continuing education credits, manages evidence uploads, and provides real-time visibility into compliance status across a 5-year cycle requirement of 120 credits.

## Requirements

### Requirement 1

**User Story:** As a healthcare practitioner, I want to submit my continuing education activities with evidence files, so that my compliance credits are automatically calculated and tracked.

#### Acceptance Criteria

1. WHEN a practitioner uploads an activity with evidence THEN the system SHALL validate the file format (PDF/JPG/PNG) and size (≤10MB)
2. WHEN an activity is submitted THEN the system SHALL automatically calculate credits based on activity type and conversion rules
3. WHEN evidence is uploaded THEN the system SHALL generate a secure checksum and store file metadata
4. IF activity requires approval THEN the system SHALL set status to "ChoDuyet" (Pending Review)

### Requirement 2

**User Story:** As a unit administrator, I want to review and approve practitioner activities, so that I can ensure compliance with regulatory standards.

#### Acceptance Criteria

1. WHEN a unit admin accesses pending activities THEN the system SHALL display only activities from their unit
2. WHEN reviewing an activity THEN the system SHALL allow approval, rejection, or request for additional information
3. WHEN an activity is approved THEN the system SHALL update the practitioner's credit total automatically
4. WHEN an activity is rejected THEN the system SHALL require a reason and notify the practitioner

### Requirement 3

**User Story:** As a Department of Health administrator, I want to view compliance dashboards across all units, so that I can monitor sector-wide compliance status.

#### Acceptance Criteria

1. WHEN accessing the DoH dashboard THEN the system SHALL display aggregated compliance data across all units
2. WHEN viewing unit performance THEN the system SHALL show credit completion percentages and at-risk practitioners
3. WHEN exporting reports THEN the system SHALL generate CSV/PDF formats with current data
4. IF a practitioner is at risk THEN the system SHALL highlight them in red (<70%) or yellow (<90%) status

### Requirement 4

**User Story:** As a system administrator, I want to configure credit rules and activity catalogs, so that the platform adapts to regulatory changes.

#### Acceptance Criteria

1. WHEN creating activity types THEN the system SHALL allow setting credit conversion rates and hour requirements
2. WHEN updating rules THEN the system SHALL apply changes to future activities only
3. WHEN setting credit caps THEN the system SHALL enforce limits per activity category within 5-year cycles
4. IF rules change THEN the system SHALL maintain audit trail of all modifications

### Requirement 5

**User Story:** As a practitioner, I want to receive alerts about my compliance status, so that I can take action before deadlines.

#### Acceptance Criteria

1. WHEN a practitioner has <70% credits with 6 months remaining THEN the system SHALL generate a high-priority alert
2. WHEN a practitioner has <90% credits with 3 months remaining THEN the system SHALL generate a medium-priority alert
3. WHEN viewing my dashboard THEN the system SHALL display my current progress percentage and remaining time
4. IF my cycle is ending in 1 month THEN the system SHALL send daily reminders

### Requirement 6

**User Story:** As any user, I want to securely authenticate and access only my authorized data, so that sensitive information is protected.

#### Acceptance Criteria

1. WHEN logging in THEN the system SHALL authenticate using username/password with bcrypt hashing
2. WHEN accessing data THEN the system SHALL enforce role-based permissions (DoH, Unit, Practitioner, Auditor)
3. WHEN a session expires THEN the system SHALL require re-authentication
4. IF unauthorized access is attempted THEN the system SHALL log the attempt and deny access

### Requirement 7

**User Story:** As a compliance officer, I want to bulk import practitioner data and historical credits, so that I can migrate from existing systems efficiently.

#### Acceptance Criteria

1. WHEN uploading CSV files THEN the system SHALL validate data format and required fields
2. WHEN importing practitioners THEN the system SHALL perform upsert operations to avoid duplicates
3. WHEN importing historical credits THEN the system SHALL maintain original timestamps and evidence references
4. IF import errors occur THEN the system SHALL provide detailed error reports with line numbers

### Requirement 8

**User Story:** As an auditor, I want to view comprehensive audit logs, so that I can track all system changes and ensure compliance.

#### Acceptance Criteria

1. WHEN any data modification occurs THEN the system SHALL log user, timestamp, action, and changed values
2. WHEN accessing audit logs THEN the system SHALL allow filtering by date, user, and action type
3. WHEN evidence files are uploaded THEN the system SHALL store immutable checksums for integrity verification
4. IF suspicious activity is detected THEN the system SHALL flag it for review