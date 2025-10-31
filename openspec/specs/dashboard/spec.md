# dashboard Specification

## Purpose
TBD - created by archiving change add-dashboard-loading-skeletons. Update Purpose after archive.
## Requirements
### Requirement: Dashboard Loading Skeletons for Server-Side Queries
The Dashboard SHALL display loading skeleton placeholders for each server-side data region while its data is in flight, for all user roles.

#### Scenario: Initial page load shows skeletons
- **WHEN** a user navigates to the Dashboard and one or more server-side queries are in flight
- **THEN** the corresponding regions render skeleton placeholders until their data resolves

#### Scenario: Role coverage
- **WHEN** any authenticated user with any role opens the Dashboard with in-flight server-side queries
- **THEN** skeletons are shown for the same regions across all roles

#### Scenario: Region-level progressive replacement
- **WHEN** a region's server-side query finishes successfully
- **THEN** only that region's skeleton is replaced by content without causing layout shift

### Requirement: No Layout Shift During Loading
The Dashboard SHALL avoid content layout shift caused by loading placeholders.

#### Scenario: Skeleton footprint matches content
- **WHEN** skeletons are displayed
- **THEN** their size and placement match the eventual content footprint to prevent layout shift

### Requirement: Error and Empty State Transitions
The Dashboard SHALL replace skeletons with appropriate states when queries complete with error or empty results.

#### Scenario: Error state replaces skeleton
- **WHEN** a region's server-side query fails
- **THEN** the skeleton is replaced by an error state for that region

#### Scenario: Empty state replaces skeleton
- **WHEN** a region's server-side query returns an empty dataset
- **THEN** the skeleton is replaced by the region's empty state

### Requirement: Accessibility of Loading States
Loading states SHALL be accessible to assistive technologies.

#### Scenario: Containers marked busy; skeletons non-announcing
- **WHEN** skeletons are rendered
- **THEN** parent containers are marked as busy for assistive technologies and skeleton visuals are not announced as data

#### Scenario: Respects reduced motion
- **WHEN** the user has enabled a reduced motion preference
- **THEN** skeleton animations are reduced or disabled

### Requirement: Refresh and Revalidation Loading
The Dashboard SHALL show skeletons on server-side refreshes that refetch data, scoped to affected regions only.

#### Scenario: Region-scoped refresh
- **WHEN** a server-side action or revalidation refreshes data for a subset of regions
- **THEN** only those regions show skeletons while in flight

### Requirement: SoYTe Unit Comparison Scales to Large Datasets
The DoH unit comparison view SHALL present unit metrics in a tabular data grid that remains usable and performant when the tenant has dozens of units.

#### Scenario: Grid layout replaces card tiles
- **WHEN** a SoYTe user opens the dashboard comparison section
- **THEN** unit metrics render inside a table/grid with column headers instead of individual visual cards.

#### Scenario: High-volume support
- **WHEN** the tenant has more than 50 units (or enough to exceed one viewport)
- **THEN** the grid provides virtualization or pagination so row rendering stays responsive and avoids excessive scrolling.

#### Scenario: Keyboard and assistive tech navigation
- **WHEN** a user navigates the grid via keyboard or screen reader
- **THEN** focus order, table semantics, and announcements allow moving across rows/columns and activating row actions without using a pointing device.

### Requirement: Rich Comparison Interactions
The unit comparison grid SHALL expose interactive controls that let DoH users interrogate large datasets quickly.

#### Scenario: Multi-criteria sorting
- **WHEN** a user invokes sorting on multiple columns (e.g., compliance rate then practitioner count)
- **THEN** the grid reflects the compound sort order and indicates the applied sort direction per column.

#### Scenario: Quick filtering
- **WHEN** a user types into the existing search box or applies a column filter
- **THEN** the grid updates without page reload, announces the filtered result count, and preserves active filters across pagination/virtualization.

#### Scenario: Row-level detail access
- **WHEN** a SoYTe user activates the "Xem chi tiết" action on a valid unit row
- **THEN** the app opens a Sheet overlay displaying unit details without full-page navigation

