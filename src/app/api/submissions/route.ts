/**
 * Activity Submission API Routes
 * Handles activity submission creation and listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo, danhMucHoatDongRepo, nhanVienRepo } from '@/lib/db/repositories';
import { CreateGhiNhanHoatDong } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/submissions - List activity submissions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const practitionerId = searchParams.get('practitionerId');
    const unitId = searchParams.get('unitId');

    let submissions;

    // Role-based access control
    if (user.role === 'NguoiHanhNghe') {
      // Practitioners can only see their own submissions
      const practitioner = await nhanVienRepo.findByUnit(user.unitId || '');
      const userPractitioner = practitioner.find(p => p.Email === user.username);
      
      if (!userPractitioner) {
        return NextResponse.json(
          { error: 'Practitioner profile not found' },
          { status: 404 }
        );
      }

      submissions = await ghiNhanHoatDongRepo.findByPractitioner(
        userPractitioner.MaNhanVien,
        limit
      );
    } else if (user.role === 'DonVi') {
      // Unit admins can see submissions from their unit
      const targetUnitId = unitId || user.unitId;
      
      if (practitionerId) {
        submissions = await ghiNhanHoatDongRepo.findByPractitioner(practitionerId, limit);
      } else {
        submissions = await ghiNhanHoatDongRepo.findPendingApprovals(targetUnitId || undefined);
      }
    } else if (user.role === 'SoYTe') {
      // DoH admins can see all submissions
      if (practitionerId) {
        submissions = await ghiNhanHoatDongRepo.findByPractitioner(practitionerId, limit);
      } else if (unitId) {
        submissions = await ghiNhanHoatDongRepo.findPendingApprovals(unitId);
      } else {
        submissions = await ghiNhanHoatDongRepo.findPendingApprovals();
      }
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      submissions = submissions.filter(s => s.TrangThaiDuyet === status);
    }

    // Get additional data for each submission
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        const practitioner = await nhanVienRepo.findById(submission.MaNhanVien);
        const activity = submission.MaDanhMuc 
          ? await danhMucHoatDongRepo.findById(submission.MaDanhMuc)
          : null;

        return {
          ...submission,
          practitioner: practitioner ? {
            HoVaTen: practitioner.HoVaTen,
            SoCCHN: practitioner.SoCCHN,
            ChucDanh: practitioner.ChucDanh,
          } : null,
          activityCatalog: activity ? {
            TenDanhMuc: activity.TenDanhMuc,
            LoaiHoatDong: activity.LoaiHoatDong,
          } : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedSubmissions,
      pagination: {
        page,
        limit,
        total: enrichedSubmissions.length,
      },
    });

  } catch (error) {
    console.error('Submissions listing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/submissions - Create new activity submission
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only practitioners and unit admins can submit activities
    if (!['NguoiHanhNghe', 'DonVi'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input data using SubmitActivitySchema
    const submissionSchema = z.object({
      MaNhanVien: z.string().uuid(),
      MaDanhMuc: z.string().uuid().nullable().optional(),
      TenHoatDong: z.string().min(1, 'Activity name is required'),
      HinhThucCapNhatKienThucYKhoa: z.string().nullable().optional(),
      ChiTietVaiTro: z.string().nullable().optional(),
      DonViToChuc: z.string().nullable().optional(),
      NgayBatDau: z.string().nullable().optional(), // ISO date string
      NgayKetThuc: z.string().nullable().optional(), // ISO date string
      SoTiet: z.number().min(0).nullable().optional(),
      SoGioTinChiQuyDoi: z.number().min(0).nullable().optional(),
      BangChungSoGiayChungNhan: z.string().nullable().optional(),
      FileMinhChungUrl: z.string().nullable().optional(),
      GhiChuDuyet: z.string().nullable().optional(),
    });

    const validatedData = submissionSchema.parse(body);

    // Find practitioner
    let practitionerId = validatedData.MaNhanVien;
    
    if (user.role === 'NguoiHanhNghe') {
      // For practitioners, find their own profile
      const practitioners = await nhanVienRepo.findByUnit(user.unitId || '');
      const userPractitioner = practitioners.find(p => p.Email === user.username);
      
      if (!userPractitioner) {
        return NextResponse.json(
          { error: 'Practitioner profile not found' },
          { status: 404 }
        );
      }
      
      practitionerId = userPractitioner.MaNhanVien;
    }

    // Calculate credits based on activity catalog or manual entry
    let calculatedCredits = validatedData.SoGioTinChiQuyDoi || 0;
    
    if (validatedData.MaDanhMuc) {
      const activityCatalog = await danhMucHoatDongRepo.findById(validatedData.MaDanhMuc);
      if (activityCatalog && validatedData.SoTiet) {
        calculatedCredits = validatedData.SoTiet * activityCatalog.TyLeQuyDoi;
      }
    }

    // Create submission with new schema
    const submissionData = {
      MaNhanVien: practitionerId,
      MaDanhMuc: validatedData.MaDanhMuc || null,
      TenHoatDong: validatedData.TenHoatDong,
      FileMinhChungUrl: validatedData.FileMinhChungUrl || null,
      NguoiNhap: user.id,
      TrangThaiDuyet: 'ChoDuyet' as const,
      GhiChuDuyet: validatedData.GhiChuDuyet || null,
      // Extended fields from Migration 003
      HinhThucCapNhatKienThucYKhoa: validatedData.HinhThucCapNhatKienThucYKhoa || null,
      ChiTietVaiTro: validatedData.ChiTietVaiTro || null,
      DonViToChuc: validatedData.DonViToChuc || null,
      NgayBatDau: validatedData.NgayBatDau ? new Date(validatedData.NgayBatDau) : null,
      NgayKetThuc: validatedData.NgayKetThuc ? new Date(validatedData.NgayKetThuc) : null,
      SoTiet: validatedData.SoTiet || null,
      SoGioTinChiQuyDoi: calculatedCredits,
      BangChungSoGiayChungNhan: validatedData.BangChungSoGiayChungNhan || null,
    } as any; // Temporary workaround for type mismatch

    const submission = await ghiNhanHoatDongRepo.create(submissionData);

    // Get enriched submission data
    const practitioner = await nhanVienRepo.findById(submission.MaNhanVien);
    const activityCatalog = submission.MaDanhMuc 
      ? await danhMucHoatDongRepo.findById(submission.MaDanhMuc)
      : null;

    const enrichedSubmission = {
      ...submission,
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

    return NextResponse.json({
      submission: enrichedSubmission,
      message: 'Activity submitted successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Activity submission error:', error);
    
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