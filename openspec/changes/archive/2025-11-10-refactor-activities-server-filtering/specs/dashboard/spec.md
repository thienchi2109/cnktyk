## ADDED Requirements
### Requirement: DonVi activities list uses server-driven filters
The DonVi activities page SHALL delegate all filtering, searching, and pagination to server-side queries instead of performing client-side filtering on cached datasets.

#### Scenario: Filter submissions call server endpoint
- **WHEN** a DonVi user adjusts any activities filter (search term, scope tab, status, date range, pagination)
- **THEN** the client issues a parameterized request to the activities API with the selected filters
- **AND** the list renders only the records returned by the server without re-filtering the full dataset locally.

#### Scenario: Filters persist via URL state
- **WHEN** a DonVi user applies filters on the activities page and reloads or shares the URL
- **THEN** the query string reflects the active filter parameters
- **AND** the page hydrates filters from the URL and re-fetches matching results on load.

#### Scenario: Tenant-isolated results
- **WHEN** the server processes filtered activities requests for a DonVi user
- **THEN** results are limited to that user’s unit scope plus global activities, regardless of client-supplied filters
- **AND** total counts and pagination metadata correspond to the filtered dataset only.
