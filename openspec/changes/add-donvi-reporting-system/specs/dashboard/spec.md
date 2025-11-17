# dashboard Specification Deltas

## ADDED Requirements

### Requirement: DonVi Interactive Reporting System
The system SHALL provide DonVi (Unit Admin) users with a dedicated reporting interface that enables data-driven decision-making through interactive charts, filters, and drill-down capabilities.

#### Scenario: DonVi user accesses reports page
- **WHEN** an authenticated DonVi user navigates to `/dashboard/unit-admin/reports`
- **THEN** the system renders a reports page with tab navigation for multiple report types
- **AND** the page displays data scoped to the user's unit (automatic tenant filtering by `session.user.unitId`)

#### Scenario: Non-DonVi user blocked from reports
- **WHEN** an authenticated user without DonVi role attempts to access `/dashboard/unit-admin/reports`
- **THEN** the system redirects the user to their appropriate dashboard
- **AND** no report data is exposed

#### Scenario: Reports navigation visible to DonVi users
- **WHEN** a DonVi user views the sidebar navigation
- **THEN** a "Báo cáo" (Reports) navigation item is displayed with a BarChart3 icon
- **AND** clicking the item navigates to `/dashboard/unit-admin/reports`

#### Scenario: Existing export button redirects to reports
- **WHEN** a DonVi user clicks the "Xuất báo cáo" (Export Report) button on the unit admin dashboard
- **THEN** the system navigates to `/dashboard/unit-admin/reports`
- **AND** the button becomes functional (no longer non-functional)

---

### Requirement: Performance Summary Report
The system SHALL provide a Performance Summary Report that displays unit-level KPIs with period-over-period comparisons.

#### Scenario: Performance summary loads successfully
- **WHEN** a DonVi user selects the "Tổng quan" (Performance) tab
- **THEN** the system displays KPI cards showing total practitioners, active practitioners, compliance rate, pending approvals, approved activities, rejected activities, and at-risk practitioners
- **AND** each KPI card uses glassmorphism styling consistent with the platform design

#### Scenario: Period selector changes data
- **WHEN** a DonVi user selects a time period (This Month, Last Month, This Quarter, Last Quarter, Custom)
- **THEN** the system updates all KPI metrics to reflect the selected period
- **AND** the API request filters data by the calculated date range

#### Scenario: Period comparison displays trends
- **WHEN** the selected period has a valid comparison period (e.g., This Month vs Last Month)
- **THEN** the system displays trend indicators (percentage change, up/down arrows) for each KPI
- **AND** positive compliance trends show green indicators, negative trends show red

#### Scenario: Custom date range selection
- **WHEN** a DonVi user selects "Custom" period and chooses start/end dates
- **THEN** the system validates that end date is after start date
- **AND** the system fetches KPI data for the custom range
- **AND** the system disables comparison metrics (no comparison period available)

---

### Requirement: Compliance Overview Report
The system SHALL provide a Compliance Overview Report with visualizations of practitioner compliance distribution and credit breakdowns.

#### Scenario: Compliance report loads with distribution chart
- **WHEN** a DonVi user selects the "Tuân thủ" (Compliance) tab
- **THEN** the system displays a pie chart showing compliance distribution (Compliant, At Risk, Critical)
- **AND** the chart uses healthcare color palette: green for compliant (≥90% or ≥108 credits), amber for at risk (70-89% or 84-107 credits), red for critical (<70% or <84 credits)

#### Scenario: Compliance data categorization
- **WHEN** the system calculates compliance status for practitioners
- **THEN** practitioners with ≥108 credits are categorized as "Compliant"
- **AND** practitioners with 84-107 credits are categorized as "At Risk"
- **AND** practitioners with <84 credits are categorized as "Critical"

#### Scenario: Credits breakdown bar chart
- **WHEN** the compliance report renders
- **THEN** the system displays a bar chart showing credits earned per practitioner
- **AND** bars are color-coded by compliance status
- **AND** the chart is limited to top/bottom performers to avoid overcrowding

