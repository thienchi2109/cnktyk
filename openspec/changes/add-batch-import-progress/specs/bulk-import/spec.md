## ADDED Requirements

### Requirement: Batch INSERT Processing
The system SHALL process bulk import records using batched multi-row INSERT statements to reduce database round-trips and improve performance.

#### Scenario: Batch size configuration
- **WHEN** the import service initializes
- **THEN** it SHALL use a configurable batch size (default: 100 records per batch)

#### Scenario: Practitioners batched insert
- **WHEN** importing 500 practitioners
- **THEN** the system SHALL execute 5 batch INSERT statements (100 records each) instead of 500 individual INSERTs

#### Scenario: Activities batched insert
- **WHEN** importing activities for practitioners
- **THEN** the system SHALL batch activity INSERTs using the same batch size configuration

#### Scenario: Transaction safety maintained
- **WHEN** any batch INSERT fails during import
- **THEN** the entire transaction SHALL rollback and no partial data SHALL be committed

### Requirement: Real-time Progress Tracking
The system SHALL provide real-time progress updates during bulk import operations using Server-Sent Events (SSE).

#### Scenario: Progress event stream
- **WHEN** a bulk import is initiated
- **THEN** the API SHALL return a streaming SSE response with progress events

#### Scenario: Phase-based progress
- **WHEN** import progresses through phases (validation, practitioners, activities, audit)
- **THEN** each phase SHALL emit progress events with current phase identifier

#### Scenario: Progress percentage calculation
- **WHEN** processing records in a phase
- **THEN** the system SHALL calculate and emit percentage complete (0-100%)

#### Scenario: Records count tracking
- **WHEN** emitting progress events
- **THEN** each event SHALL include processed count and total count for the current phase

#### Scenario: Estimated time remaining
- **WHEN** progress is above 10% complete
- **THEN** the system SHALL calculate and include estimated milliseconds remaining

#### Scenario: Batch number reporting
- **WHEN** processing batched inserts
- **THEN** progress events SHALL include current batch number and total batches

#### Scenario: Completion event
- **WHEN** import completes successfully
- **THEN** the system SHALL emit a completion event with final results (created/updated counts, duration)

#### Scenario: Error event
- **WHEN** import fails during processing
- **THEN** the system SHALL emit an error event with error message and close the stream

### Requirement: Progress Indicator UI
The system SHALL display a visual progress indicator to users during bulk import operations.

#### Scenario: Progress bar display
- **WHEN** an import is in progress
- **THEN** the UI SHALL display a progress bar showing completion percentage

#### Scenario: Phase label display
- **WHEN** receiving progress events
- **THEN** the UI SHALL display Vietnamese labels for each phase:
  - validation: "Đang kiểm tra dữ liệu..."
  - practitioners: "Đang nhập nhân viên..."
  - activities: "Đang nhập hoạt động..."
  - audit: "Đang lưu nhật ký..."

#### Scenario: Record counts display
- **WHEN** showing progress
- **THEN** the UI SHALL display "X / Y" format for processed and total records

#### Scenario: Estimated time display
- **WHEN** estimated time remaining is available
- **THEN** the UI SHALL display formatted duration in Vietnamese (e.g., "Còn khoảng 30 giây")

#### Scenario: Batch progress display
- **WHEN** batch information is available
- **THEN** the UI SHALL display "Batch X / Y" to show batching progress

#### Scenario: Connection timeout handling
- **WHEN** SSE connection exceeds 3 minutes
- **THEN** the client SHALL cancel the connection and display timeout error message

### Requirement: Performance Metrics Logging
The system SHALL log detailed performance metrics for each bulk import operation to support monitoring and optimization.

#### Scenario: Timing instrumentation
- **WHEN** executing import operations
- **THEN** the system SHALL record timing for each phase (validation, practitioners, activities)

#### Scenario: Throughput calculation
- **WHEN** import completes
- **THEN** the system SHALL calculate records per second throughput

#### Scenario: Metrics persistence
- **WHEN** import completes successfully
- **THEN** performance metrics SHALL be stored in the NhatKyHeThong audit log with:
  - validationTime: milliseconds
  - practitionersTime: milliseconds
  - activitiesTime: milliseconds
  - totalTime: milliseconds
  - recordsPerSecond: number

#### Scenario: Batch failure metrics
- **WHEN** a batch fails
- **THEN** the error message SHALL include the batch number where failure occurred

### Requirement: Backward Compatibility
The system SHALL maintain backward compatibility with existing import clients and Excel template format.

#### Scenario: Non-streaming fallback
- **WHEN** a client does not support SSE
- **THEN** the system SHALL provide backward-compatible immediate response format

#### Scenario: Template format unchanged
- **WHEN** users upload Excel files
- **THEN** the existing template structure SHALL remain valid without modifications

#### Scenario: Validation rules preserved
- **WHEN** processing imports
- **THEN** all existing validation rules (required fields, CCHN uniqueness, cross-unit checks) SHALL remain enforced

#### Scenario: Security checks maintained
- **WHEN** batching records
- **THEN** unit scoping and cross-unit CCHN protection SHALL operate identically to sequential processing

### Requirement: Configuration Management
The system SHALL support configurable parameters for batch processing and timeout settings.

#### Scenario: Batch size configuration
- **WHEN** the environment variable IMPORT_BATCH_SIZE is set
- **THEN** the system SHALL use that value as the batch size (default: 100 if not set)

#### Scenario: Timeout configuration
- **WHEN** the environment variable IMPORT_TIMEOUT_MS is set
- **THEN** database statement timeout SHALL be set to that value (default: 120000ms)

#### Scenario: Database timeout extension
- **WHEN** beginning an import transaction
- **THEN** the system SHALL execute SET statement_timeout to the configured value

### Requirement: Error Handling and Recovery
The system SHALL provide clear error messages and maintain data integrity when batch processing fails.

#### Scenario: Partial batch failure
- **WHEN** a batch INSERT fails mid-transaction
- **THEN** the system SHALL rollback the entire transaction and return error with last successful batch number

#### Scenario: Connection loss recovery
- **WHEN** SSE connection is lost
- **THEN** the client SHALL display a warning that import may still be processing

#### Scenario: Validation failure before batching
- **WHEN** validation detects errors before INSERT phase
- **THEN** the system SHALL return validation errors without attempting any database operations
