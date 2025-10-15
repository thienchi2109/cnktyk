import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

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

    // Get total practitioners in unit
    const totalPractitionersResult: any = await db.query(
      `SELECT COUNT(*) as count FROM "NhanVien" WHERE "MaDonVi" = $1`,
      [unitId]
    );
    const totalPractitioners = parseInt(totalPractitionersResult[0]?.count || '0');

    // Get active practitioners
    const activePractitionersResult: any = await db.query(
      `SELECT COUNT(*) as count FROM "NhanVien" 
       WHERE "MaDonVi" = $1 AND "TrangThaiLamViec" = 'DangLamViec'`,
      [unitId]
    );
    const activePractitioners = parseInt(activePractitionersResult[0]?.count || '0');

    // Get pending approvals count
    const pendingApprovalsResult: any = await db.query(
      `SELECT COUNT(*) as count FROM "GhiNhanHoatDong" g
       INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
       WHERE n."MaDonVi" = $1 AND g."TrangThaiDuyet" = 'ChoDuyet'`,
      [unitId]
    );
    const pendingApprovals = parseInt(pendingApprovalsResult[0]?.count || '0');

    // Get approved this month
    const approvedThisMonthResult: any = await db.query(
      `SELECT COUNT(*) as count FROM "GhiNhanHoatDong" g
       INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
       WHERE n."MaDonVi" = $1 
       AND g."TrangThaiDuyet" = 'DaDuyet'
       AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE)`,
      [unitId]
    );
    const approvedThisMonth = parseInt(approvedThisMonthResult[0]?.count || '0');

    // Get rejected this month
    const rejectedThisMonthResult: any = await db.query(
      `SELECT COUNT(*) as count FROM "GhiNhanHoatDong" g
       INNER JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
       WHERE n."MaDonVi" = $1 
       AND g."TrangThaiDuyet" = 'TuChoi'
       AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE)`,
      [unitId]
    );
    const rejectedThisMonth = parseInt(rejectedThisMonthResult[0]?.count || '0');

    // Calculate compliance rate (practitioners with >= 90% credits)
    // This is a simplified calculation - in production, you'd want to calculate based on actual cycles
    const complianceResult: any = await db.query(
      `SELECT 
        COUNT(CASE WHEN total_credits >= 108 THEN 1 END) as compliant_count,
        COUNT(*) as total_count
       FROM (
         SELECT 
           n."MaNhanVien",
           COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as total_credits
         FROM "NhanVien" n
         LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien" 
           AND g."TrangThaiDuyet" = 'DaDuyet'
         WHERE n."MaDonVi" = $1 AND n."TrangThaiLamViec" = 'DangLamViec'
         GROUP BY n."MaNhanVien"
       ) as practitioner_credits`,
      [unitId]
    );
    
    const compliantCount = parseInt(complianceResult[0]?.compliant_count || '0');
    const totalCount = parseInt(complianceResult[0]?.total_count || '1');
    const complianceRate = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    // Get at-risk practitioners (< 70% credits)
    const atRiskResult: any = await db.query(
      `SELECT COUNT(*) as count
       FROM (
         SELECT 
           n."MaNhanVien",
           COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as total_credits
         FROM "NhanVien" n
         LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien" 
           AND g."TrangThaiDuyet" = 'DaDuyet'
         WHERE n."MaDonVi" = $1 AND n."TrangThaiLamViec" = 'DangLamViec'
         GROUP BY n."MaNhanVien"
         HAVING COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) < 84
       ) as at_risk_practitioners`,
      [unitId]
    );
    const atRiskPractitioners = parseInt(atRiskResult[0]?.count || '0');

    const metrics = {
      totalPractitioners,
      activePractitioners,
      complianceRate,
      pendingApprovals,
      approvedThisMonth,
      rejectedThisMonth,
      atRiskPractitioners
    };

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
