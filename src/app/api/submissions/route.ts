/**
 * Activity Submission API Routes
 * Handles activity submission creation and listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo, danhMucHoatDongRepo, nhanVienRepo } from '@/lib/db/repositories';
import { CreateGhiNhanHoatDongSchema } from '@/lib/db/schemas';
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
      if (practitionerId) {
        submissions = await ghiNhanHoatDongRepo.findByPractitioner(practitionerId, limit);
      } else {
        submissions = await ghiNhanHoatDongRepo.findPendingApprovals(user.unitId || undefined);
      }
    } else if (user.role === 'SoYTe') {
      // DoH admins can see all submissions
      if (practitionerId) {
        submissions = await ghiNhanHoatDongRepo.findByPractitioner(practitionerId, limit);
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
      submissions: enrichedSubmissions,
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

    // Validate input data
    const submissionSchema = CreateGhiNhanHoatDongSchema.extend({
      // Allow custom activity name if no catalog activity is selected
      TenHoatDong: z.string().min(1, 'Activity name is required'),
      // File upload information
      evidenceFiles: z.array(z.object({
        filename: z.string(),
        originalName: z.string(),
        size: z.number(),
        mimeType: z.string(),
        checksum: z.string(),
      })).optional(),
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
    let calculatedCredits = validatedData.SoTinChiQuyDoi;
    
    if (validatedData.MaDanhMuc) {
      const activityCatalog = await danhMucHoatDongRepo.findById(validatedData.MaDanhMuc);
      if (activityCatalog && validatedData.SoGio) {
        calculatedCredits = validatedData.SoGio * activityCatalog.TyLeQuyDoi;
      }
    }

    // Handle evidence file information
    let evidenceFileUrl = null;
    let evidenceFileETag = null;
    let evidenceFileSha256 = null;
    let evidenceFileSize = null;

    if (validatedData.evidenceFiles && validatedData.evidenceFiles.length > 0) {
      const primaryFile = validatedData.evidenceFiles[0];
      evidenceFileUrl = `/api/files/${primaryFile.filename}`;
      evidenceFileSha256 = primaryFile.checksum;
      evidenceFileSize = primaryFile.size;
    }

    // Create submission
    const submissionData = {
      MaNhanVien: practitionerId,
      MaDanhMuc: validatedData.MaDanhMuc,
      TenHoatDong: validatedData.TenHoatDong,
      VaiTro: validatedData.VaiTro,
      ThoiGianBatDau: validatedData.ThoiGianBatDau,
      ThoiGianKetThuc: validatedData.ThoiGianKetThuc,
      SoGio: validatedData.SoGio,
      SoTinChiQuyDoi: calculatedCredits,
      FileMinhChungUrl: evidenceFileUrl,
      FileMinhChungETag: evidenceFileETag,
      FileMinhChungSha256: evidenceFileSha256,
      FileMinhChungSize: evidenceFileSize,
      NguoiNhap: user.id,
      TrangThaiDuyet: 'ChoDuyet' as const,
      ThoiGianDuyet: null,
      GhiChu: validatedData.GhiChu,
    };

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