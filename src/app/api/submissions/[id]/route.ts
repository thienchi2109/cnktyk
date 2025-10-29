/**
 * Individual Activity Submission API Routes
 * Handles submission details, approval, and rejection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo, nhanVienRepo, danhMucHoatDongRepo } from '@/lib/db/repositories';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/submissions/[id] - Get submission details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const submission = await ghiNhanHoatDongRepo.findById(id);

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const practitioner = await nhanVienRepo.findById(submission.MaNhanVien);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Practitioner not found' },
        { status: 404 }
      );
    }

    // Role-based access control
    if (user.role === 'NguoiHanhNghe') {
      // Practitioners can only see their own submissions
      if (practitioner.Email !== user.username) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DonVi') {
      // Unit admins can only see submissions from their unit
      if (practitioner.MaDonVi !== user.unitId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }
    // SoYTe can see all submissions

    // Get activity catalog info if available
    const activityCatalog = submission.MaDanhMuc 
      ? await danhMucHoatDongRepo.findById(submission.MaDanhMuc)
      : null;

    const enrichedSubmission = {
      ...submission,
      practitioner: {
        HoVaTen: practitioner.HoVaTen,
        SoCCHN: practitioner.SoCCHN,
        ChucDanh: practitioner.ChucDanh,
        Email: practitioner.Email,
        DienThoai: practitioner.DienThoai,
      },
      activityCatalog: activityCatalog ? {
        TenDanhMuc: activityCatalog.TenDanhMuc,
        LoaiHoatDong: activityCatalog.LoaiHoatDong,
        TyLeQuyDoi: activityCatalog.TyLeQuyDoi,
        YeuCauMinhChung: activityCatalog.YeuCauMinhChung,
      } : null,
    };

    return NextResponse.json({ submission: enrichedSubmission });

  } catch (error) {
    console.error('Submission details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/submissions/[id] - Update submission (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only unit admins and DoH admins can approve/reject
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const updateSchema = z.object({
      action: z.enum(['approve', 'reject', 'request_info']),
      comments: z.string().optional(),
      reason: z.string().optional(),
    });

    const { action, comments, reason } = updateSchema.parse(body);

    const submission = await ghiNhanHoatDongRepo.findById(id);
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check if submission is still pending
    if (submission.TrangThaiDuyet !== 'ChoDuyet') {
      return NextResponse.json(
        { error: 'Submission has already been processed' },
        { status: 400 }
      );
    }

    // Check unit permissions for DonVi role
    if (user.role === 'DonVi') {
      const practitioner = await nhanVienRepo.findById(submission.MaNhanVien);
      if (!practitioner || practitioner.MaDonVi !== user.unitId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    let updatedSubmission;

    switch (action) {
      case 'approve':
        updatedSubmission = await ghiNhanHoatDongRepo.approveActivity(
          id,
          user.id,
          comments
        );
        break;

      case 'reject':
        if (!reason) {
          return NextResponse.json(
            { error: 'Rejection reason is required' },
            { status: 400 }
          );
        }
        updatedSubmission = await ghiNhanHoatDongRepo.rejectActivity(
          id,
          user.id,
          reason
        );
        break;

      case 'request_info':
        // For now, treat as rejection with specific comment
        updatedSubmission = await ghiNhanHoatDongRepo.rejectActivity(
          id,
          user.id,
          `Yêu cầu bổ sung thông tin: ${comments || 'Vui lòng cung cấp thêm thông tin'}`
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    // Get enriched data for response
    const practitioner = await nhanVienRepo.findById(updatedSubmission.MaNhanVien);
    const activityCatalog = updatedSubmission.MaDanhMuc 
      ? await danhMucHoatDongRepo.findById(updatedSubmission.MaDanhMuc)
      : null;

    const enrichedSubmission = {
      ...updatedSubmission,
      practitioner: practitioner ? {
        HoVaTen: practitioner.HoVaTen,
        SoCCHN: practitioner.SoCCHN,
        ChucDanh: practitioner.ChucDanh,
      } : null,
      activityCatalog: activityCatalog ? {
        TenDanhMuc: activityCatalog.TenDanhMuc,
        LoaiHoatDong: activityCatalog.LoaiHoatDong,
      } : null,
    };

    const actionMessages = {
      approve: 'Hoạt động đã được phê duyệt',
      reject: 'Hoạt động đã bị từ chối',
      request_info: 'Đã yêu cầu bổ sung thông tin',
    };

    return NextResponse.json({
      submission: enrichedSubmission,
      message: actionMessages[action],
    });

  } catch (error) {
    console.error('Submission update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/submissions/[id] - Delete submission (only if pending)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const submission = await ghiNhanHoatDongRepo.findById(id);

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const practitioner = await nhanVienRepo.findById(submission.MaNhanVien);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Practitioner not found' },
        { status: 404 }
      );
    }

    // Only allow deletion by the submitter or unit/DoH admins
    if (user.role === 'NguoiHanhNghe') {
      if (practitioner.Email !== user.username) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DonVi') {
      if (practitioner.MaDonVi !== user.unitId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Only allow deletion if submission is still pending
    if (submission.TrangThaiDuyet !== 'ChoDuyet') {
      return NextResponse.json(
        { error: 'Cannot delete processed submission' },
        { status: 400 }
      );
    }

    await ghiNhanHoatDongRepo.delete(id);

    return NextResponse.json({
      message: 'Submission deleted successfully',
    });

  } catch (error) {
    console.error('Submission deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}