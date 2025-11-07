import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Only SoYTe role can access system-wide metrics
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SoYTe access required' },
        { status: 403 }
      );
    }

    // Get system-wide statistics
    const [
      totalUnitsResult,
      totalPractitionersResult,
      activePractitionersResult,
      totalSubmissionsResult,
      pendingApprovalsResult,
      approvedThisMonthResult,
      rejectedThisMonthResult,
      totalCreditsResult
    ] = await Promise.all([
      // Total units (exclude supervising SoYTe department units from KPI count)
      db.query(
        'SELECT COUNT(*) as count FROM "DonVi" WHERE "TrangThai" = $1 AND "CapQuanLy" != $2',
        ['HoatDong', 'SoYTe'],
      ),
      
      // Total practitioners
      db.query('SELECT COUNT(*) as count FROM "NhanVien"'),
      
      // Active practitioners
      db.query('SELECT COUNT(*) as count FROM "NhanVien" WHERE "TrangThaiLamViec" = $1', ['DangLamViec']),
      
      // Total submissions
      db.query('SELECT COUNT(*) as count FROM "GhiNhanHoatDong"'),
      
      // Pending approvals
      db.query('SELECT COUNT(*) as count FROM "GhiNhanHoatDong" WHERE "TrangThaiDuyet" = $1', ['ChoDuyet']),
      
      // Approved this month
      db.query(`
        SELECT COUNT(*) as count 
        FROM "GhiNhanHoatDong" 
        WHERE "TrangThaiDuyet" = $1 
        AND "NgayDuyet" >= date_trunc('month', CURRENT_DATE)
      `, ['DaDuyet']),
      
      // Rejected this month
      db.query(`
        SELECT COUNT(*) as count 
        FROM "GhiNhanHoatDong" 
        WHERE "TrangThaiDuyet" = $1 
        AND "NgayDuyet" >= date_trunc('month', CURRENT_DATE)
      `, ['TuChoi']),
      
      // Total credits awarded (evidence-aware)
      db.query(
        `SELECT COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
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
          ), 0) as total
         FROM "GhiNhanHoatDong" g
         LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
         WHERE g."TrangThaiDuyet" = $1`,
        ['DaDuyet']
      )
    ]);

    // Calculate compliance rate
    const complianceResult = await db.query(`
      SELECT 
        COUNT(DISTINCT nv."MaNhanVien") as compliant_count
      FROM "NhanVien" nv
      INNER JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
      WHERE kc."TrangThai" = 'DangDienRa'
      AND (
        SELECT COALESCE(SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND (
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
        ), 0)
        FROM "GhiNhanHoatDong" g
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        WHERE g."MaNhanVien" = nv."MaNhanVien"
        AND g."TrangThaiDuyet" = 'DaDuyet'
        AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
      ) >= kc."SoTinChiYeuCau"
    `);

    const totalActive = parseInt((activePractitionersResult[0] as any)?.count || '0');
    const compliantCount = parseInt((complianceResult[0] as any)?.compliant_count || '0');
    const complianceRate = totalActive > 0 ? Math.round((compliantCount / totalActive) * 100) : 0;

    // Get at-risk practitioners (< 70% progress with < 6 months remaining)
    const atRiskResult = await db.query(`
      SELECT COUNT(DISTINCT nv."MaNhanVien") as count
      FROM "NhanVien" nv
      INNER JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
      WHERE kc."TrangThai" = 'DangDienRa'
      AND kc."NgayKetThuc" <= CURRENT_DATE + INTERVAL '6 months'
      AND (
        SELECT COALESCE(SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND (
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
        ), 0)
        FROM "GhiNhanHoatDong" g
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        WHERE g."MaNhanVien" = nv."MaNhanVien"
        AND g."TrangThaiDuyet" = 'DaDuyet'
        AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
      ) < (kc."SoTinChiYeuCau" * 0.7)
    `);

    const metrics = {
      totalUnits: parseInt((totalUnitsResult[0] as any)?.count || '0'),
      totalPractitioners: parseInt((totalPractitionersResult[0] as any)?.count || '0'),
      activePractitioners: totalActive,
      complianceRate,
      totalSubmissions: parseInt((totalSubmissionsResult[0] as any)?.count || '0'),
      pendingApprovals: parseInt((pendingApprovalsResult[0] as any)?.count || '0'),
      approvedThisMonth: parseInt((approvedThisMonthResult[0] as any)?.count || '0'),
      rejectedThisMonth: parseInt((rejectedThisMonthResult[0] as any)?.count || '0'),
      totalCreditsAwarded: parseFloat((totalCreditsResult[0] as any)?.total || '0'),
      atRiskPractitioners: parseInt((atRiskResult[0] as any)?.count || '0')
    };

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
