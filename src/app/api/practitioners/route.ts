import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { nhanVienRepo, donViRepo } from '@/lib/db/repositories';
import { CreateNhanVienSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/practitioners - List practitioners with filtering and search
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const unitId = searchParams.get('unitId');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const includeProgress = searchParams.get('includeProgress') === 'true';
    const userId = searchParams.get('userId');

    let practitioners: any[] = [];

    // Role-based access control
    if (session.user.role === 'SoYTe') {
      // SoYTe can see all practitioners
      if (unitId) {
        practitioners = await nhanVienRepo.findByUnit(unitId);
      } else {
        practitioners = await nhanVienRepo.findAll();
      }
    } else if (session.user.role === 'DonVi' && session.user.unitId) {
      // DonVi can only see practitioners in their unit
      practitioners = await nhanVienRepo.findByUnit(session.user.unitId);
    } else if (session.user.role === 'NguoiHanhNghe') {
      // Practitioners can only see themselves
      // If userId is provided, find by matching email (assuming username is email)
      if (userId) {
        const allPractitioners = await nhanVienRepo.findAll();
        // Try to find by email matching username
        const user = await import('@/lib/db/repositories').then(m => m.taiKhoanRepo.findById(userId));
        if (user) {
          practitioners = allPractitioners.filter(p => p.Email === user.TenDangNhap);
        } else {
          practitioners = [];
        }
      } else {
        const practitioner = await nhanVienRepo.findById(session.user.id);
        practitioners = practitioner ? [practitioner] : [];
      }
    } else if (session.user.role === 'Auditor') {
      // Auditors can see all practitioners (read-only)
      if (unitId) {
        practitioners = await nhanVienRepo.findByUnit(unitId);
      } else {
        practitioners = await nhanVienRepo.findAll();
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Apply search filter
    if (search && search.trim() !== '') {
      // Determine the unitId to use for search based on role
      let searchUnitId: string | undefined = undefined;
      if (session.user.role === 'DonVi' && session.user.unitId) {
        searchUnitId = session.user.unitId;
      } else if (unitId) {
        searchUnitId = unitId;
      }
      
      practitioners = await nhanVienRepo.searchByName(search, searchUnitId);
    }

    // Apply status filter
    if (status && practitioners) {
      practitioners = practitioners.filter((p: any) => p.TrangThaiLamViec === status);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPractitioners = practitioners?.slice(startIndex, endIndex) || [];

    // Get compliance status and progress for each practitioner if requested
    const practitionersWithData = await Promise.all(
      paginatedPractitioners.map(async (practitioner: any) => {
        const complianceStatus = await nhanVienRepo.getComplianceStatus(practitioner.MaNhanVien);
        
        let additionalData: any = { complianceStatus };
        
        if (includeProgress) {
          // Get credit progress
          const { db } = await import('@/lib/db/client');
          
          // Get total approved credits
          const creditsResult: any = await db.query(
            `SELECT COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total_credits
             FROM "GhiNhanHoatDong"
             WHERE "MaNhanVien" = $1 AND "TrangThaiDuyet" = 'DaDuyet'`,
            [practitioner.MaNhanVien]
          );
          const creditsEarned = parseFloat(creditsResult[0]?.total_credits || '0');
          const creditsRequired = 120; // Default requirement
          const compliancePercent = Math.round((creditsEarned / creditsRequired) * 100);
          
          // Get last activity date
          const lastActivityResult: any = await db.query(
            `SELECT MAX("NgayGhiNhan") as last_date
             FROM "GhiNhanHoatDong"
             WHERE "MaNhanVien" = $1`,
            [practitioner.MaNhanVien]
          );
          const lastActivityDate = lastActivityResult[0]?.last_date;
          
          additionalData = {
            ...additionalData,
            creditsEarned,
            creditsRequired,
            compliancePercent,
            lastActivityDate
          };
        }
        
        return {
          ...practitioner,
          ...additionalData
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: practitionersWithData,
      pagination: {
        page,
        limit,
        total: practitioners?.length || 0,
        totalPages: Math.ceil((practitioners?.length || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching practitioners:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/practitioners - Create new practitioner (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);

    const body = await request.json();
    
    // Validate input
    const validatedData = CreateNhanVienSchema.parse(body);

    // Additional validation for unit administrators
    if (session.user.role === 'DonVi') {
      // Unit admins can only create practitioners in their own unit
      if (validatedData.MaDonVi !== session.user.unitId) {
        return NextResponse.json(
          { error: 'You can only create practitioners in your own unit' },
          { status: 403 }
        );
      }
    }

    // Verify unit exists
    const unit = await donViRepo.findById(validatedData.MaDonVi);
    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 400 }
      );
    }

    // Check if CCHN already exists (if provided)
    if (validatedData.SoCCHN) {
      const existingPractitioner = await nhanVienRepo.findByCCHN(validatedData.SoCCHN);
      if (existingPractitioner) {
        return NextResponse.json(
          { error: 'CCHN number already exists' },
          { status: 400 }
        );
      }
    }

    // Create practitioner
    const newPractitioner = await nhanVienRepo.create(validatedData);

    // Get compliance status for the new practitioner
    const complianceStatus = await nhanVienRepo.getComplianceStatus(newPractitioner.MaNhanVien);

    return NextResponse.json({
      ...newPractitioner,
      complianceStatus
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating practitioner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}