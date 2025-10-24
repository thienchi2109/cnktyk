import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { nhanVienRepo, donViRepo } from '@/lib/db/repositories';
import { CreateNhanVienSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/practitioners - List practitioners with filtering and search
// Phase 1: Server-side pagination and filtering optimization
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const unitId = searchParams.get('unitId');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const chucDanh = searchParams.get('chucDanh') || undefined;
    const complianceStatus = searchParams.get('complianceStatus') as 'compliant' | 'at_risk' | 'non_compliant' | null;

    // Build query parameters based on role
    let queryUnitId: string | undefined = undefined;
    
    if (session.user.role === 'DonVi' && session.user.unitId) {
      // DonVi can only see their own unit
      queryUnitId = session.user.unitId;
    } else if (session.user.role === 'SoYTe') {
      // SoYTe can filter by unit (or see all)
      queryUnitId = unitId || undefined;
    } else if (session.user.role === 'NguoiHanhNghe') {
      // Practitioners see only themselves - handle separately (no pagination needed)
      const practitioner = await nhanVienRepo.findById(session.user.id);
      const complianceStatusData = await nhanVienRepo.getComplianceStatus(session.user.id);
      
      return NextResponse.json({
        success: true,
        data: practitioner ? [{
          ...practitioner,
          complianceStatus: complianceStatusData
        }] : [],
        pagination: {
          page: 1,
          limit: 10,
          total: practitioner ? 1 : 0,
          totalPages: 1
        }
      });
    } else if (session.user.role === 'Auditor') {
      // Auditors can see all (or filter by unit)
      queryUnitId = unitId || undefined;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Use new optimized findPaginated method
    const result = await nhanVienRepo.findPaginated({
      page,
      limit,
      unitId: queryUnitId,
      search: search || undefined,
      status: status || undefined,
      chucDanh,
      complianceStatus: complianceStatus || undefined,
      orderBy: 'HoVaTen',
      orderDirection: 'ASC'
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination
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