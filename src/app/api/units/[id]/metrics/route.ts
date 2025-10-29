import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { perfMonitor } from '@/lib/performance';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/units/[id]/metrics - Get unit metrics
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const timer = perfMonitor.startTimer();
  
  try {
    const session = await requireAuth();
    const { id: unitId } = await params;

    // Authorization: Only SoYTe or the unit's own admin can access
    if (session.user.role !== 'SoYTe' && session.user.unitId !== unitId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Optimized single query using CTEs to fetch all metrics at once
    // This reduces 7 sequential queries to 1 for ~85% reduction in DB round-trips
    const queryStartTime = performance.now();
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
      -- CTE 2: Activity approval counts
      approval_counts AS (
        SELECT 
          COUNT(*) FILTER (WHERE g."TrangThaiDuyet" = 'ChoDuyet') as pending_approvals,
          COUNT(*) FILTER (
            WHERE g."TrangThaiDuyet" = 'DaDuyet' 
            AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE)
          ) as approved_this_month,
          COUNT(*) FILTER (
            WHERE g."TrangThaiDuyet" = 'TuChoi' 
            AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE)
          ) as rejected_this_month
        FROM "GhiNhanHoatDong" g
        INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
        WHERE n."MaDonVi" = $1
      ),
      -- CTE 3: Credit calculations for compliance
      practitioner_credits AS (
        SELECT 
          n."MaNhanVien",
          COALESCE(SUM(g."SoTinChi"), 0) as total_credits
        FROM "NhanVien" n
        LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien" 
          AND g."TrangThaiDuyet" = 'DaDuyet'
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
        COALESCE(ac.approved_this_month, 0) as approved_this_month,
        COALESCE(ac.rejected_this_month, 0) as rejected_this_month,
        cs.compliant_count,
        cs.at_risk_count,
        cs.total_count
      FROM practitioner_counts pc
      CROSS JOIN approval_counts ac
      CROSS JOIN compliance_stats cs`,
      [unitId]
    );
    const queryDuration = performance.now() - queryStartTime;

    const result = metricsResult[0] || {};
    const totalPractitioners = parseInt(result.total_practitioners || '0');
    const activePractitioners = parseInt(result.active_practitioners || '0');
    const pendingApprovals = parseInt(result.pending_approvals || '0');
    const approvedThisMonth = parseInt(result.approved_this_month || '0');
    const rejectedThisMonth = parseInt(result.rejected_this_month || '0');
    const compliantCount = parseInt(result.compliant_count || '0');
    const atRiskPractitioners = parseInt(result.at_risk_count || '0');
    const totalCount = parseInt(result.total_count || '1');
    const complianceRate = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    const metrics = {
      totalPractitioners,
      activePractitioners,
      complianceRate,
      pendingApprovals,
      approvedThisMonth,
      rejectedThisMonth,
      atRiskPractitioners
    };

    const totalDuration = timer();
    
    // Log performance metrics
    perfMonitor.log({
      endpoint: `/api/units/${unitId}/metrics`,
      method: 'GET',
      duration: totalDuration,
      timestamp: new Date(),
      status: 200,
      metadata: { queryDuration: queryDuration.toFixed(2) + 'ms' }
    });

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching unit metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
