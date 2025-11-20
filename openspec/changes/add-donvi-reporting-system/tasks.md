# Implementation Tasks: DonVi Reporting System

## Phase 1: Foundation + Performance Summary Report (High Priority)

### 1.1 Setup and Dependencies
- [ ] 1.1.1 Install Shadcn/ui Chart components
  ```bash
  npx shadcn@latest add chart
  ```
- [ ] 1.1.2 Verify date-fns is installed (if not: `npm install date-fns`)
- [ ] 1.1.3 Create TypeScript types in `src/types/reports.ts`
  - Define `ReportType`, `ReportFilters`, `PerformanceSummaryData`, etc.
  - Export all report data interfaces

### 1.2 Create Reports Page Route
- [ ] 1.2.1 Create `src/app/(authenticated)/dashboard/unit-admin/reports/page.tsx`
  - Server component with `requireAuth()` check
  - Role validation (DonVi only)
  - Pass `unitId` to client component
- [ ] 1.2.2 Create `src/app/(authenticated)/dashboard/unit-admin/reports/loading.tsx`
  - Loading skeleton using existing `DashboardCardSkeleton`
- [ ] 1.2.3 Create client component `src/components/reports/reports-page-client.tsx`
  - State management for selected report type
  - State management for filters
  - Tab navigation structure (placeholder tabs initially)

### 1.3 Navigation Updates
- [ ] 1.3.1 Update `src/components/layout/glass-sidebar.tsx`
  - Add "Báo cáo" navigation item for DonVi role
  - Icon: `BarChart3` from lucide-react
  - Link: `/dashboard/unit-admin/reports`
- [ ] 1.3.2 Update `src/components/dashboard/unit-admin-dashboard.tsx`
  - Connect "Xuất báo cáo" button (line 316-319)
  - Add `onClick` handler to navigate to `/dashboard/unit-admin/reports`
  - Use Next.js `useRouter` hook

### 1.4 Common Components
- [ ] 1.4.1 Create `src/components/reports/report-selector.tsx`
  - Tabs component for switching between report types
  - Four tabs: Performance, Compliance, Activities, Practitioner Detail
  - Responsive: horizontal tabs on desktop, dropdown on mobile
- [ ] 1.4.2 Create `src/components/reports/date-range-filter.tsx`
  - Preset buttons: Last 30 Days, Last 90 Days, This Quarter, This Year, Custom
  - Custom date pickers (use Shadcn DatePicker)
  - Default: Last 30 days
  - State management for date range
- [ ] 1.4.3 Create `src/components/reports/charts/chart-config.ts`
  - Shared chart color configurations
  - Healthcare color palette mapping (compliant=green, at_risk=amber, critical=red)

### 1.5 Performance Summary Report (Type D)
- [ ] 1.5.1 Create API route `src/app/api/reports/performance-summary/route.ts`
  - Authentication check (`requireAuth()`)
  - Role authorization (DonVi only)
  - Extract query parameters: `period`, `startDate`, `endDate`
  - Validate parameters with Zod
  - Calculate date ranges based on period preset
  - Query database using CTE (similar to `/api/units/[id]/metrics`)
    - Current period metrics: total practitioners, active, compliance rate, pending, approved/rejected counts
    - Comparison period metrics (if applicable)
    - Calculate trends (% change, absolute change)
  - Return JSON response with `PerformanceSummaryData` structure
  - Add audit logging for report generation
- [ ] 1.5.2 Create component `src/components/reports/performance-summary.tsx`
  - Fetches data using TanStack Query hook
  - Displays KPI cards (glassmorphism style)
    - Total Practitioners (blue)
    - Compliance Rate (green)
    - Pending Approvals (amber)
    - At Risk Practitioners (red)
  - Month-over-month comparison indicators (up/down arrows with % change)
  - Loading state: `DashboardKpiSkeleton`
  - Error state: `DashboardErrorPanel`
  - Empty state: User-friendly message