#### Scenario: Practitioners table with filtering
- **WHEN** the compliance report displays the practitioners table
- **THEN** the table shows practitioner name, license ID, credits earned, credits required, and compliance percentage
- **AND** the table is sortable by any column
- **AND** the table applies active filters (employment status, position, date range)

#### Scenario: Employment status filter
- **WHEN** a DonVi user selects employment status filters (Active, Retired, On Hold)
- **THEN** the system refetches compliance data filtered by selected statuses
- **AND** all charts and tables update to reflect the filtered dataset

#### Scenario: No data for selected filters
- **WHEN** applied filters result in zero practitioners
- **THEN** the system displays an empty state message "Không tìm thấy dữ liệu với bộ lọc hiện tại"
- **AND** the system suggests adjusting filters
- **AND** no error is thrown

---

### Requirement: Activity Submissions Report
The system SHALL provide an Activity Submissions Report that analyzes submission patterns, approval workflows, and activity type distributions.

#### Scenario: Activity report loads with submission trends
- **WHEN** a DonVi user selects the "Hoạt động" (Activities) tab
- **THEN** the system displays summary cards for total submissions, pending count, approved count, rejected count, and average approval time
- **AND** the system displays a line chart showing monthly submission timeline with three series (Submitted, Approved, Rejected)

#### Scenario: Activity type distribution chart
- **WHEN** the activity report renders
- **THEN** the system displays a bar chart showing submission counts by activity type (KhoaHoc, HoiThao, NghienCuu, BaoCao)
- **AND** each bar shows the percentage of total submissions

#### Scenario: Approval status donut chart
- **WHEN** the activity report renders
- **THEN** the system displays a donut chart showing distribution of approval statuses
- **AND** the chart uses amber for ChoDuyet (Pending), green for DaDuyet (Approved), red for TuChoi (Rejected)

#### Scenario: Average approval time calculation
- **WHEN** the system calculates average approval time
- **THEN** it computes the difference between `NgayDuyet` and `NgayGhiNhan` for approved activities only
- **AND** excludes activities with NULL `NgayDuyet` (not yet approved)
- **AND** displays the result in days with one decimal place

#### Scenario: Activity type filter
- **WHEN** a DonVi user selects one or more activity types to filter
- **THEN** the system refetches activity data filtered by selected types
- **AND** all charts and metrics update accordingly

#### Scenario: Approval status filter
- **WHEN** a DonVi user selects an approval status filter (All, Pending, Approved, Rejected)
- **THEN** the system filters activities by `TrangThaiDuyet` column
- **AND** the timeline chart reflects only the selected status

#### Scenario: Practitioner search in activity report
- **WHEN** a DonVi user types a practitioner name or CCHN in the search box
- **THEN** the system debounces the input (300ms delay)
- **AND** filters activities to show only submissions by matching practitioners
- **AND** displays a loading indicator during debounce period

---

### Requirement: Practitioner Detail Report
The system SHALL provide a Practitioner Detail Report that offers deep-dive analytics for individual practitioners with credit breakdowns and submission timelines.

#### Scenario: Practitioner selector with search
- **WHEN** a DonVi user opens the "Chi tiết cá nhân" (Practitioner Detail) tab
- **THEN** the system displays a searchable dropdown to select a practitioner
- **AND** the dropdown supports search by name or CCHN (license ID)
- **AND** the dropdown only includes practitioners from the user's unit

#### Scenario: Individual practitioner data loads
- **WHEN** a DonVi user selects a practitioner from the dropdown
- **THEN** the system fetches detailed data for that practitioner including metadata, credit totals, activity breakdown, and submission history
- **AND** displays the practitioner's name, license ID, position, license issue date, and cycle end date

