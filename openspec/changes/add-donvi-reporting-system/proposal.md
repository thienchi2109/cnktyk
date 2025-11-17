# Proposal: Add DonVi Reporting System

## Why

The CNKTYKLT platform currently provides basic metrics for DonVi (Unit Admin) users through the dashboard, but lacks comprehensive reporting capabilities that enable data-driven decision-making and compliance management. DonVi administrators need:

1. **Actionable Insights**: Beyond simple counts, they need to understand compliance trends, identify at-risk practitioners, and analyze activity submission patterns
2. **Data Exploration**: Interactive drill-down capabilities to investigate specific issues (e.g., why certain practitioners are falling behind)
3. **Management Reporting**: Performance summaries for internal reviews and stakeholder reporting
4. **Proactive Management**: Early warning signals for practitioners approaching cycle deadlines or falling below compliance thresholds

Currently, the "Xuất báo cáo" (Export Report) button in the DonVi dashboard (line 318 of `unit-admin-dashboard.tsx`) is non-functional. Rather than simply enabling a file export, this change proposes a modern, interactive reporting system that provides immediate value through web-based analytics.

## What Changes

### 1. New Reporting Page & Navigation
- Create dedicated reports page at `/dashboard/unit-admin/reports`
- Add "Báo cáo" navigation item to DonVi sidebar
- Connect existing "Xuất báo cáo" button to navigate to new reports page

### 2. Four Report Types (Interactive, Web-Based)

#### Report Type A: Compliance Overview Report
- Compliance distribution visualization (pie/donut chart)
- Practitioner compliance breakdown (bar chart)
- Compliance trend over time (line chart)
- Filters: date range, employment status, position

#### Report Type B: Activity Submissions Report
- Submission trends over time (line chart)
- Submissions by activity type (bar chart)
- Approval status distribution (donut chart)
- Workflow efficiency metrics (average approval time)
- Filters: date range, activity type, approval status, practitioner

#### Report Type C: Practitioner Detail Report
- Individual practitioner deep-dive
- Credits breakdown by activity type (pie chart)
- Submission timeline visualization
- Progress tracking with compliance projections
- Filters: search by name/CCHN, employment status, compliance range

#### Report Type D: Unit Performance Summary
- Executive dashboard view with KPIs
- Month-over-month comparisons
- Quick-access metrics cards (glassmorphism style)
- Filters: time period presets (This Month, Last Quarter, etc.)

### 3. Technical Components

**Frontend:**
- New page route: `src/app/(authenticated)/dashboard/unit-admin/reports/page.tsx`
- Report components: `src/components/reports/` directory with:
  - `report-selector.tsx` (tab navigation)
  - `date-range-filter.tsx` (reusable filter component)
  - `compliance-report.tsx` (Type A)
  - `activity-report.tsx` (Type B)
  - `practitioner-report.tsx` (Type C)
  - `performance-summary.tsx` (Type D)
  - Chart components using **Shadcn/ui Charts** (Recharts wrapper)

**Backend:**
- New API routes: `src/app/api/reports/` directory with:
  - `compliance/route.ts` (GET compliance data)
  - `activities/route.ts` (GET activity submissions data)
  - `practitioner-details/route.ts` (GET individual practitioner data)
  - `performance-summary/route.ts` (GET unit KPIs)
- Optimized database queries using CTEs (Common Table Expressions)
- Parameterized queries with tenant isolation

**Dependencies:**
- Add Shadcn/ui Charts components (already uses Recharts under the hood)
- Install date-fns for date manipulation (if not already present)

### 4. Design Principles
- **Glassmorphism UI**: Consistent with existing dashboard design system
- **Healthcare Color Palette**: Medical Blue/Green/Amber/Red for status indicators
- **Responsive**: Mobile-first design with collapsible filters on small screens
- **Accessible**: ARIA labels, keyboard navigation, screen reader support

### 5. Security & Authorization
- Role-based access: DonVi users only
- Automatic filtering by `session.user.unitId` (tenant isolation)
- Audit logging for report generation requests to `NhatKyHeThong`

### 6. Deferred Features (Future Phases)
- File exports (Excel, PDF) - moved to Phase 5
- Scheduled reports with email delivery
- Custom report builder
- Historical data snapshots and trending

## Impact

### Affected Specs
- **dashboard**: Adding new reporting requirements for DonVi role

### Affected Code
**New Files:**
- `src/app/(authenticated)/dashboard/unit-admin/reports/page.tsx`
- `src/app/(authenticated)/dashboard/unit-admin/reports/loading.tsx`
- `src/app/api/reports/compliance/route.ts`
- `src/app/api/reports/activities/route.ts`
- `src/app/api/reports/practitioner-details/route.ts`
- `src/app/api/reports/performance-summary/route.ts`
- `src/components/reports/report-selector.tsx`
- `src/components/reports/date-range-filter.tsx`
- `src/components/reports/compliance-report.tsx`
- `src/components/reports/activity-report.tsx`
- `src/components/reports/practitioner-report.tsx`
- `src/components/reports/performance-summary.tsx`
- `src/components/reports/charts/` (chart sub-components)

**Modified Files:**
- `src/components/dashboard/unit-admin-dashboard.tsx` (connect "Xuất báo cáo" button)
- `src/components/layout/glass-sidebar.tsx` (add "Báo cáo" navigation item for DonVi)
- `src/types/dashboard.ts` (add report-related TypeScript types)

### Dependencies Added
- Shadcn/ui Chart components (via npx shadcn@latest add chart)
- date-fns (if not already present): `npm install date-fns`

### Database Impact
- No schema changes required
- Leverages existing tables: `NhanVien`, `GhiNhanHoatDong`, `DanhMucHoatDong`
- Adds audit log entries to `NhatKyHeThong` for report access

### Breaking Changes
- None (additive feature only)

### Performance Considerations
- Database queries optimized with CTEs to avoid N+1 patterns
- Similar approach to existing `/api/units/[id]/metrics` endpoint
- Client-side data caching with React Query (TanStack Query)
- Pagination for large datasets in practitioner detail reports

### User Impact
- DonVi users gain comprehensive reporting capabilities
- Existing dashboard functionality remains unchanged
- "Xuất báo cáo" button becomes functional (redirects to reports page)
- New sidebar navigation item for quick access

### Timeline
- **Phase 1** (High Priority): Foundation + Performance Summary Report (Type D)
- **Phase 2** (High Priority): Compliance Overview (Type A) + Activity Submissions (Type B)
- **Phase 3** (Medium Priority): Practitioner Detail Report (Type C) + advanced filtering
- **Phase 4** (Medium Priority): Polish, optimization, mobile refinement
- **Phase 5** (Future): File export functionality (Excel, PDF)