- [ ] 1.5.3 Create custom hook `src/hooks/use-performance-summary.ts`
  - Wraps TanStack Query `useQuery`
  - Query key: `['reports', 'performance', filters]`
  - 30s stale time
  - Error handling

### 1.6 Testing Phase 1
- [ ] 1.6.1 Test navigation
  - Verify sidebar "Báo cáo" link appears for DonVi users only
  - Verify "Xuất báo cáo" button navigates to reports page
  - Verify non-DonVi users cannot access `/dashboard/unit-admin/reports`
- [ ] 1.6.2 Test Performance Summary Report
  - Verify data loads correctly
  - Verify period selector changes data
  - Verify trend calculations are accurate
  - Verify responsive design on mobile/tablet/desktop
- [ ] 1.6.3 Run `npm run typecheck` - No errors
- [ ] 1.6.4 Run `npm run build:check` - Build succeeds

---

## Phase 2: Compliance & Activity Reports (High Priority)

### 2.1 Compliance Overview Report (Type A)

#### 2.1.1 Backend API
- [ ] 2.1.1.1 Create `src/app/api/reports/compliance/route.ts`
  - Authentication and authorization checks
  - Extract parameters: `startDate`, `endDate`, `employmentStatus`, `position`
  - Validate with Zod
  - Build CTE query:
    - Calculate total credits per practitioner
    - Categorize into compliant/at_risk/critical (108+ / 84-108 / <84 credits)
    - Aggregate counts by status
    - Calculate average credits
    - Get practitioner details for each category
  - Return `ComplianceReportData` structure
  - Audit log report generation

#### 2.1.2 Frontend Component
- [ ] 2.1.2.1 Create `src/components/reports/compliance-report.tsx`
  - Fetch data with custom hook
  - Display summary cards (total, compliant, at risk, critical)
  - Pie chart: Compliance distribution (Shadcn Chart + Recharts PieChart)
    - Green slice: Compliant
    - Amber slice: At Risk
    - Red slice: Critical
  - Bar chart: Credits distribution by practitioner (top 10 or bottom 10)
  - Practitioners table (sortable, filterable)
  - Loading/Error/Empty states
- [ ] 2.1.2.2 Create `src/components/reports/charts/compliance-pie-chart.tsx`
  - Reusable pie chart component
  - Hover tooltips with count and percentage
  - Click to drill down (future enhancement)
- [ ] 2.1.2.3 Create `src/components/reports/charts/compliance-bar-chart.tsx`
  - Horizontal bar chart showing credits per practitioner
  - Color-coded bars by compliance status
  - Truncate long names with tooltips
- [ ] 2.1.2.4 Create hook `src/hooks/use-compliance-report.ts`
  - TanStack Query setup with filters

#### 2.1.3 Filter Enhancements
- [ ] 2.1.3.1 Update `date-range-filter.tsx`
  - Add cycle-based presets: "Current Cycle", "Last Cycle"
  - Calculate based on practitioner license issue dates
- [ ] 2.1.3.2 Create `src/components/reports/employment-status-filter.tsx`
  - Checkbox group: Active, Retired, On Hold
  - Multi-select support
- [ ] 2.1.3.3 Create `src/components/reports/position-filter.tsx`
  - Dropdown with common positions
  - Fetches unique positions from database

### 2.2 Activity Submissions Report (Type B)

#### 2.2.1 Backend API
- [ ] 2.2.1.1 Create `src/app/api/reports/activities/route.ts`
  - Authentication and authorization
  - Parameters: `startDate`, `endDate`, `activityType`, `approvalStatus`, `practitionerId`
  - CTE query:
    - Total submissions by status (Pending, Approved, Rejected)
    - Group by activity type
    - Calculate average approval time (NgayDuyet - NgayGhiNhan)
    - Monthly aggregation for timeline chart
  - Return `ActivityReportData` structure
  - Audit logging