#### Scenario: Credits progress visualization
- **WHEN** the practitioner detail report renders
- **THEN** the system displays a large circular progress indicator showing credits earned vs. required (120)
- **AND** the indicator is color-coded: green if ≥90%, amber if 70-89%, red if <70%
- **AND** displays numerical values for earned, required, and remaining credits

#### Scenario: Credits by activity type pie chart
- **WHEN** the practitioner detail report renders
- **THEN** the system displays a pie chart showing credit distribution by activity type
- **AND** each slice represents the total credits earned from that activity type
- **AND** slices use distinct colors for each activity type

#### Scenario: Cumulative credits timeline
- **WHEN** the practitioner detail report renders
- **THEN** the system displays an area chart showing cumulative credits over time
- **AND** the X-axis represents dates from license issue date to current date
- **AND** the Y-axis represents cumulative credits
- **AND** a reference line at 120 credits (target) is displayed
- **AND** the chart shows the trajectory toward compliance

#### Scenario: Submissions history table
- **WHEN** the practitioner detail report displays the submissions table
- **THEN** the table shows activity name, type, credits earned, status, submitted date, and approved date
- **AND** the table is sortable by any column
- **AND** status badges use color coding (amber for pending, green for approved, red for rejected)

#### Scenario: No practitioner selected
- **WHEN** no practitioner is selected in the dropdown
- **THEN** the system displays a placeholder message "Vui lòng chọn một người hành nghề để xem báo cáo chi tiết"
- **AND** no API requests are made until a practitioner is selected

---

### Requirement: Interactive Date Range Filtering
The system SHALL provide a date range filter component used across all report types with preset options and custom date selection.

#### Scenario: Preset date range buttons
- **WHEN** a DonVi user views the date range filter
- **THEN** preset buttons are displayed for "30 ngày qua" (Last 30 Days), "90 ngày qua" (Last 90 Days), "Quý này" (This Quarter), "Năm này" (This Year), and "Tùy chỉnh" (Custom)
- **AND** the active preset is visually highlighted

#### Scenario: Preset selection applies date range
- **WHEN** a DonVi user clicks a preset button
- **THEN** the system calculates the start and end dates based on the preset
- **AND** updates the report data by refetching with the new date range
- **AND** the custom date pickers (if visible) update to reflect the preset dates

#### Scenario: Custom date range selection
- **WHEN** a DonVi user clicks "Tùy chỉnh" (Custom) preset
- **THEN** the system displays two date picker inputs for start date and end date
- **AND** the date pickers use Shadcn UI DatePicker component
- **AND** the user can manually select dates from calendars

#### Scenario: Invalid date range validation
- **WHEN** a DonVi user selects a custom date range where end date is before start date
- **THEN** the system displays a validation error "Ngày kết thúc phải sau ngày bắt đầu"
- **AND** the "Apply" button is disabled
- **AND** no API request is made

#### Scenario: Cycle-based preset for practitioner report
- **WHEN** a DonVi user views the Practitioner Detail Report date range filter
- **THEN** an additional preset "Chu kỳ hiện tại" (Current Cycle) is displayed
- **AND** selecting it sets the date range from the practitioner's license issue date to 5 years later

#### Scenario: Default date range
- **WHEN** a DonVi user first opens a report
- **THEN** the default date range is "Last 30 Days" for Performance, Compliance, and Activity reports
- **AND** the default is "Current Cycle" for Practitioner Detail Report

---

### Requirement: Responsive Chart Rendering with Shadcn/ui Charts
The system SHALL use Shadcn/ui Charts (Recharts wrapper) for all data visualizations with responsive sizing and accessibility features.

#### Scenario: Chart renders with glassmorphism styling
- **WHEN** any chart component renders
- **THEN** the chart is wrapped in a GlassCard component with semi-transparent background
- **AND** the chart container uses Shadcn ChartContainer component
- **AND** the chart respects the healthcare color palette for data series

#### Scenario: Chart tooltips on hover
- **WHEN** a DonVi user hovers over a chart data point
- **THEN** a tooltip appears showing detailed information (value, label, percentage if applicable)
- **AND** the tooltip uses ChartTooltip component with ChartTooltipContent
- **AND** the tooltip is accessible via keyboard focus

