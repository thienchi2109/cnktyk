# Dashboard API Specification Delta

## ADDED Requirements

### Requirement: Unit Metrics Aggregation
The system SHALL provide unit-level metrics through a single optimized database query using Common Table Expressions (CTEs) that returns all metrics in one response with sub-100ms latency.

#### Scenario: Fetch unit metrics successfully
- **GIVEN** a valid unit ID
- **WHEN** requesting `/api/units/{id}/metrics`
- **THEN** return metrics including totalPractitioners, activePractitioners, complianceRate, pendingApprovals, approvedThisMonth, rejectedThisMonth, and atRiskPractitioners
- **AND** response time SHALL be less than 150ms at 95th percentile
- **AND** execute exactly 1 database query

#### Scenario: Handle unauthorized access
- **GIVEN** a user without permission to view unit metrics
- **WHEN** requesting `/api/units/{id}/metrics`
- **THEN** return 403 Forbidden error
- **AND** not execute metrics query

### Requirement: Practitioner Dashboard Aggregation
The system SHALL provide all practitioner dashboard data through a single API endpoint that combines practitioner info, credit cycle, recent activities, and notifications in one optimized query.

#### Scenario: Fetch practitioner dashboard successfully
- **GIVEN** an authenticated practitioner user
- **WHEN** requesting `/api/dashboard/practitioner`
- **THEN** return complete dashboard data including total_credits, required_credits, compliance_percentage, compliance_status, total_activities, approved_count, pending_count, unread_count, recent_activities array, and credit_breakdown array
- **AND** response time SHALL be less than 300ms at 95th percentile
- **AND** execute exactly 1 database query

#### Scenario: Handle non-practitioner user
- **GIVEN** a user with role other than 'NguoiHanhNghe'
- **WHEN** requesting `/api/dashboard/practitioner`
- **THEN** return 403 Forbidden error

### Requirement: Practitioners List Pagination
The system SHALL support server-side pagination for practitioners lists with configurable page size and efficient query execution.

#### Scenario: Fetch paginated practitioners list
- **GIVEN** a valid unit ID and page parameters (page=1, limit=10)
- **WHEN** requesting `/api/practitioners?unitId={id}&page=1&limit=10`
- **THEN** return exactly 10 practitioners
- **AND** include pagination metadata (page, limit, total, totalPages)
- **AND** response time SHALL be less than 100ms

#### Scenario: Handle empty results
- **GIVEN** a unit with no practitioners
- **WHEN** requesting practitioners with pagination
- **THEN** return empty data array
- **AND** pagination shows total=0, totalPages=0

#### Scenario: Enforce maximum page size
- **GIVEN** a request with limit > 50
- **WHEN** requesting practitioners
- **THEN** limit SHALL be capped at 50 items

### Requirement: Server-Side Filtering
The system SHALL support server-side filtering for practitioners by search term, compliance status, and work status with SQL-level filtering.

#### Scenario: Filter by search term
- **GIVEN** a search term "Nguyen"
- **WHEN** requesting `/api/practitioners?unitId={id}&search=Nguyen&limit=10`
- **THEN** return only practitioners with "Nguyen" in HoVaTen field
- **AND** apply filter at SQL level, not client-side

#### Scenario: Filter by compliance status
- **GIVEN** complianceStatus parameter "at_risk"
- **WHEN** requesting `/api/practitioners?unitId={id}&complianceStatus=at_risk&limit=10`
- **THEN** return only practitioners with compliance percentage between 70-89%
- **AND** calculate compliance in database query

#### Scenario: Combine multiple filters
- **GIVEN** search term "Nguyen" and complianceStatus "at_risk"
- **WHEN** requesting with both filter parameters
- **THEN** return practitioners matching ALL filter criteria
- **AND** reset to page 1 when filters change

### Requirement: Dashboard Metrics Caching
The system SHALL cache dashboard metrics in Redis with 60-second TTL to reduce database load for frequently accessed data.

#### Scenario: Cache hit for unit metrics
- **GIVEN** unit metrics cached in Redis
- **WHEN** requesting `/api/units/{id}/metrics` within 60 seconds of previous request
- **THEN** return cached data
- **AND** response time SHALL be less than 10ms
- **AND** response SHALL include `cached: true` indicator
- **AND** not execute database query

#### Scenario: Cache miss requires database query
- **GIVEN** unit metrics not in cache or expired
- **WHEN** requesting `/api/units/{id}/metrics`
- **THEN** fetch from database
- **AND** store result in cache with 60-second TTL
- **AND** response SHALL include `cached: false` indicator

#### Scenario: Cache invalidation on data change
- **GIVEN** cached unit metrics exist
- **WHEN** practitioner data is created, updated, or deleted
- **THEN** invalidate related cache entries
- **AND** next request fetches fresh data from database

#### Scenario: Graceful fallback on cache error
- **GIVEN** Redis is unavailable or returns error
- **WHEN** requesting cached endpoint
- **THEN** fallback to database query
- **AND** log cache error
- **AND** return successful response without caching

### Requirement: Database Query Optimization
The system SHALL use database indexes and optimized queries to minimize table scans and improve query performance for dashboard endpoints.

#### Scenario: Use composite indexes for filtered queries
- **GIVEN** practitioners filtered by unit and work status
- **WHEN** executing query
- **THEN** use composite index on (MaDonVi, TrangThaiLamViec)
- **AND** avoid full table scan
- **AND** verify with EXPLAIN ANALYZE

#### Scenario: Use partial index for pending approvals
- **GIVEN** query for pending approval count
- **WHEN** filtering by TrangThaiDuyet = 'ChoDuyet'
- **THEN** use partial index on MaNhanVien WHERE TrangThaiDuyet = 'ChoDuyet'
- **AND** improve query performance by 50%+

### Requirement: Performance Monitoring
The system SHALL log query execution time and cache performance metrics for dashboard endpoints to enable performance tracking.

#### Scenario: Log slow queries
- **GIVEN** a dashboard query exceeds 150ms execution time
- **WHEN** query completes
- **THEN** log warning with query details, execution time, and parameters
- **AND** include stack trace for investigation

#### Scenario: Track cache hit rate
- **GIVEN** cache operations for dashboard endpoints
- **WHEN** metrics are collected
- **THEN** track hit rate, miss rate, and average response time
- **AND** alert if hit rate falls below 70%

### Requirement: Backward Compatibility
The system SHALL maintain exact response structure for existing Unit Metrics API to avoid breaking existing clients.

#### Scenario: Maintain response format
- **GIVEN** optimized metrics query implementation
- **WHEN** client requests `/api/units/{id}/metrics`
- **THEN** response structure SHALL match previous version exactly
- **AND** all field names SHALL remain unchanged
- **AND** all field types SHALL remain unchanged

#### Scenario: Support existing query parameters
- **GIVEN** existing clients using query parameters
- **WHEN** requesting metrics endpoint
- **THEN** continue supporting all existing parameters
- **AND** ignore unsupported parameters gracefully
