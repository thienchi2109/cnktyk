# Design Document: DonVi Reporting System

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Reports Page (/dashboard/unit-admin/reports)   │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────┐    │  │
│  │  │   Report Type Selector (Tabs)           │    │  │
│  │  └─────────────────────────────────────────┘    │  │
│  │                                                   │  │
│  │  ┌───────────────┐  ┌───────────────────────┐  │  │
│  │  │ Date Range    │  │  Selected Report      │  │  │
│  │  │ Filter        │  │  Component            │  │  │
│  │  │               │  │  - Charts (Shadcn)    │  │  │
│  │  │               │  │  - Tables             │  │  │
│  │  │               │  │  - KPI Cards          │  │  │
│  │  └───────────────┘  └───────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         │ React Query (TanStack)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   API Layer                              │
│  /api/reports/                                          │
│    ├── compliance/route.ts                              │
│    ├── activities/route.ts                              │
│    ├── practitioner-details/route.ts                    │
│    └── performance-summary/route.ts                     │
│                                                          │
│  - NextAuth session validation                          │
│  - Role-based authorization (DonVi only)                │
│  - Tenant isolation (filter by unitId)                  │
│  - Request parameter validation (Zod)                   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Parameterized SQL
                         ▼
┌─────────────────────────────────────────────────────────┐
│                Database Layer (Neon)                     │
│  - Optimized queries with CTEs                          │
│  - Tenant-scoped WHERE clauses                          │
│  - Indexed date/status columns                          │
│  - Tables: NhanVien, GhiNhanHoatDong, DanhMucHoatDong   │
└─────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Chart Library: Shadcn/ui Charts

**Decision:** Use Shadcn/ui Charts (Recharts wrapper) for all visualizations.

**Rationale:**
- **Consistency**: Already using Shadcn/ui components throughout the platform
- **Built on Recharts**: Proven, production-ready charting library
- **Glassmorphism-friendly**: Easy to customize with existing design tokens
- **Accessibility**: Built-in ARIA labels and keyboard navigation
- **TypeScript Support**: Full type safety
- **Tree-shakeable**: Only import what's needed

**Installation:**
```bash
npx shadcn@latest add chart
```

**Components to use:**
- `<ChartContainer>` - Base container with responsive sizing
- `<ChartTooltip>` - Accessible tooltips
- `<ChartLegend>` - Chart legends
- Recharts primitives: `PieChart`, `BarChart`, `LineChart`, `AreaChart`

**Example Chart Pattern:**
```tsx
<ChartContainer config={chartConfig} className="h-[300px]">
  <ResponsiveContainer>
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" />
      <ChartTooltip content={<ChartTooltipContent />} />
    </PieChart>
  </ResponsiveContainer>
</ChartContainer>
```

---

### 2. Data Fetching Strategy

**Decision:** Use React Query (TanStack Query) with server-side API routes.

**Rationale:**
- **Already in use**: Platform already leverages TanStack Query v5
- **Caching**: Automatic caching reduces API calls (30s stale time)
- **Loading states**: Built-in `isLoading`, `isError` states
- **Refetching**: Easy to implement refresh on demand
- **TypeScript**: Full type inference for API responses

**API Route Pattern:**
```typescript
// GET /api/reports/compliance?unitId=xxx&startDate=...&endDate=...
export async function GET(request: NextRequest) {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  // Authorization
  if (session.user.role !== 'DonVi') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Tenant isolation
  const unitId = session.user.unitId;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Query with CTEs
  const result = await db.query(`
    WITH practitioner_credits AS (
      SELECT n."MaNhanVien", SUM(g."SoGioTinChiQuyDoi") as total_credits
      FROM "NhanVien" n
      LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien"
      WHERE n."MaDonVi" = $1
        AND g."TrangThaiDuyet" = 'DaDuyet'
        AND g."NgayBatDau" >= $2
        AND g."NgayKetThuc" <= $3
      GROUP BY n."MaNhanVien"
    )
    SELECT ... FROM practitioner_credits ...
  `, [unitId, startDate, endDate]);

  return NextResponse.json({ success: true, data: result });
}
```

**Client-side Hook Pattern:**
```tsx
function useComplianceReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'compliance', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      const res = await fetch(`/api/reports/compliance?${params}`);
      return res.json();
    },
    staleTime: 30000, // 30s cache
  });
}
```

---

### 3. Database Query Optimization

**Decision:** Use Common Table Expressions (CTEs) to minimize database round-trips.