#### Scenario: Chart legend displays correctly
- **WHEN** a chart has multiple data series or categories
- **THEN** a legend is displayed below or beside the chart
- **AND** the legend uses ChartLegend component with ChartLegendContent
- **AND** legend items match the colors used in the chart

#### Scenario: Responsive chart sizing
- **WHEN** a chart renders on different screen sizes
- **THEN** desktop displays chart at 300-400px height
- **AND** tablet displays chart at 250-300px height
- **AND** mobile displays chart at 200-250px height
- **AND** the chart width is 100% of the container (responsive)

#### Scenario: Chart accessibility for screen readers
- **WHEN** a screen reader user focuses on a chart
- **THEN** the chart container has an `aria-label` describing the chart content (e.g., "Pie chart showing compliance distribution")
- **AND** chart data is announced via ARIA live regions when tooltips appear
- **AND** a data table alternative is available (or planned for Phase 4)

---

### Requirement: Tenant Isolation and Security in Reports
The system SHALL enforce strict tenant isolation for all report data and audit all report generation requests.

#### Scenario: Report API enforces unit scoping
- **WHEN** a DonVi user's session is used to fetch report data
- **THEN** all database queries filter by `n."MaDonVi" = $1` WHERE clause with `session.user.unitId` as the parameter
- **AND** no unitId parameter is accepted from client-side requests
- **AND** the user cannot access data from other units

#### Scenario: Role-based authorization check
- **WHEN** any report API route is called
- **THEN** the route validates `session.user.role === 'DonVi'`
- **AND** returns HTTP 403 Forbidden if the role is not DonVi
- **AND** logs the unauthorized access attempt

#### Scenario: Audit logging for report generation
- **WHEN** a DonVi user successfully loads a report
- **THEN** the system logs an entry to `NhatKyHeThong` table with:
  - `MaTaiKhoan`: session.user.id
  - `HanhDong`: 'VIEW_REPORT'
  - `Bang`: 'Reports'
  - `KhoaChinh`: report type (e.g., 'compliance', 'activities')
  - `NoiDung`: JSON object containing report type, filters applied, and timestamp
  - `DiaChiIP`: client IP address from request headers

#### Scenario: SQL injection prevention
- **WHEN** report APIs construct database queries
- **THEN** all queries use parameterized placeholders ($1, $2, etc.)
- **AND** no client input is directly concatenated into SQL strings
- **AND** filter parameters are validated with Zod schemas before query execution

#### Scenario: Input validation with Zod
- **WHEN** a report API receives query parameters
- **THEN** the parameters are validated against Zod schemas (e.g., dates as ISO strings, enums for activity types)
- **AND** invalid parameters return HTTP 400 Bad Request with validation errors
- **AND** the API does not execute queries if validation fails

---

### Requirement: Optimized Database Queries with CTEs
The system SHALL use Common Table Expressions (CTEs) to minimize database round-trips and improve report performance.

#### Scenario: Single CTE query for compliance report
- **WHEN** the compliance report API fetches data
- **THEN** the system executes a single SQL query with multiple CTEs to calculate:
  - Total credits per practitioner (CTE 1)
  - Compliance categorization (CTE 2)
  - Aggregate counts by status (CTE 3)
- **AND** the query completes in <500ms for typical data volumes (up to 500 practitioners)

#### Scenario: CTE query structure for performance
- **WHEN** any report API constructs a CTE query
- **THEN** each CTE performs a distinct logical operation (filtering, aggregation, categorization)
- **AND** CTEs are joined or combined in the final SELECT statement
- **AND** the query plan avoids N+1 query patterns

#### Scenario: Indexed columns for performance
- **WHEN** report queries filter or join on date or status columns
- **THEN** the database has indexes on:
  - `GhiNhanHoatDong.MaNhanVien, NgayBatDau`
  - `GhiNhanHoatDong.TrangThaiDuyet`
  - `NhanVien.MaDonVi`
