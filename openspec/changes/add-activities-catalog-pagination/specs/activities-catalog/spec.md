## ADDED Requirements
### Requirement: Activities catalog uses server-driven pagination
The Activities catalog SHALL expose pagination controls that drive parameterized `/api/activities` requests so DonVi and SoYTe can browse the full dataset without client-side truncation.

#### Scenario: Page navigation triggers scoped server request
- **GIVEN** a SoYTe user viewing `/activities` with scope=`global`
- **WHEN** they click "Trang sau" (page 2)
- **THEN** the UI updates the `page=2` query parameter
- **AND** issues `/api/activities?scope=global&page=2&limit=<currentLimit>`
- **AND** renders only the rows returned in that response alongside updated total counts

#### Scenario: Page size resets pagination
- **WHEN** the user changes page size from 50 to 25
- **THEN** the UI resets `page=1` and re-requests `/api/activities?...&limit=25`
- **AND** totals reflect the new page size while preserving active filters

#### Scenario: Out-of-range page shows empty + guidance
- **WHEN** a user loads `/activities?page=9` but the server reports only 3 pages for the active filters
- **THEN** the grid displays an empty state indicating the page is beyond available results and offers controls to return to a valid page
- **AND** the UI clamps the next request to the last page when users navigate via controls

### Requirement: Activities catalog search is debounced and server-driven
The Activities catalog SHALL debounce search input (≥300 ms) and propagate the search term via query params to server requests so the grid reflects authoritative results.

#### Scenario: Debounced search request
- **WHEN** a DonVi user types "kiểm" rapidly into the search box
- **THEN** the UI waits at least 300 ms after the final keystroke before issuing `/api/activities?...&search=kiểm`
- **AND** intermediate keystrokes do not trigger redundant fetches

#### Scenario: Search state persists via URL
- **WHEN** a user refreshes `/activities?search=kiểm`
- **THEN** the search input pre-populates with "kiểm"
- **AND** the initial data fetch includes `search=kiểm` so paging/filters operate on the filtered dataset

#### Scenario: Clearing search resets pagination
- **WHEN** the user clears the search field
- **THEN** the UI removes the `search` query parameter
- **AND** resets to `page=1` while fetching the unfiltered dataset from the server

### Requirement: Activities catalog filters are enforced server-side
The Activities catalog SHALL apply scope/type/status filters by encoding them in every `/api/activities` request, ensuring totals and pagination reflect the filtered dataset for both roles.

#### Scenario: Scope filter limits results
- **WHEN** a DonVi user switches from scope="all" to scope="unit"
- **THEN** the UI updates the `scope=unit` query parameter and re-fetches data
- **AND** the response contains only activities with `MaDonVi` equal to the user’s unit (plus updated totals for that scope)

#### Scenario: Combined filters persist across pagination
- **WHEN** a SoYTe user sets `type=HoiThao` and `status=active` then moves to page 3
- **THEN** every request includes `type=HoiThao&status=active`
- **AND** total counts/pagination metadata reflect only the filtered dataset

#### Scenario: Filter change resets pagination
- **WHEN** any filter (scope/type/status) changes
- **THEN** pagination resets to page 1 and the UI fetches the first page for the new filter combination while keeping page size unchanged