**Rationale:**
- **Proven pattern**: Already used in `/api/units/[id]/metrics` with ~85% performance gain
- **Single query**: Reduces 5-10 sequential queries to 1
- **Readable**: CTEs make complex logic maintainable
- **Performant**: PostgreSQL optimizes CTEs well

**Example: Compliance Report Query**
```sql
WITH
-- CTE 1: Calculate credits per practitioner
practitioner_credits AS (
  SELECT
    n."MaNhanVien",
    n."HoVaTen",
    n."SoCCHN",
    n."TrangThaiLamViec",
    COALESCE(SUM(
      CASE
        WHEN (dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
              OR (dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL))
        THEN g."SoGioTinChiQuyDoi"
        ELSE 0
      END
    ), 0) as total_credits
  FROM "NhanVien" n
  LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien"
    AND g."TrangThaiDuyet" = 'DaDuyet'
    AND g."NgayBatDau" >= $2
    AND g."NgayKetThuc" <= $3
  LEFT JOIN "DanhMucHoatDong" dm ON g."MaDanhMuc" = dm."MaDanhMuc"
  WHERE n."MaDonVi" = $1
  GROUP BY n."MaNhanVien", n."HoVaTen", n."SoCCHN", n."TrangThaiLamViec"
),
-- CTE 2: Categorize by compliance status
compliance_categories AS (
  SELECT
    CASE
      WHEN total_credits >= 108 THEN 'compliant'
      WHEN total_credits >= 84 THEN 'at_risk'
      ELSE 'critical'
    END as status,
    COUNT(*) as count
  FROM practitioner_credits
  GROUP BY
    CASE
      WHEN total_credits >= 108 THEN 'compliant'
      WHEN total_credits >= 84 THEN 'at_risk'
      ELSE 'critical'
    END
)
-- Final result
SELECT * FROM compliance_categories
ORDER BY
  CASE status
    WHEN 'compliant' THEN 1
    WHEN 'at_risk' THEN 2
    WHEN 'critical' THEN 3
  END;
```

---

### 4. Report Types & Data Models

#### Report Type A: Compliance Overview

**API Endpoint:** `GET /api/reports/compliance`

**Query Parameters:**
- `startDate` (ISO string)
- `endDate` (ISO string)
- `employmentStatus` (optional: DangLamViec | DaNghi | TamHoan)
- `position` (optional: ChucDanh filter)

**Response Type:**
```typescript
interface ComplianceReportData {
  summary: {
    totalPractitioners: number;
    compliantCount: number;
    atRiskCount: number;
    criticalCount: number;
    averageCredits: number;
    complianceRate: number;
  };
  distribution: Array<{
    status: 'compliant' | 'at_risk' | 'critical';
    count: number;
    percentage: number;
  }>;
  practitioners: Array<{
    id: string;
    name: string;
    licenseId: string;
    credits: number;
    status: 'compliant' | 'at_risk' | 'critical';
  }>;
  trend?: Array<{
    month: string;
    complianceRate: number;
  }>;
}
```

---

#### Report Type B: Activity Submissions

**API Endpoint:** `GET /api/reports/activities`

**Query Parameters:**
- `startDate` (ISO string)
- `endDate` (ISO string)
- `activityType` (optional: KhoaHoc | HoiThao | NghienCuu | BaoCao)
- `approvalStatus` (optional: ChoDuyet | DaDuyet | TuChoi)
- `practitionerId` (optional: filter by practitioner)

**Response Type:**
```typescript
interface ActivityReportData {
  summary: {
    totalSubmissions: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    averageApprovalDays: number;
  };
  byActivityType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
    count: number;
    percentage: number;
  }>;
  timeline: Array<{
    month: string;
    submitted: number;
    approved: number;
    rejected: number;
  }>;
  approvalMetrics: {
    avgDaysToApproval: number;
    fastestApproval: number;
    slowestApproval: number;
  };
}
```

---

#### Report Type C: Practitioner Detail

**API Endpoint:** `GET /api/reports/practitioner-details`

**Query Parameters:**
- `practitionerId` (required: MaNhanVien)
- `startDate` (optional: defaults to license issue date)
- `endDate` (optional: defaults to 5 years after license issue)

**Response Type:**
```typescript
interface PractitionerDetailReportData {
  practitioner: {
    id: string;
    name: string;
    licenseId: string;
    position: string;
    employmentStatus: string;
    licenseIssueDate: string;
    cycleEndDate: string;
  };
  credits: {
    earned: number;
    required: number;
    remaining: number;
    percentComplete: number;
  };
  byActivityType: Array<{
    type: string;
    credits: number;
    count: number;
  }>;
  submissions: Array<{
    id: string;
    activityName: string;
    type: string;
    credits: number;
    status: string;
    submittedDate: string;
    approvedDate?: string;
  }>;
  timeline: Array<{
    date: string;
    cumulativeCredits: number;
  }>;
}
```