- **AND** the query planner uses these indexes for efficient execution

---

### Requirement: Client-Side Data Caching with TanStack Query
The system SHALL use TanStack Query (React Query) for client-side caching, loading states, and request deduplication.

#### Scenario: Report data cached for 30 seconds
- **WHEN** a DonVi user loads a report
- **THEN** the fetched data is cached in TanStack Query with a stale time of 30 seconds
- **AND** subsequent requests within 30 seconds use cached data without refetching
- **AND** cached data is revalidated in the background after 30 seconds

#### Scenario: Loading state during data fetch
- **WHEN** a report is fetching data from the API
- **THEN** the component displays loading skeletons using existing `DashboardCardSkeleton` or `DashboardKpiSkeleton`
- **AND** the skeletons match the layout of the final content to avoid layout shift
- **AND** interactive elements (filters) remain accessible during loading

#### Scenario: Error state on API failure
- **WHEN** a report API request fails (network error, server error, timeout)
- **THEN** the component displays an error message using `DashboardErrorPanel`
- **AND** a "Retry" button is provided to refetch the data
- **AND** the error does not crash the entire reports page (isolated error boundary)

#### Scenario: Request deduplication
- **WHEN** multiple components or interactions trigger the same API request simultaneously
- **THEN** TanStack Query deduplicates the requests and executes only one API call
- **AND** all pending requests receive the same response when it resolves

#### Scenario: Query key based on filters
- **WHEN** a DonVi user changes filters (date range, status, activity type)
- **THEN** the TanStack Query key updates to include the filter values (e.g., `['reports', 'compliance', { startDate, endDate, status }]`)
- **AND** changing filters triggers a new API request with updated parameters
- **AND** each unique filter combination has its own cache entry

---

### Requirement: Mobile Responsiveness for Reports
The system SHALL provide a mobile-optimized layout for all report types with collapsible filters and touch-friendly interactions.

#### Scenario: Mobile layout with bottom sheet filters
- **WHEN** a DonVi user accesses reports on a mobile device (screen width <768px)
- **THEN** the filter panel is hidden by default
- **AND** a "Bộ lọc" (Filters) button is displayed at the top of the page
- **AND** clicking the button opens a bottom sheet with filter controls

#### Scenario: Mobile chart sizing
- **WHEN** a chart renders on a mobile device
- **THEN** the chart height is reduced to 200-250px for readability
- **AND** the chart width fills 100% of the screen width
- **AND** chart legends stack vertically instead of horizontally

#### Scenario: Touch-friendly interactions
- **WHEN** a DonVi user interacts with reports on a touch device
- **THEN** all interactive elements (buttons, filters, chart data points) have a minimum touch target size of 44x44 pixels
- **AND** hover-only features are replaced with tap interactions
- **AND** chart tooltips appear on tap, not hover

#### Scenario: Horizontal tab scroll on mobile
- **WHEN** the report type selector tabs exceed screen width on mobile
- **THEN** the tabs become horizontally scrollable
- **AND** the active tab is automatically scrolled into view
- **AND** scroll indicators (shadows/gradients) show when more tabs are available

---

### Requirement: Drill-Down Interactions and Breadcrumb Navigation
The system SHALL support drill-down interactions from summary charts to detailed views with breadcrumb navigation to track the user's path.

#### Scenario: Click on compliance pie slice
- **WHEN** a DonVi user clicks on a slice of the compliance distribution pie chart
- **THEN** the practitioners table below filters to show only practitioners in that compliance status
- **AND** a breadcrumb appears showing "All > Compliant" (or At Risk / Critical)
- **AND** a "Clear filter" or "Back to overview" link is displayed

