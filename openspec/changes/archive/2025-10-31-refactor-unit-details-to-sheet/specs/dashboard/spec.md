## ADDED Requirements

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

## MODIFIED Requirements

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