---

#### Report Type D: Performance Summary

**API Endpoint:** `GET /api/reports/performance-summary`

**Query Parameters:**
- `period` (enum: 'current_month' | 'last_month' | 'current_quarter' | 'last_quarter' | 'custom')
- `startDate` (if period = 'custom')
- `endDate` (if period = 'custom')

**Response Type:**
```typescript
interface PerformanceSummaryData {
  currentPeriod: {
    totalPractitioners: number;
    activePractitioners: number;
    complianceRate: number;
    pendingApprovals: number;
    approvedActivities: number;
    rejectedActivities: number;
    atRiskPractitioners: number;
  };
  comparisonPeriod?: {
    // Same structure as currentPeriod
    totalPractitioners: number;
    activePractitioners: number;
    complianceRate: number;
    // ...
  };
  trends: {
    complianceRateChange: number; // % change
    approvalVolumeChange: number; // % change
    atRiskChange: number; // absolute change
  };
}
```

---

### 5. UI Component Structure

**Reports Page Layout:**
```tsx
// src/app/(authenticated)/dashboard/unit-admin/reports/page.tsx
export default async function ReportsPage() {
  const session = await requireAuth();

  if (session.user.role !== 'DonVi') {
    redirect('/dashboard');
  }

  return <ReportsPageClient unitId={session.user.unitId} />;
}

// Client component
'use client';
function ReportsPageClient({ unitId }: { unitId: string }) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('performance');
  const [filters, setFilters] = useState<ReportFilters>({ ... });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1>Báo cáo phân tích</h1>
      </div>

      {/* Report Type Selector (Tabs) */}
      <Tabs value={selectedReport} onValueChange={setSelectedReport}>
        <TabsList className="glass-card">
          <TabsTrigger value="performance">Tổng quan</TabsTrigger>
          <TabsTrigger value="compliance">Tuân thủ</TabsTrigger>
          <TabsTrigger value="activities">Hoạt động</TabsTrigger>
          <TabsTrigger value="practitioner">Chi tiết cá nhân</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <PerformanceSummaryReport unitId={unitId} filters={filters} />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceReport unitId={unitId} filters={filters} />
        </TabsContent>

        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

**Date Range Filter Component:**
```tsx
// src/components/reports/date-range-filter.tsx
'use client';
export function DateRangeFilter({ value, onChange }: Props) {
  const [preset, setPreset] = useState<PresetType>('last_30_days');

  return (
    <GlassCard className="p-4">
      <div className="space-y-4">
        <Label>Khoảng thời gian</Label>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={preset === 'last_30_days' ? 'default' : 'outline'}
            onClick={() => handlePreset('last_30_days')}
          >
            30 ngày qua
          </Button>
          {/* ... other presets */}
        </div>

        {/* Custom date pickers */}
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <DatePicker value={value.startDate} onChange={...} />
            <DatePicker value={value.endDate} onChange={...} />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
```

---

### 6. Glassmorphism Styling for Charts

**Chart Container Styling:**
```tsx
<GlassCard className="p-6">
  <div className="mb-4">
    <h3 className="text-lg font-semibold text-gray-800">
      Phân bổ tuân thủ
    </h3>
    <p className="text-sm text-gray-600">
      Trạng thái của {totalPractitioners} người hành nghề
    </p>
  </div>

  <ChartContainer config={chartConfig} className="h-[300px]">
    <ResponsiveContainer>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="var(--color-compliant)"
          label
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getStatusColor(entry.status)}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ResponsiveContainer>
  </ChartContainer>
</GlassCard>
```

**Color Mapping:**
```typescript
const chartConfig = {
  compliant: {
    label: "Đạt chuẩn",
    color: "hsl(var(--medical-green))", // #00A86B
  },
  at_risk: {
    label: "Cần theo dõi",
    color: "hsl(var(--medical-amber))", // #F59E0B
  },
  critical: {
    label: "Rủi ro cao",
    color: "hsl(var(--medical-red))", // #DC2626
  },
} satisfies ChartConfig;
```

---

### 7. Security Considerations

**Tenant Isolation:**
- All API routes MUST filter by `session.user.unitId`
- Never accept `unitId` from client-side parameters
- Use parameterized queries to prevent SQL injection

**Authorization:**
- Check `session.user.role === 'DonVi'` in every API route
- Middleware already protects `/dashboard/unit-admin/*` routes
- Return 403 Forbidden for unauthorized access attempts

**Audit Logging:**
```typescript
// Log report generation
await auditLog({
  MaTaiKhoan: session.user.id,
  HanhDong: 'VIEW_REPORT',
  Bang: 'Reports',
  KhoaChinh: reportType,
  NoiDung: {
    reportType,
    filters: { startDate, endDate },
    timestamp: new Date().toISOString()
  },
  DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
});
```

**Input Validation:**
```typescript
const FilterSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  employmentStatus: TrangThaiLamViecSchema.optional(),
  activityType: LoaiHoatDongSchema.optional(),
});

// In API route
const filters = FilterSchema.parse({
  startDate: searchParams.get('startDate'),
  endDate: searchParams.get('endDate'),
  // ...
});
```

---

### 8. Responsive Design Strategy

**Desktop (≥1024px):**
- Two-column layout: filters sidebar (25%) + main content (75%)
- Full-size charts (300-400px height)
- Horizontal tab navigation

**Tablet (768px - 1023px):**
- Single column layout
- Collapsible filter panel
- Medium charts (250-300px height)

**Mobile (<768px):**
- Vertical card stacking
- Bottom sheet for filters
- Simplified charts (200-250px height)
- Tab navigation converted to dropdown selector

**Implementation:**
```tsx
const isDesktop = useMediaQuery('(min-width: 1024px)');
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

return (
  <div className={cn(
    "grid gap-6",
    isDesktop && "grid-cols-[300px_1fr]",
    "grid-cols-1"
  )}>
    {/* Filters */}
    {isDesktop ? (
      <aside className="space-y-4">
        <DateRangeFilter {...} />
        <EmploymentStatusFilter {...} />
      </aside>
    ) : (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Bộ lọc
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          {/* Filters content */}
        </SheetContent>
      </Sheet>
    )}

    {/* Main content */}
    <main>
      {/* Charts and tables */}
    </main>
  </div>
);
```

---

### 9. Performance Optimization

**Database Indexing:**
```sql
-- Ensure these indexes exist for report queries
CREATE INDEX IF NOT EXISTS idx_ghinhanhoatdong_manhanvien_ngaybatdau
  ON "GhiNhanHoatDong" ("MaNhanVien", "NgayBatDau");