#### 2.2.2 Frontend Component
- [ ] 2.2.2.1 Create `src/components/reports/activity-report.tsx`
  - Summary metrics cards (total, pending, approved, rejected, avg approval time)
  - Donut chart: Status distribution (ChoDuyet, DaDuyet, TuChoi)
  - Bar chart: Submissions by activity type
  - Line chart: Monthly submission timeline (submitted, approved, rejected lines)
  - Approval efficiency metrics (fastest, slowest, average)
  - Loading/Error/Empty states
- [ ] 2.2.2.2 Create `src/components/reports/charts/activity-donut-chart.tsx`
  - Donut chart with status breakdown
  - Amber: Pending, Green: Approved, Red: Rejected
- [ ] 2.2.2.3 Create `src/components/reports/charts/activity-timeline-chart.tsx`
  - Line chart with multiple series
  - X-axis: Months, Y-axis: Count
  - Three lines: Submitted, Approved, Rejected
- [ ] 2.2.2.4 Create `src/components/reports/charts/activity-type-bar-chart.tsx`
  - Vertical bar chart by activity type (KhoaHoc, HoiThao, NghienCuu, BaoCao)
- [ ] 2.2.2.5 Create hook `src/hooks/use-activity-report.ts`

#### 2.2.3 Additional Filters
- [ ] 2.2.3.1 Create `src/components/reports/activity-type-filter.tsx`
  - Multi-select for activity types
- [ ] 2.2.3.2 Create `src/components/reports/approval-status-filter.tsx`
  - Radio group: All, Pending, Approved, Rejected
- [ ] 2.2.3.3 Create `src/components/reports/practitioner-search-filter.tsx`
  - Autocomplete search by practitioner name or CCHN
  - Debounced search (300ms)

### 2.3 Testing Phase 2
- [ ] 2.3.1 Test Compliance Report
  - Verify charts render with correct data
  - Verify filters affect displayed data
  - Verify color coding (green/amber/red)
  - Test edge cases: all compliant, all critical, no data
- [ ] 2.3.2 Test Activity Report
  - Verify timeline chart shows trends
  - Verify approval time calculations are accurate
  - Test filters (activity type, status, date range)
  - Test practitioner search
- [ ] 2.3.3 Responsive testing
  - Mobile: Verify charts resize appropriately
  - Tablet: Verify filters collapse correctly
- [ ] 2.3.4 Accessibility testing
  - Screen reader: Verify chart descriptions announced
  - Keyboard: Tab through all interactive elements
  - Color contrast: Verify WCAG AA compliance
- [ ] 2.3.5 Run `npm run typecheck` - No errors
- [ ] 2.3.6 Run `npm run build:check` - Build succeeds

---

## Phase 3: Practitioner Detail Report + Advanced Filtering (Medium Priority)

### 3.1 Practitioner Detail Report (Type C)

#### 3.1.1 Backend API
- [x] 3.1.1.1 Create `src/app/api/reports/practitioner-details/route.ts`
  - Required parameter: `practitionerId`
  - Optional: `startDate`, `endDate` (default to cycle dates)
  - CTE query:
    - Practitioner metadata (name, license, position, cycle dates)
    - Total credits earned, required (120), remaining
    - Credits breakdown by activity type
    - Submission history with status
    - Timeline data (cumulative credits over time)
  - Return `PractitionerDetailReportData`
  - Audit logging

#### 3.1.2 Frontend Component
- [x] 3.1.2.1 Create `src/components/reports/practitioner-report.tsx`
  - Practitioner selector dropdown (searchable)
  - Practitioner info card (name, license, position, cycle dates)
  - Credits progress card
    - Large circular progress indicator (glasscn-ui)
    - Earned / Required / Remaining
    - Color-coded by compliance status
  - Pie chart: Credits by activity type
  - Timeline chart: Cumulative credits over time (line chart)
  - Submissions table (sortable by date, status, credits)
  - Loading/Error/Empty states
