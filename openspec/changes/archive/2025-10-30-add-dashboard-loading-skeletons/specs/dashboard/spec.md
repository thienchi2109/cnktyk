## ADDED Requirements

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