### Requirement: Server-Driven Filtering and Sorting
The SoYTe comparison grid SHALL delegate search, filtering, and sorting to server-side data sources to maintain performance for large datasets.

#### Scenario: Query-driven filtering
- **WHEN** a user submits a search term or filter criteria
- **THEN** the client issues a parameterized server request (e.g., `/api/dashboard/doh/units?search=&sort=`) and renders only the returned subset without fetching the entire dataset.

#### Scenario: Multi-column sort on server
- **WHEN** a user applies multi-column sorting
- **THEN** the request encodes the sort keys/directions and the server responds with rows in the requested order, including total counts for pagination/virtualization.

#### Scenario: Tenant isolation enforced
- **WHEN** server-side filters run
- **THEN** queries remain scoped to the requesting SoYTe tenant and return only their units, including when pagination parameters are manipulated.

#### Scenario: Filtered pagination persists
- **WHEN** a user applies filters/search then navigates to another page (or scrolls through virtualized rows)
- **THEN** the subsequent server request respects the active filters and returns the correct slice alongside the filtered total count.

### Requirement: Efficient Multi-unit Data Retrieval
Server access for the comparison grid SHALL avoid N+1 query patterns and remain performant for large tenant datasets.

#### Scenario: Batched metrics fetching
- **WHEN** the grid requests unit metrics (practitioner counts, compliance rates, pending approvals)
- **THEN** the server assembles the response using batched/aggregated queries (e.g., joins, CTEs) rather than issuing one query per unit.

### Requirement: DoH Unit Detail View
The system SHALL provide a unit detail view accessible from the DoH dashboard that renders unit metadata and key performance metrics in a Sheet overlay.

#### Scenario: Sheet opens for valid unit
- **WHEN** a SoYTe user clicks "Xem chi tiết" on a unit row in the comparison grid
- **THEN** a Sheet overlay slides in from the right displaying the unit's name and metrics (practitioners, compliance, pending, credits)

#### Scenario: Dashboard context preserved
- **WHEN** the unit detail Sheet is open
- **THEN** the dashboard comparison table remains visible (dimmed) in the background

#### Scenario: Sheet closes and returns focus
- **WHEN** a user closes the Sheet via close button, ESC key, or clicking outside
- **THEN** the Sheet dismisses and keyboard focus returns to the trigger button in the comparison grid

#### Scenario: Unauthorized or non-existent unit
- **WHEN** a Sheet is triggered for a unit outside the user's tenant or that does not exist
- **THEN** the system displays an error message within the Sheet and does not fetch invalid data

#### Scenario: Keyboard navigation in Sheet
- **WHEN** the Sheet is open and user presses Tab or Shift+Tab
- **THEN** focus cycles through interactive elements within the Sheet and does not escape to background content

#### Scenario: Accessibility attributes
- **WHEN** the Sheet is open
- **THEN** the Sheet has role="dialog", aria-modal="true", and focus is trapped within it for screen reader users

### Requirement: DoH Unit Detail Performance Optimization
The system SHALL optimize unit detail data fetching to minimize redundant API calls and improve perceived performance.

#### Scenario: Initial data from grid avoids redundant fetch
- **WHEN** a user opens a unit detail Sheet from the comparison grid
- **THEN** the Sheet renders immediately with data already available from the grid without showing a loading skeleton

#### Scenario: React Query caching reduces server load
- **WHEN** a user opens a unit detail Sheet for a unit they recently viewed
- **THEN** the cached data is displayed instantly without a new API call for at least 30 seconds (stale time)

#### Scenario: Hover prefetching improves click responsiveness
- **WHEN** a user hovers over a "Xem chi tiết" button for 150ms
- **THEN** the system prefetches the unit metrics in the background so data is ready when clicked

#### Scenario: Request deduplication prevents duplicate calls
- **WHEN** multiple rapid interactions trigger unit detail requests for the same unit
- **THEN** only one API request is made and shared across all pending requests

#### Scenario: Code splitting reduces initial bundle
- **WHEN** the dashboard page loads initially
- **THEN** the UnitDetailSheet component is loaded on-demand (code split) to reduce the initial JavaScript bundle size

