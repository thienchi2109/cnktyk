/**
 * API Route: /api/credits/statistics
 * Get compliance statistics for multiple practitioners (unit/department dashboards)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getComplianceStatistics } from '@/lib/db/credit-engine';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId');
    const userRole = session.user.role;
    const userUnitId = session.user.unitId;

    // Get practitioner IDs based on role and filters
    let practitionerIds: string[] = [];

    if (userRole === 'SoYTe') {
      // Department of Health can view all or filter by unit
      if (unitId) {
        const result = await db.query<{ MaNhanVien: string }>(
          `SELECT "MaNhanVien" FROM "NhanVien" 
           WHERE "MaDonVi" = $1 AND "TrangThaiLamViec" = 'DangLamViec'`,
          [unitId]
        );
        practitionerIds = result.map(r => r.MaNhanVien);
      } else {
        const result = await db.query<{ MaNhanVien: string }>(
          `SELECT "MaNhanVien" FROM "NhanVien" 
           WHERE "TrangThaiLamViec" = 'DangLamViec'`
        );
        practitionerIds = result.map(r => r.MaNhanVien);
      }
    } else if (userRole === 'DonVi') {
      // Unit admins can only view their unit
      const result = await db.query<{ MaNhanVien: string }>(
        `SELECT "MaNhanVien" FROM "NhanVien" 
         WHERE "MaDonVi" = $1 AND "TrangThaiLamViec" = 'DangLamViec'`,
        [userUnitId]
      );
      practitionerIds = result.map(r => r.MaNhanVien);
    } else if (userRole === 'Auditor') {
      // Auditors can view all
      if (unitId) {
        const result = await db.query<{ MaNhanVien: string }>(
          `SELECT "MaNhanVien" FROM "NhanVien" 
           WHERE "MaDonVi" = $1 AND "TrangThaiLamViec" = 'DangLamViec'`,
          [unitId]
        );
        practitionerIds = result.map(r => r.MaNhanVien);
      } else {
        const result = await db.query<{ MaNhanVien: string }>(
          `SELECT "MaNhanVien" FROM "NhanVien" 
           WHERE "TrangThaiLamViec" = 'DangLamViec'`
        );
        practitionerIds = result.map(r => r.MaNhanVien);
      }
    } else {
      // Practitioners cannot access statistics
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' } },
        { status: 403 }
      );
    }

    // Get compliance statistics
    const statistics = await getComplianceStatistics(practitionerIds);

    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching compliance statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi lấy thống kê tuân thủ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
