/**
 * Activity Submission API Routes
 * Handles activity submission creation and listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo, danhMucHoatDongRepo, nhanVienRepo } from '@/lib/db/repositories';
import { CreateGhiNhanHoatDong } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/submissions - List activity submissions with server-side filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || undefined;
    const searchTerm = searchParams.get('search') || undefined;
    const practitionerId = searchParams.get('practitionerId') || undefined;
    const unitId = searchParams.get('unitId') || undefined;

    // Build filters object with RBAC enforcement
    const filters: {
      status?: string;
      practitionerId?: string;
      unitId?: string;
      searchTerm?: string;
      page: number;
      limit: number;
    } = {
      page,
      limit,
      status,
      searchTerm,
    };

    // Apply Role-Based Access Control (RBAC) at database level
    if (user.role === 'NguoiHanhNghe') {
      // Practitioners can only see their own submissions
      // Prefer direct account -> practitioner mapping
      const { db } = await import('@/lib/db/client');
      const link = await db.queryOne<{ MaNhanVien: string }>(
        'SELECT "MaNhanVien" FROM "TaiKhoan" WHERE "MaTaiKhoan" = $1 AND "MaNhanVien" IS NOT NULL LIMIT 1',
        [user.id]
      );

      if (link?.MaNhanVien) {
        filters.practitionerId = link.MaNhanVien;
      } else {
        // Fallback to email-based lookup within unit if mapping not present
        const practitioners = await nhanVienRepo.findByUnit(user.unitId || '');
        const userPractitioner = practitioners.find(p => p.Email && p.Email.toLowerCase() === user.username.toLowerCase());
        if (!userPractitioner) {
          return NextResponse.json(
            { error: 'Practitioner profile not found' },
            { status: 404 }
          );
        }
        filters.practitionerId = userPractitioner.MaNhanVien;
      }
    } else if (user.role === 'DonVi') {
      // Unit admins can see submissions from their unit only
      filters.unitId = user.unitId || undefined;
      
      // If specific practitioner requested, ensure they're in the same unit
      if (practitionerId) {
        const practitioner = await nhanVienRepo.findById(practitionerId);
        if (practitioner && practitioner.MaDonVi === user.unitId) {
          filters.practitionerId = practitionerId;
        } else {
          return NextResponse.json(
            { error: 'Cannot access submissions from other units' },
            { status: 403 }
          );
        }
      }
    } else if (user.role === 'SoYTe') {
      // SoYTe can see all submissions, apply optional filters
      if (practitionerId) {
        filters.practitionerId = practitionerId;
      }
      if (unitId) {
        filters.unitId = unitId;
      }
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Execute server-side search with JOINs (only 2 queries: SELECT + COUNT)
    const result = await ghiNhanHoatDongRepo.search(filters);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
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
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  try {
    user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const activeUser = user;

    // Only practitioners and unit admins can submit activities
    if (!['NguoiHanhNghe', 'DonVi'].includes(activeUser.role)) {
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
    
    if (activeUser.role === 'NguoiHanhNghe') {
      // For practitioners, prefer direct FK mapping on the account
      const { db } = await import('@/lib/db/client');
      const link = await db.queryOne<{ MaNhanVien: string }>(
        'SELECT "MaNhanVien" FROM "TaiKhoan" WHERE "MaTaiKhoan" = $1 AND "MaNhanVien" IS NOT NULL LIMIT 1',
        [activeUser.id]
      );

      if (link?.MaNhanVien) {
        practitionerId = link.MaNhanVien;
      } else {
        // Fallback to email-based lookup within unit if mapping not present
        const practitioners = await nhanVienRepo.findByUnit(activeUser.unitId || '');
        const userPractitioner = practitioners.find(p => p.Email && p.Email.toLowerCase() === activeUser.username.toLowerCase());
        if (!userPractitioner) {
          return NextResponse.json(
            { error: 'Practitioner profile not found' },
            { status: 404 }
          );
        }
        practitionerId = userPractitioner.MaNhanVien;
      }
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
    const submissionData: CreateGhiNhanHoatDong = {
      MaNhanVien: practitionerId,
      MaDanhMuc: validatedData.MaDanhMuc ?? null,
      TenHoatDong: validatedData.TenHoatDong,
      FileMinhChungUrl: validatedData.FileMinhChungUrl ?? null,
      NguoiNhap: activeUser.id,
      CreationMethod: 'individual',
      TrangThaiDuyet: 'ChoDuyet',
      GhiChuDuyet: validatedData.GhiChuDuyet ?? null,
      HinhThucCapNhatKienThucYKhoa: validatedData.HinhThucCapNhatKienThucYKhoa ?? null,
      ChiTietVaiTro: validatedData.ChiTietVaiTro ?? null,
      DonViToChuc: validatedData.DonViToChuc ?? null,
      NgayBatDau: validatedData.NgayBatDau ? new Date(validatedData.NgayBatDau) : null,
      NgayKetThuc: validatedData.NgayKetThuc ? new Date(validatedData.NgayKetThuc) : null,
      SoTiet: validatedData.SoTiet ?? null,
      SoGioTinChiQuyDoi: calculatedCredits,
      BangChungSoGiayChungNhan: validatedData.BangChungSoGiayChungNhan ?? null,
      NgayDuyet: null,
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
    const requestId = randomUUID();
    const baseLog = {
      requestId,
      userId: user?.id ?? null,
      role: user?.role ?? null,
      message: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof z.ZodError) {
      console.error('Activity submission validation error', {
        ...baseLog,
        issues: error.issues,
      });

      return NextResponse.json(
        { error: 'Validation error', details: error.issues, requestId },
        { status: 400 }
      );
    }

    const isSchemaMismatch =
      error instanceof Error && /column\s+"?[a-zA-Z0-9_]+"?\s+does not exist/i.test(error.message);

    if (isSchemaMismatch) {
      console.error('Submission schema mismatch detected', baseLog);

      return NextResponse.json(
        {
          error: 'Không thể lưu hoạt động do hệ thống đang được cập nhật. Vui lòng thử lại sau.',
          errorCode: 'submission_schema_mismatch',
          requestId,
        },
        { status: 500 }
      );
    }

    console.error('Activity submission error', baseLog);

    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    );
  }
}