- [x] 3.1.2.2 Create `src/components/reports/charts/credits-breakdown-pie-chart.tsx`
  - Pie chart with activity types
  - Custom colors per activity type
- [x] 3.1.2.3 Create `src/components/reports/charts/credits-timeline-chart.tsx`
  - Area chart showing credit accumulation
  - Reference line at 120 credits (target)
  - Projected completion date if trend continues
- [x] 3.1.2.4 Create hook `src/hooks/use-practitioner-detail-report.ts`

### 3.2 Advanced Filter Panel
- [x] 3.2.1 Create `src/components/reports/filter-panel.tsx`
  - Container component for all filters
  - Collapsible on mobile (bottom sheet)
  - Sticky sidebar on desktop
  - "Reset Filters" button
  - Show active filter count badge
- [x] 3.2.2 Implement filter state management
  - Use URL query parameters for deep linking (deferred)
  - Persist filters across navigation
  - "Apply Filters" button for mobile to reduce API calls (deferred)

### 3.3 Drill-Down Interactions
- [x] 3.3.1 Add click handlers to Compliance Report charts
  - Click on pie slice → filter practitioners table by that status (deferred)
  - Click on bar → open practitioner detail for that practitioner (DONE)
- [ ] 3.3.2 Add click handlers to Activity Report charts
  - Click on timeline data point → show submissions for that month
  - Click on activity type bar → filter submissions table
- [ ] 3.3.3 Implement breadcrumb navigation
  - Show current filter/drill-down path (deferred)
  - Allow easy navigation back to overview (deferred)

### 3.4 Testing Phase 3
- [ ] 3.4.1 Test Practitioner Detail Report
  - Verify all practitioner data loads
  - Verify timeline chart reflects accurate cumulative credits
  - Test cycle date calculations
  - Test practitioner selector search
- [ ] 3.4.2 Test drill-down interactions
  - Click through from compliance chart to practitioner detail
  - Verify filters apply correctly after drill-down
  - Test breadcrumb navigation
- [ ] 3.4.3 Test filter panel
  - Verify all filters work together (AND logic)
  - Test reset filters functionality
  - Verify URL parameters update correctly
  - Test deep linking (share URL with filters applied)
- [ ] 3.4.4 Run `npm run typecheck` - No errors
- [ ] 3.4.5 Run `npm run build:check` - Build succeeds

---

## Phase 4: Polish & Optimization (Medium Priority)

### 4.1 Performance Optimization
- [ ] 4.1.1 Database indexing
  - Verify index on `GhiNhanHoatDong.MaNhanVien, NgayBatDau`
  - Verify index on `GhiNhanHoatDong.TrangThaiDuyet`
  - Verify index on `NhanVien.MaDonVi`
  - Add composite indexes if needed based on query plans
- [ ] 4.1.2 React Query optimization
  - Implement prefetching on hover for drill-down links
  - Set appropriate stale/cache times (30s/5min)
  - Implement request deduplication
- [ ] 4.1.3 Code splitting
  - Lazy load chart components with `dynamic()`
  - Lazy load report components not currently visible
  - Measure bundle size impact
- [ ] 4.1.4 API response optimization
  - Add pagination for large datasets (>100 practitioners)
  - Implement cursor-based pagination for submissions
  - Add `limit` parameter to APIs
- [ ] 4.1.5 Add performance monitoring
  - Log API response times
  - Track slow queries (>1s threshold)
  - Monitor bundle size

### 4.2 Mobile Responsiveness Refinement
- [ ] 4.2.1 Test all reports on real mobile devices
  - iOS Safari
  - Android Chrome
  - Verify touch interactions work (no hover-only features)
- [ ] 4.2.2 Optimize chart sizing for mobile
  - Reduce chart height on small screens (200-250px)
  - Simplify chart legends (stack vertically)
  - Increase touch target sizes (min 44x44px)
