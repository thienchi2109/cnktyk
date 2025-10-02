import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { taiKhoanRepo, donViRepo } from '@/lib/db/repositories';
import { CreateTaiKhoanSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/users - List users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const unitId = searchParams.get('unitId');
    const search = searchParams.get('search');

    // Build query conditions based on user role and filters
    let users;
    
    if (session.user.role === 'SoYTe') {
      // SoYTe can see all users
      if (role) {
        users = await taiKhoanRepo.findByRole(role);
      } else if (unitId) {
        users = await taiKhoanRepo.findByUnit(unitId);
      } else {
        users = await taiKhoanRepo.findAll();
      }
    } else if (session.user.role === 'DonVi' && session.user.unitId) {
      // DonVi can only see users in their unit
      users = await taiKhoanRepo.findByUnit(session.user.unitId);
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Apply search filter if provided
    if (search && users) {
      users = users.filter(user => 
        user.TenDangNhap.toLowerCase().includes(search.toLowerCase())
      );
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
      
      // Unit admins cannot create SoYTe users
      if (validatedData.QuyenHan === 'SoYTe') {
        return NextResponse.json(
          { error: 'You cannot create SoYTe users' },
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