#### Scenario: Click on practitioner bar in chart
- **WHEN** a DonVi user clicks on a practitioner's bar in the credits breakdown chart
- **THEN** the system navigates to the Practitioner Detail Report for that practitioner
- **AND** the practitioner is pre-selected in the dropdown
- **AND** a breadcrumb shows "Compliance > [Practitioner Name]"

#### Scenario: Click on activity timeline data point
- **WHEN** a DonVi user clicks on a data point in the activity submissions timeline chart
- **THEN** the submissions table filters to show only activities submitted in that month
- **AND** a breadcrumb indicates the applied filter
- **AND** the date range filter updates to reflect the selected month

#### Scenario: Breadcrumb navigation
- **WHEN** a DonVi user has drilled down into a filtered view
- **THEN** a breadcrumb trail is displayed at the top of the report
- **AND** each breadcrumb segment is clickable to navigate back
- **AND** clicking the first breadcrumb resets all filters and returns to the overview

---

### Requirement: Empty States and User Feedback
The system SHALL provide helpful empty states when no data is available and user-friendly feedback for all interactions.

#### Scenario: No data for selected date range
- **WHEN** a DonVi user selects a date range with no activities or practitioners
- **THEN** the report displays an empty state with a message "Không có dữ liệu trong khoảng thời gian này"
- **AND** an illustration or icon is shown (e.g., empty folder icon)
- **AND** a suggestion is provided: "Thử điều chỉnh khoảng thời gian hoặc bộ lọc"

#### Scenario: No practitioners in selected status
- **WHEN** filters result in zero practitioners matching the criteria
- **THEN** the practitioners table shows an empty state "Không tìm thấy người hành nghề phù hợp"
- **AND** active filters are displayed with a "Clear filters" button

#### Scenario: Report loads successfully feedback
- **WHEN** a DonVi user successfully loads a report
- **THEN** a brief toast notification appears: "Báo cáo đã tải thành công"
- **AND** the toast auto-dismisses after 3 seconds
- **AND** the user can manually dismiss the toast

#### Scenario: Filter change feedback
- **WHEN** a DonVi user applies a filter
- **THEN** a loading indicator appears on the affected components
- **AND** the components smoothly transition to the new data (no jarring reload)
- **AND** the filter UI remains accessible during the fetch

---

### Requirement: Accessibility Compliance for Reports
The system SHALL meet WCAG 2.1 AA accessibility standards for all report components with keyboard navigation, screen reader support, and color contrast compliance.

#### Scenario: Keyboard navigation through report
- **WHEN** a keyboard user navigates the reports page
- **THEN** all interactive elements (tabs, filters, buttons, chart elements) are focusable via Tab key
- **AND** the focus order is logical (top to bottom, left to right)
- **AND** visible focus indicators (ring or outline) are displayed on focused elements

#### Scenario: Screen reader announces charts
- **WHEN** a screen reader user focuses on a chart
- **THEN** the chart container has an `aria-label` describing the chart type and data summary (e.g., "Pie chart: 60% compliant, 25% at risk, 15% critical")
- **AND** chart tooltips are announced when navigated via keyboard
- **AND** a data table alternative is available as a fallback (or documented for Phase 4)

#### Scenario: Color contrast compliance
- **WHEN** any text or UI element is displayed in the reports
- **THEN** the contrast ratio between text and background meets WCAG AA standard (4.5:1 for normal text, 3:1 for large text)
- **AND** chart colors meet contrast requirements against white/glass backgrounds
- **AND** status indicators use both color and text/icons (not color alone)

#### Scenario: Reduced motion preference
- **WHEN** a user has enabled "prefers-reduced-motion" in their system settings
- **THEN** chart animations are disabled or minimized
- **AND** transitions between report types are instant instead of animated
- **AND** skeleton loading animations are reduced to static placeholders

#### Scenario: Form labels and ARIA attributes
- **WHEN** filter forms are displayed
- **THEN** all input fields have associated `<label>` elements or `aria-label` attributes
- **AND** error messages are announced via `aria-live` regions
- **AND** required fields are marked with `aria-required="true"`
