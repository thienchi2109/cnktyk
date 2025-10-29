import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { taiKhoanRepo, donViRepo } from '@/lib/db/repositories';
import { CreateTaiKhoanSchema } from '@/lib/db/schemas';
import { 
  isDonViAccountManagementEnabled,
  DONVI_ACCOUNT_MANAGEMENT_DISABLED_MESSAGE,
} from '@/lib/features/flags';
import { z } from 'zod';

// GET /api/users - List users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);

    if (session.user.role === 'DonVi' && !isDonViAccountManagementEnabled()) {
      return NextResponse.json(
        {
          error: 'DONVI_ACCOUNT_MANAGEMENT_DISABLED',
          message: DONVI_ACCOUNT_MANAGEMENT_DISABLED_MESSAGE,
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role') || undefined;
    const unitId = searchParams.get('unitId') || undefined;
    const search = searchParams.get('search') || undefined;

    // Build search filters based on user role and permissions
    let users: any[];
    
    if (session.user.role === 'SoYTe') {
      // SoYTe can see all users with any combination of filters
      users = await taiKhoanRepo.search({
        role,
        unitId,
        searchTerm: search,
        includeInactive: false, // Only show active users
      });
    } else if (session.user.role === 'DonVi' && session.user.unitId) {
      // DonVi can ONLY see NguoiHanhNghe (practitioner) accounts in their unit
      // Security: Force role to 'NguoiHanhNghe' regardless of requested filter
      users = await taiKhoanRepo.search({
        role: 'NguoiHanhNghe', // Force practitioner role only
        unitId: session.user.unitId, // Force their unit
        searchTerm: search,
        includeInactive: false,
      });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users?.slice(startIndex, endIndex) || [];

    // Remove sensitive data
    const safeUsers = paginatedUsers.map(user => ({
      MaTaiKhoan: user.MaTaiKhoan,
      TenDangNhap: user.TenDangNhap,
      QuyenHan: user.QuyenHan,
      MaDonVi: user.MaDonVi,
      TrangThai: user.TrangThai,
      TaoLuc: user.TaoLuc,
    }));

    return NextResponse.json({
      users: safeUsers,
      pagination: {
        page,
        limit,
        total: users?.length || 0,
        totalPages: Math.ceil((users?.length || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);

    if (session.user.role === 'DonVi' && !isDonViAccountManagementEnabled()) {
      return NextResponse.json(
        {
          error: 'DONVI_ACCOUNT_MANAGEMENT_DISABLED',
          message: DONVI_ACCOUNT_MANAGEMENT_DISABLED_MESSAGE,
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = CreateTaiKhoanSchema.parse(body);

    // Additional validation for unit administrators
    if (session.user.role === 'DonVi') {
      // Unit admins can only create users in their own unit
      if (validatedData.MaDonVi !== session.user.unitId) {
        return NextResponse.json(
          { error: 'You can only create users in your own unit' },
          { status: 403 }
        );
      }
      
      // Unit admins can ONLY create NguoiHanhNghe (practitioner) accounts
      // Security: DonVi should not be able to create admin or auditor accounts
      if (validatedData.QuyenHan !== 'NguoiHanhNghe') {
        return NextResponse.json(
          { error: 'DonVi users can only create NguoiHanhNghe (practitioner) accounts' },
          { status: 403 }
        );
      }
    }

    // Verify unit exists if specified
    if (validatedData.MaDonVi) {
      const unit = await donViRepo.findById(validatedData.MaDonVi);
      if (!unit) {
        return NextResponse.json(
          { error: 'Unit not found' },
          { status: 400 }
        );
      }
    }

    // Check if username already exists
    const existingUser = await taiKhoanRepo.findByUsername(validatedData.TenDangNhap);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Create user
    const newUser = await taiKhoanRepo.create(validatedData);

    // Return user without sensitive data
    const safeUser = {
      MaTaiKhoan: newUser.MaTaiKhoan,
      TenDangNhap: newUser.TenDangNhap,
      QuyenHan: newUser.QuyenHan,
      MaDonVi: newUser.MaDonVi,
      TrangThai: newUser.TrangThai,
      TaoLuc: newUser.TaoLuc,
    };

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
