import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { NhatKyHeThongRepository } from '@/lib/db/repositories';
import type { PerformanceSummaryData } from '@/types/reports';
import { z } from 'zod';

// Query parameter validation schema
const QuerySchema = z.object({
  period: z.enum(['current_month', 'last_month', 'current_quarter', 'last_quarter', 'custom']).optional().default('current_month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Helper function to calculate date ranges based on period
function calculateDateRange(period: string, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (period) {
    case 'current_month':
      return {
        start: new Date(currentYear, currentMonth, 1),
        end: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59),
      };
    case 'last_month':
      return {
        start: new Date(currentYear, currentMonth - 1, 1),
        end: new Date(currentYear, currentMonth, 0, 23, 59, 59),
      };
    case 'current_quarter': {
      const quarterStart = Math.floor(currentMonth / 3) * 3;
      return {
        start: new Date(currentYear, quarterStart, 1),
        end: new Date(currentYear, quarterStart + 3, 0, 23, 59, 59),
      };
    }
    case 'last_quarter': {
      const lastQuarterStart = Math.floor(currentMonth / 3) * 3 - 3;
      const year = lastQuarterStart < 0 ? currentYear - 1 : currentYear;
      const month = lastQuarterStart < 0 ? lastQuarterStart + 12 : lastQuarterStart;
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 3, 0, 23, 59, 59),
      };
    }
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires startDate and endDate');
      }
      return {
        start: new Date(customStart),
        end: new Date(customEnd),
      };
    default:
      return {
        start: new Date(currentYear, currentMonth, 1),
        end: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59),
      };
  }
}

// GET /api/reports/performance-summary
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await requireAuth();

    // 2. Role authorization - only DonVi role
    if (session.user.role !== 'DonVi') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 3. Validate query parameters
    const { searchParams } = new URL(request.url);
    const params = QuerySchema.parse({
      period: searchParams.get('period') || 'current_month',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    // 4. Calculate date range
    const { start, end } = calculateDateRange(params.period, params.startDate, params.endDate);

    // 5. Tenant isolation - use user's unit ID
    const unitId = session.user.unitId;
    if (!unitId) {
      return NextResponse.json(
        { success: false, error: 'User is not assigned to a unit' },
        { status: 400 }
      );
    }

    // 6. Fetch metrics using optimized CTE query (similar to /api/units/[id]/metrics)
    const metricsResult: any = await db.query(
      `WITH
      -- CTE 1: Practitioner counts by status
      practitioner_counts AS (
        SELECT
          COUNT(*) as total_practitioners,
          COUNT(*) FILTER (WHERE "TrangThaiLamViec" = 'DangLamViec') as active_practitioners
        FROM "NhanVien"
        WHERE "MaDonVi" = $1
      ),
      -- CTE 2: Activity approval counts for current period
      approval_counts_current AS (
        SELECT
          COUNT(*) FILTER (WHERE g."TrangThaiDuyet" = 'ChoDuyet') as pending_approvals,
          COUNT(*) FILTER (
            WHERE g."TrangThaiDuyet" = 'DaDuyet'
            AND g."NgayDuyet" >= $2
            AND g."NgayDuyet" <= $3
          ) as approved_activities,
          COUNT(*) FILTER (
            WHERE g."TrangThaiDuyet" = 'TuChoi'
            AND g."NgayDuyet" >= $2
            AND g."NgayDuyet" <= $3
          ) as rejected_activities
        FROM "GhiNhanHoatDong" g
        INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
        WHERE n."MaDonVi" = $1
      ),
      -- CTE 3: Credit calculations for compliance (overall, not time-bound)
      practitioner_credits AS (
        SELECT
          n."MaNhanVien",
          COALESCE(SUM(
            CASE
              WHEN (
                g."MaDanhMuc" IS NULL
                OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
              THEN g."SoGioTinChiQuyDoi"
              ELSE 0
            END
          ), 0) as total_credits
        FROM "NhanVien" n
        LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        WHERE n."MaDonVi" = $1 AND n."TrangThaiLamViec" = 'DangLamViec'
        GROUP BY n."MaNhanVien"
      ),
      -- CTE 4: Compliance aggregations
      compliance_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE total_credits >= 108) as compliant_count,
          COUNT(*) FILTER (WHERE total_credits < 84) as at_risk_count,
          COUNT(*) as total_count
        FROM practitioner_credits
      )
      -- Final SELECT: Combine all CTEs into single result
      SELECT
        pc.total_practitioners,
        pc.active_practitioners,
        COALESCE(ac.pending_approvals, 0) as pending_approvals,
        COALESCE(ac.approved_activities, 0) as approved_activities,
        COALESCE(ac.rejected_activities, 0) as rejected_activities,
        cs.compliant_count,
        cs.at_risk_count,
        cs.total_count
      FROM practitioner_counts pc
      CROSS JOIN approval_counts_current ac
      CROSS JOIN compliance_stats cs`,
      [unitId, start.toISOString(), end.toISOString()]
    );

    const result = metricsResult[0] || {};

    // 7. Parse and format results
    const totalPractitioners = parseInt(result.total_practitioners || '0');
    const activePractitioners = parseInt(result.active_practitioners || '0');
    const pendingApprovals = parseInt(result.pending_approvals || '0');
    const approvedActivities = parseInt(result.approved_activities || '0');
    const rejectedActivities = parseInt(result.rejected_activities || '0');
    const compliantCount = parseInt(result.compliant_count || '0');
    const atRiskCount = parseInt(result.at_risk_count || '0');
    const totalCount = parseInt(result.total_count || '1');
    const complianceRate = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    const currentPeriodData: PerformanceSummaryData['currentPeriod'] = {
      totalPractitioners,
      activePractitioners,
      complianceRate,
      pendingApprovals,
      approvedActivities,
      rejectedActivities,
      atRiskPractitioners: atRiskCount,
    };

    // 8. Build response
    const responseData: PerformanceSummaryData = {
      currentPeriod: currentPeriodData,
      // Comparison period and trends will be added in future iterations
    };

    // 9. Audit log
    const auditRepo = new NhatKyHeThongRepository();
    await auditRepo.create({
      MaTaiKhoan: session.user.id,
      HanhDong: 'VIEW_REPORT',
      Bang: 'Reports',
      KhoaChinh: 'performance-summary',
      NoiDung: {
        reportType: 'performance-summary',
        period: params.period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // 10. Return success response
    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching performance summary:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
