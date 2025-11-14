## ADDED Requirements

### Requirement: DoH Unit Detail View
The system SHALL provide a unit detail view accessible from the DoH dashboard that renders unit metadata and key performance metrics.

#### Scenario: Route exists and renders for valid unit
- **WHEN** a SoYTe user navigates to `/dashboard/units/[unitId]` for a unit they are authorized to view
- **THEN** the page returns 200 and displays the unit’s name and metrics (e.g., practitioners, compliance, pending, credits)

#### Scenario: Unauthorized or non-existent unit
- **WHEN** a user navigates to `/dashboard/units/[unitId]` for a unit outside their tenant or that does not exist
- **THEN** the system returns 403 (unauthorized) or 404 (not found) appropriately

#### Scenario: Return to comparison context
- **WHEN** a user opens a unit detail from the comparison grid and then uses back navigation
- **THEN** they return to the comparison section with prior filters and sorts preserved

## MODIFIED Requirements

### Requirement: Rich Comparison Interactions
The unit comparison grid SHALL expose interactive controls that let DoH users interrogate large datasets quickly.

#### Scenario: Multi-criteria sorting
- **WHEN** a user invokes sorting on multiple columns (e.g., compliance rate then practitioner count)
- **THEN** the grid reflects the compound sort order and indicates the applied sort direction per column.

#### Scenario: Quick filtering
- **WHEN** a user types into the existing search box or applies a column filter
- **THEN** the grid updates without page reload, announces the filtered result count, and preserves active filters across pagination/virtualization.

#### Scenario: Row-level deep links
- **WHEN** a SoYTe user activates the “Xem chi tiết” action on a valid unit row
- **THEN** the app navigates to the canonical unit detail route `/dashboard/units/[unitId]` and renders the detail view without a 404 for valid units