- [ ] 4.2.3 Improve mobile navigation
  - Add bottom navigation for report types
  - Implement swipe gestures between reports
  - Add pull-to-refresh for data

### 4.3 Accessibility Improvements
- [ ] 4.3.1 Audit with screen reader (NVDA/JAWS/VoiceOver)
  - Verify all charts have descriptive `aria-label`
  - Verify chart data announced correctly
  - Verify focus order is logical
- [ ] 4.3.2 Keyboard navigation
  - Ensure all interactive elements focusable
  - Add visible focus indicators (ring)
  - Implement keyboard shortcuts (e.g., "R" to refresh)
- [ ] 4.3.3 Color accessibility
  - Verify color contrast meets WCAG AA (4.5:1)
  - Add patterns/textures in addition to color
  - Test with color blindness simulators
- [ ] 4.3.4 Add data table alternatives
  - Provide table view toggle for charts
  - CSV download for screen reader users
  - Ensure tables have proper headers and scope attributes

### 4.4 Error Handling & Edge Cases
- [ ] 4.4.1 Implement comprehensive error boundaries
  - Chart-level error boundaries (isolate failures)
  - Report-level error boundaries
  - Global error boundary on reports page
- [ ] 4.4.2 Handle edge cases
  - No data available for selected date range
  - All practitioners deleted/archived
  - Invalid date ranges (end before start)
  - Network timeouts (retry logic)
- [ ] 4.4.3 Add user-friendly error messages
  - Specific messages per error type
  - Action buttons (Retry, Go Back, Contact Support)
  - Preserve user filters on error recovery

### 4.5 UI/UX Polish
- [ ] 4.5.1 Add loading skeletons
  - Use existing `DashboardCardSkeleton`, `DashboardKpiSkeleton`
  - Create `ChartSkeleton` for chart placeholders
  - Avoid layout shift during loading
- [ ] 4.5.2 Add empty states
  - Custom illustrations for "No data" states
  - Helpful messages (e.g., "No activities submitted in this period")
  - Suggest actions (e.g., "Adjust date range" button)
- [ ] 4.5.3 Add success feedback
  - Toast notification when report loads
  - Visual indicators for filter changes
  - Smooth transitions between report types
- [ ] 4.5.4 Improve chart interactivity
  - Hover animations (scale on hover)
  - Click feedback (ripple effect)
  - Smooth tooltips (no flicker)
- [ ] 4.5.5 Add report metadata footer
  - "Last updated: {timestamp}"
  - "Data range: {startDate} - {endDate}"
  - "Generated by: {userName}"

### 4.6 Documentation
- [ ] 4.6.1 Create user documentation
  - Add tooltips with "?" icons explaining each metric
  - Create help modal with report guides
  - Add onboarding tour for first-time users (optional)
- [ ] 4.6.2 Update CLAUDE.md
  - Document reports page location and structure
  - Add report API endpoints to reference
  - Note Shadcn Charts dependency
- [ ] 4.6.3 Create inline code comments
  - Document complex CTE queries
  - Explain credit calculation logic
  - Note any workarounds or hacks

### 4.7 Testing Phase 4
- [ ] 4.7.1 Performance testing
  - Load test with 1000+ practitioners
  - Measure API response times (<500ms target)
  - Verify bundle size acceptable (<100KB increase)
- [ ] 4.7.2 Cross-browser testing
  - Chrome, Firefox, Safari, Edge
  - Verify charts render identically
  - Test glassmorphism effects
- [ ] 4.7.3 Accessibility audit
  - Run Lighthouse accessibility scan (>90 score)
  - Use axe DevTools for automated checks
  - Manual testing with screen reader
- [ ] 4.7.4 User acceptance testing
  - Get feedback from DonVi users
  - Collect usability issues
  - Iterate on pain points
