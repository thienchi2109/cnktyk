## ADDED Requirements

### Requirement: SoYTe Unit Management Page
The system SHALL expose a dedicated units management page for Department of Health (SoYTe) operators at `/dashboard/doh/units`.

#### Scenario: SoYTe access succeeds
- **WHEN** an authenticated SoYTe user visits `/dashboard/doh/units`
- **THEN** the page responds with HTTP 200 and renders a full-width units table with search, sort, pagination controls, and high-level system metrics
- **AND** the experience does not redirect back to `/dashboard/doh`

#### Scenario: Non-SoYTe users blocked
- **WHEN** an authenticated user without the SoYTe role, or an unauthenticated visitor, requests `/dashboard/doh/units`
- **THEN** the system redirects authenticated non-SoYTe users back to `/dashboard`, and anonymous visitors to sign-in

#### Scenario: Server-driven filters preserved
- **WHEN** the user adjusts search, sort, page, or pageSize on the units page
- **THEN** the URL query string reflects the current parameters
- **AND** the table data updates via `/api/system/units-performance` without full page reload

#### Scenario: Summary metrics visible
- **WHEN** the page loads successfully
- **THEN** the header region shows the same system-level metrics available on the SoYTe dashboard (total units, active practitioners, compliance rate, pending approvals)

### Requirement: Deep-Linkable Unit Detail from Units Page
The units page SHALL support opening the unit detail sheet via URL query parameters and row actions.

#### Scenario: Detail sheet opens from query parameter
- **WHEN** a SoYTe user visits `/dashboard/doh/units?unit=<MaDonVi>`
- **THEN** the units page loads and the unit detail sheet opens with metrics pre-populated for `<MaDonVi>`, using cached data when available

#### Scenario: Row action opens sheet
- **WHEN** the user selects "Xem chi tiết" on a valid unit row
- **THEN** the detail sheet opens in-page, focus returns to the trigger on close, and the `unit` query parameter updates accordingly

#### Scenario: Sheet handles invalid unit IDs
- **WHEN** the `unit` query parameter references a unit outside the tenant or an unknown ID
- **THEN** the sheet displays an inline error without breaking the units page or leaking other tenant data

#### Scenario: Legacy `/dashboard/units/<id>` deep links
- **WHEN** a SoYTe user navigates to `/dashboard/units/<id>`
- **THEN** the app redirects to `/dashboard/doh/units?unit=<id>` so the deep link opens the same detail sheet within the units page
