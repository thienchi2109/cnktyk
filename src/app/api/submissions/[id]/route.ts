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

// PATCH /api/submissions/[id] - Edit submission data (DonVi only, ChoDuyet status only)
export async function PATCH(
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

    // Only DonVi role can edit submissions
    if (user.role !== 'DonVi') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only unit admins can edit submissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input - define editable fields
    const editSchema = z.object({
      TenHoatDong: z.string().min(1, 'Activity name is required').optional(),
      VaiTro: z.string().nullable().optional(),
      HinhThucCapNhatKienThucYKhoa: z.string().nullable().optional(),
      ChiTietVaiTro: z.string().nullable().optional(),
      DonViToChuc: z.string().nullable().optional(),
      NgayBatDau: z.string().transform(val => val ? new Date(val) : null).optional(),
      NgayKetThuc: z.string().transform(val => val ? new Date(val) : null).optional(),
      SoTiet: z.number().min(0).nullable().optional(),
      BangChungSoGiayChungNhan: z.string().nullable().optional(),
      SoGioTinChiQuyDoi: z.number().min(0, 'Credits must be non-negative').optional(),
      FileMinhChungUrl: z.string().url().nullable().or(z.literal('')).optional(),
      FileMinhChungETag: z.string().nullable().optional(),
      FileMinhChungSha256: z.string().nullable().optional(),
      FileMinhChungSize: z.number().int().min(0).nullable().optional(),
      MaDanhMuc: z.string().uuid().nullable().optional(),
    }).refine(
      (data) => {
        if (data.NgayBatDau && data.NgayKetThuc) {
          return data.NgayKetThuc >= data.NgayBatDau;
        }
        return true;
      },
      {
        message: 'End time must be after start time',
        path: ['NgayKetThuc'],
      }
    );

    const validatedData = editSchema.parse(body);

    // Get original submission for audit logging
    const originalSubmission = await ghiNhanHoatDongRepo.findById(id);
    if (!originalSubmission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Call repository method with tenant isolation
    const result = await ghiNhanHoatDongRepo.updateSubmission(
      id,
      validatedData,
      user.unitId
    );

    if (!result.success) {
      const statusCode = 
        result.error?.includes('not found') ? 404 :
        result.error?.includes('Access denied') ? 403 :
        result.error?.includes('pending') ? 400 :
        result.error?.includes('No valid fields to update') ? 400 : 500;

      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    // Audit logging - capture before/after state
    const changedFields = Object.keys(validatedData).filter(key => {
      const oldVal = (originalSubmission as any)[key];
      const newVal = (validatedData as any)[key];
      return oldVal !== newVal;
    });

    if (changedFields.length > 0) {
      const { nhatKyHeThongRepo } = await import('@/lib/db/repositories');
      const beforeState: Record<string, any> = {};
      const afterState: Record<string, any> = {};

      changedFields.forEach(field => {
        beforeState[field] = (originalSubmission as any)[field];
        afterState[field] = (validatedData as any)[field];
      });

      await nhatKyHeThongRepo.logAction(
        user.id,
        'SUA_GHI_NHAN_HOAT_DONG',
        'GhiNhanHoatDong',
        id,
        {
          MaGhiNhan: id,
          before: beforeState,
          after: afterState,
          changedFields,
        },
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      );
    }

    // Get enriched data for response
    const practitioner = await nhanVienRepo.findById(result.submission!.MaNhanVien);
    const activityCatalog = result.submission!.MaDanhMuc 
      ? await danhMucHoatDongRepo.findById(result.submission!.MaDanhMuc)
      : null;

    const enrichedSubmission = {
      ...result.submission,
      practitioner: practitioner ? {
        HoVaTen: practitioner.HoVaTen,
        SoCCHN: practitioner.SoCCHN,
        ChucDanh: practitioner.ChucDanh,
        Email: practitioner.Email,
        DienThoai: practitioner.DienThoai,
      } : null,
      activityCatalog: activityCatalog ? {
        TenDanhMuc: activityCatalog.TenDanhMuc,
        LoaiHoatDong: activityCatalog.LoaiHoatDong,
        TyLeQuyDoi: activityCatalog.TyLeQuyDoi,
      } : null,
    };

    return NextResponse.json({
      submission: enrichedSubmission,
      message: 'Submission updated successfully',
    });

  } catch (error) {
    console.error('Submission edit error:', error);
    
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
