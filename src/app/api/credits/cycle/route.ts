/**
 * API Route: /api/credits/cycle
 * Get compliance cycle information for a practitioner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getCurrentCycle, getCreditSummaryByType, getCreditHistory } from '@/lib/db/credit-engine';

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
    const practitionerId = searchParams.get('practitionerId');

    if (!practitionerId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PRACTITIONER_ID', message: 'Thiếu mã nhân viên' } },
        { status: 400 }
      );
    }

    // Authorization check
    const userRole = session.user.role;
    const userUnitId = session.user.unitId;

    if (userRole === 'NguoiHanhNghe') {
      // Practitioners can only view their own cycle
      if (session.user.id !== practitionerId) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' } },
          { status: 403 }
        );
      }
    } else if (userRole === 'DonVi') {
      // Unit admins can only view practitioners in their unit
      // We need to verify the practitioner belongs to their unit
      const { db } = await import('@/lib/db/client');
      const practitioner = await db.query(
        `SELECT "MaDonVi" FROM "NhanVien" WHERE "MaNhanVien" = $1`,
        [practitionerId]
      );

      if (practitioner.length === 0 || practitioner[0].MaDonVi !== userUnitId) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' } },
          { status: 403 }
        );
      }
    }
    // SoYTe and Auditor roles have full access

    // Get cycle information
    const cycle = await getCurrentCycle(practitionerId);
    if (!cycle) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_CYCLE', message: 'Không tìm thấy chu kỳ tuân thủ' } },
        { status: 404 }
      );
    }

    // Get credit summary by type
    const creditSummary = await getCreditSummaryByType(
      practitionerId,
      cycle.NgayBatDau,
      cycle.NgayKetThuc
    );

    // Get credit history
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const creditHistory = includeHistory
      ? await getCreditHistory(practitionerId, cycle.NgayBatDau, cycle.NgayKetThuc)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        cycle,
        creditSummary,
        creditHistory: includeHistory ? creditHistory : undefined
      }
    });
  } catch (error) {
    console.error('Error fetching cycle information:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi lấy thông tin chu kỳ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