CREATE INDEX IF NOT EXISTS idx_ghinhanhoatdong_trangthaiduyet
  ON "GhiNhanHoatDong" ("TrangThaiDuyet");

CREATE INDEX IF NOT EXISTS idx_nhanvien_madonvi
  ON "NhanVien" ("MaDonVi");
```

**React Query Caching:**
```typescript
// 30s stale time for report data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      cacheTime: 300000, // 5 minutes
    },
  },
});
```

**Code Splitting:**
```typescript
// Lazy load chart components
const ComplianceReport = dynamic(
  () => import('@/components/reports/compliance-report'),
  { loading: () => <DashboardCardSkeleton lines={5} /> }
);
```

---

### 10. Accessibility Checklist

- [ ] All charts have `aria-label` describing content
- [ ] Chart tooltips are keyboard accessible
- [ ] Color is not the only indicator (use patterns/labels too)
- [ ] Focus indicators visible on interactive elements
- [ ] Tab navigation order is logical
- [ ] Screen reader announces loading/error states
- [ ] Date pickers support keyboard input
- [ ] Chart data available in table format as fallback

---

## Open Questions

1. **Historical Data**: Do we need to store monthly snapshots for trend analysis, or calculate trends from existing activity data?
   - **Recommendation**: Start with calculated trends, add snapshots if performance degrades

2. **Date Range Defaults**: What should be the default date range?
   - **Recommendation**: Last 30 days for Activity/Compliance reports, Current cycle for Practitioner Detail

3. **Pagination**: Should practitioner detail report paginate if >100 practitioners?
   - **Recommendation**: Yes, use server-side pagination similar to practitioners list

4. **Export Priority**: When should we implement file exports (Phase 5)?
   - **Recommendation**: After Phase 3 completion and user feedback collection

---

## References

- Shadcn/ui Charts: https://ui.shadcn.com/docs/components/chart
- Recharts Documentation: https://recharts.org/
- Existing metrics API: `src/app/api/units/[id]/metrics/route.ts`
- TanStack Query: https://tanstack.com/query/latest
