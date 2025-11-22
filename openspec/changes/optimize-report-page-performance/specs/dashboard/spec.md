# Dashboard Specification - Performance Optimization Deltas

## ADDED Requirements

### Requirement: DonVi Report Page Performance Standards
The DonVi reporting system SHALL meet performance targets to ensure responsive user experience across all report types.

#### Scenario: Initial page load within 1.5 seconds
- **WHEN** a DonVi user navigates to `/dashboard/unit-admin/reports` for the first time (cold cache)
- **THEN** the page SHALL complete rendering within 1.5 seconds measured from navigation start to interactive state
- **AND** loading skeletons SHALL appear within 200ms of navigation

#### Scenario: Tab switching within 500ms for cached data
- **WHEN** a DonVi user switches between report tabs and the data is cached (< 30 seconds old)
- **THEN** the new report SHALL render within 500ms
- **AND** no loading skeleton SHALL appear if cached data is displayed

#### Scenario: Report API response time under 400ms
- **WHEN** a report API endpoint is called with valid filters
- **THEN** the server SHALL respond within 400ms for cached requests
- **AND** within 800ms for uncached requests on datasets under 500 practitioners

#### Scenario: Report payload size under 150KB
- **WHEN** a report API returns data for a typical unit (50-200 practitioners)
- **THEN** the JSON response payload SHALL be under 150KB
- **AND** pagination or limits SHALL be applied for larger datasets

### Requirement: Non-Blocking Audit Logging for Reports
Report generation SHALL NOT be blocked by audit log writes to maintain response time targets.

#### Scenario: Audit logging executes asynchronously
- **WHEN** a DonVi user loads any report type (Performance, Compliance, Activity, Practitioner)
- **THEN** the report API SHALL log the view action to `NhatKyHeThong` asynchronously
- **AND** the API response SHALL NOT wait for the audit log write to complete

#### Scenario: Failed audit logs do not impact user
- **WHEN** an audit log write fails due to database error or timeout
- **THEN** the report data SHALL still be returned successfully to the user
- **AND** the audit failure SHALL be logged to error tracking for monitoring

#### Scenario: Audit logs eventually consistent
- **WHEN** multiple reports are loaded rapidly
- **THEN** audit log entries SHALL appear in `NhatKyHeThong` within 5 seconds
- **AND** no audit entries SHALL be lost under normal operation

### Requirement: Lazy Data Loading for Report Resources
The report page SHALL defer loading of non-critical data until explicitly needed by user interaction.

#### Scenario: Practitioners list loaded only when needed
- **WHEN** a DonVi user opens the reports page and views Performance Summary or Compliance reports
- **THEN** the practitioners list API SHALL NOT be called
- **AND** the API SHALL only be called when the user switches to the Practitioner Detail tab

#### Scenario: Practitioners selector shows loading state
- **WHEN** a user switches to Practitioner Detail tab for the first time
- **THEN** the practitioner selector SHALL show a loading state while fetching the list
- **AND** subsequent tab switches SHALL use cached data without refetching

### Requirement: Server-Side Query Result Caching
Report API endpoints SHALL cache query results to reduce database load and improve response times for repeated requests.

#### Scenario: Cache hit returns data immediately
- **WHEN** a report API receives a request with filters identical to a recent request (within 5 minutes)
- **THEN** the cached result SHALL be returned without executing database queries
- **AND** the cache hit SHALL reduce response time by at least 60% compared to uncached

#### Scenario: Cache keys include tenant isolation
- **WHEN** report data is cached
- **THEN** the cache key SHALL include the `unitId` to prevent cross-tenant data leakage
- **AND** cache invalidation SHALL be scoped to the specific unit

#### Scenario: Cache invalidation on data changes
- **WHEN** activities are approved/rejected or practitioner data is updated for a unit
- **THEN** all cached report data for that unit SHALL be invalidated
- **AND** subsequent report requests SHALL fetch fresh data

#### Scenario: Cache expiration after 5 minutes
- **WHEN** cached report data reaches 5 minutes of age
- **THEN** the cache entry SHALL automatically expire
- **AND** the next request SHALL execute fresh database queries and repopulate the cache

#### Scenario: Cache failure graceful degradation
- **WHEN** the caching layer fails or is unavailable
- **THEN** report APIs SHALL fall back to direct database queries
- **AND** user experience SHALL degrade gracefully with slower response times but no errors

### Requirement: Optimized Database Queries for Reports
Report database queries SHALL use proper indexing and query optimization techniques to minimize execution time.

#### Scenario: Composite indexes for activity queries
- **WHEN** report queries filter activities by practitioner, approval status, and date range
- **THEN** a composite index on `(MaNhanVien, TrangThaiDuyet, NgayGhiNhan)` SHALL be used
- **AND** query execution plans SHALL show "Index Scan" instead of "Seq Scan"

#### Scenario: Query execution under 200ms with indexes
- **WHEN** a report query is executed on a unit with 100-500 practitioners
- **THEN** the database query SHALL complete within 200ms
- **AND** the query plan SHALL utilize all applicable indexes

#### Scenario: Unit isolation index for tenant filtering
- **WHEN** report queries filter practitioners by `MaDonVi`
- **THEN** an index on `NhanVien.MaDonVi` SHALL be used
- **AND** tenant filtering SHALL not cause sequential table scans

### Requirement: Pagination for Large Datasets
Reports SHALL implement pagination or limits to prevent excessive data transfer and rendering overhead.

#### Scenario: Compliance report pagination
- **WHEN** a Compliance Report is loaded for a unit with more than 50 practitioners
- **THEN** only the first 50 practitioners SHALL be returned initially
- **AND** a "Load More" button SHALL allow fetching additional practitioners in batches of 50

#### Scenario: Activity timeline limited to 12 months
- **WHEN** an Activity Report is loaded without explicit date range filters
- **THEN** the timeline SHALL default to the last 12 months of data
- **AND** users SHALL have the option to load "All Time" data explicitly

#### Scenario: Recent activities limited to 10
- **WHEN** an Activity Report displays the recent activities table
- **THEN** only the 10 most recent activities SHALL be shown by default
- **AND** chart drill-down filters SHALL dynamically filter this list without pagination

### Requirement: Request Deduplication for Report APIs
The frontend SHALL prevent redundant API calls when users interact rapidly with report tabs.

#### Scenario: Simultaneous requests deduplicated
- **WHEN** a user rapidly switches between tabs multiple times
- **THEN** only one in-flight request per unique report/filter combination SHALL be active
- **AND** all pending UI components SHALL share the same request result

#### Scenario: Stale data not refetched unnecessarily
- **WHEN** a user switches back to a previously viewed tab within 30 seconds
- **THEN** cached client-side data SHALL be displayed immediately
- **AND** no API request SHALL be made unless explicitly requested by refresh action

#### Scenario: Background refetch disabled by default
- **WHEN** a user has a report tab open and switches to another browser tab
- **THEN** the report data SHALL NOT automatically refetch when returning to the page
- **AND** users can manually refresh if they want updated data

## MODIFIED Requirements

_No existing requirements are being modified - all changes are additive performance requirements._

## REMOVED Requirements

_No requirements are being removed._

## RENAMED Requirements

_No requirements are being renamed._