- [ ] 4.7.5 Final QA
  - Run full regression test suite
  - Verify all features work as specified
  - Run `npm run typecheck` - No errors
  - Run `npm run build:check` - Build succeeds

---

## Phase 5: Export Functionality (Future/Deferred)

**NOTE:** This phase is deferred to future work after user feedback on interactive reports.

### 5.1 Excel Export
- [ ] 5.1.1 Install exceljs: `npm install exceljs`
- [ ] 5.1.2 Create `src/lib/reports/excel-exporter.ts`
  - Functions to convert report data to Excel format
  - Styling: headers, colors, borders
  - Multiple sheets per report type
- [ ] 5.1.3 Add "Xuất Excel" button to each report
  - Generate Excel file on client-side
  - Trigger browser download
  - Show progress indicator for large files

### 5.2 PDF Export
- [ ] 5.2.1 Choose PDF library (jsPDF or similar)
- [ ] 5.2.2 Create `src/lib/reports/pdf-exporter.ts`
  - Render charts as images (chart.toDataURL())
  - Layout report data in PDF
  - Add branding/logo
- [ ] 5.2.3 Add "Xuất PDF" button to each report

### 5.3 Scheduled Reports (Email Delivery)
- [ ] 5.3.1 Create scheduled report configuration UI
  - Frequency: Daily, Weekly, Monthly
  - Recipients: Email addresses
  - Report types to include
- [ ] 5.3.2 Implement background job system
  - Cron job or scheduled task
  - Generate reports at scheduled times
  - Send via email (SendGrid, AWS SES, etc.)
- [ ] 5.3.3 Add email templates
  - HTML email with report summary
  - Attach PDF/Excel files

---

## Definition of Done (Per Phase)

**Checklist for each phase completion:**
- [ ] All tasks in phase completed
- [ ] TypeScript type checking passes (`npm run typecheck`)
- [ ] Build succeeds without errors (`npm run build:check`)
- [ ] Manual testing completed on desktop, tablet, mobile
- [ ] Accessibility basics verified (keyboard nav, screen reader)
- [ ] Code reviewed (if working in team)
- [ ] Tests written (if applicable)
- [ ] Documentation updated (code comments, CLAUDE.md if needed)
- [ ] Git commit with clear message
- [ ] Deployed to preview environment (if available)
- [ ] User feedback collected (for final phase)

---

## Rollback Plan

If critical issues found after deployment:

1. **Immediate**: Remove "Báo cáo" navigation link from sidebar
2. **Backend**: Keep API routes but add feature flag check
3. **Frontend**: Add feature flag to reports page (redirect to dashboard if disabled)
4. **Database**: No schema changes made, so no rollback needed
5. **Hotfix**: Create emergency patch branch if partial features need disabling

**Feature Flag Implementation:**
```typescript
// src/lib/features/flags.ts
export function isReportingEnabled() {
  return process.env.ENABLE_DONVI_REPORTING === 'true';
}

// In reports page
if (!isReportingEnabled()) {
  redirect('/dashboard/unit-admin');
}
```

---

## Success Metrics

**Phase 1 Success Criteria:**
- DonVi users can navigate to reports page
- Performance Summary Report displays real data
- No console errors or build warnings

**Phase 2 Success Criteria:**
- All 3 core reports (Performance, Compliance, Activities) functional
- Charts render correctly with real data
- Filters work as expected
- Mobile responsive design passes manual testing

**Phase 3 Success Criteria:**
- Practitioner Detail Report provides actionable insights
- Drill-down interactions work smoothly
- Deep linking via URL parameters functional

**Phase 4 Success Criteria:**
- API response times <500ms for typical data volumes
- Lighthouse accessibility score >90
- No major bugs reported in user testing
- Positive user feedback on usability

**Overall Success Metrics:**
- 80%+ of DonVi users access reports within first week
- Average session duration on reports page >2 minutes (engagement)
- <5% error rate on report API endpoints
- Zero critical security issues (SQL injection, unauthorized access)
