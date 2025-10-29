import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Only SoYTe role can access units performance
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SoYTe access required' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering and sorting
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const sortBy = searchParams.get('sortBy') || 'name'; // name, compliance, practitioners
    const sortOrder = searchParams.get('sortOrder') || 'asc'; // asc, desc

    // Get performance metrics for all units (excluding SoYTe admin units)
    const unitsResult = await db.query(`
      SELECT 
        dv."MaDonVi",
        dv."TenDonVi",
        dv."CapQuanLy",
        COUNT(DISTINCT nv."MaNhanVien") as total_practitioners,
        COUNT(DISTINCT CASE WHEN nv."TrangThaiLamViec" = 'DangLamViec' THEN nv."MaNhanVien" END) as active_practitioners,
        COUNT(DISTINCT CASE 
          WHEN kc."TrangThai" = 'DangDienRa' 
          AND (
            SELECT COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0)
            FROM "GhiNhanHoatDong" g
            WHERE g."MaNhanVien" = nv."MaNhanVien"
            AND g."TrangThaiDuyet" = 'DaDuyet'
            AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
          ) >= kc."SoTinChiYeuCau"
          THEN nv."MaNhanVien" 
        END) as compliant_practitioners,
        COUNT(DISTINCT CASE 
          WHEN g."TrangThaiDuyet" = 'ChoDuyet' 
          THEN g."MaGhiNhan" 
        END) as pending_approvals,
        COALESCE(SUM(CASE 
          WHEN g."TrangThaiDuyet" = 'DaDuyet' 
          THEN g."SoGioTinChiQuyDoi" 
          ELSE 0 
        END), 0) as total_credits
      FROM "DonVi" dv
      LEFT JOIN "NhanVien" nv ON dv."MaDonVi" = nv."MaDonVi"
      LEFT JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
      LEFT JOIN "GhiNhanHoatDong" g ON nv."MaNhanVien" = g."MaNhanVien"
      WHERE dv."TrangThai" = 'HoatDong'
        AND dv."CapQuanLy" != 'SoYTe'
        ${search ? `AND LOWER(dv."TenDonVi") LIKE '%${search}%'` : ''}
      GROUP BY dv."MaDonVi", dv."TenDonVi", dv."CapQuanLy"
    `);

    // Parse and calculate metrics
    let units = unitsResult.map((row: any) => {

      const active = parseInt(row.active_practitioners || '0');
      const compliant = parseInt(row.compliant_practitioners || '0');
      const complianceRate = active > 0 ? Math.round((compliant / active) * 100) : 0;

      return {
        id: row.MaDonVi,
        name: row.TenDonVi,
        type: row.CapQuanLy,
        totalPractitioners: parseInt(row.total_practitioners || '0'),
        activePractitioners: active,
        compliantPractitioners: compliant,
        complianceRate,
        pendingApprovals: parseInt(row.pending_approvals || '0'),
        totalCredits: parseFloat(row.total_credits || '0')
      };
    });

    // Apply server-side sorting
    units.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'compliance':
          comparison = a.complianceRate - b.complianceRate;
          break;
        case 'practitioners':
          comparison = a.activePractitioners - b.activePractitioners;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return NextResponse.json({
      success: true,
      data: units
    });

  } catch (error) {
    console.error('Error fetching units performance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
