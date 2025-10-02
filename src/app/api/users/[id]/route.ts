import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { taiKhoanRepo, donViRepo } from '@/lib/db/repositories';
import { UpdateTaiKhoanSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const userId = params.id;

    // Check permissions
    if (session.quyenHan === 'NguoiHanhNghe' && session.sub !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await taiKhoanRepo.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Unit admins can only see users in their unit
    if (session.quyenHan === 'DonVi' && user.MaDonVi !== session.maDonVi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Return user without sensitive data
    const safeUser = {
      MaTaiKhoan: user.MaTaiKhoan,
      TenDangNhap: user.TenDangNhap,
      QuyenHan: user.QuyenHan,
      MaDonVi: user.MaDonVi,
      TrangThai: user.TrangThai,
      TaoLuc: user.TaoLuc,
    };

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const userId = params.id;
    const body = await request.json();

    // Check if user exists
    const existingUser = await taiKhoanRepo.findById(userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Permission checks
    const isSelfUpdate = session.sub === userId;
    const isAdmin = ['SoYTe', 'DonVi'].includes(session.quyenHan);
    const isUnitAdmin = session.quyenHan === 'DonVi' && existingUser.MaDonVi === session.maDonVi;

    if (!isSelfUpdate && !isAdmin && !isUnitAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate input - different schemas for self vs admin updates
    let validatedData;
    
    if (isSelfUpdate && !isAdmin) {
      // Regular users can only update their password
      const SelfUpdateSchema = z.object({
        MatKhau: z.string().min(6, 'Password must be at least 6 characters').optional(),
      });
      validatedData = SelfUpdateSchema.parse(body);
    } else {
      // Admins can update more fields
      validatedData = UpdateTaiKhoanSchema.parse(body);
      
      // Unit admins have restrictions
      if (session.quyenHan === 'DonVi') {
        // Cannot change unit to outside their jurisdiction
        if (validatedData.MaDonVi && validatedData.MaDonVi !== session.maDonVi) {
          return NextResponse.json(
            { error: 'You can only assign users to your own unit' },
            { status: 403 }
          );
        }
        
        // Cannot create SoYTe users
        if (validatedData.QuyenHan === 'SoYTe') {
          return NextResponse.json(
            { error: 'You cannot assign SoYTe role' },
            { status: 403 }
          );
        }
      }
    }

    // Verify unit exists if being changed
    if (validatedData.MaDonVi) {
      const unit = await donViRepo.findById(validatedData.MaDonVi);
      if (!unit) {
        return NextResponse.json(
          { error: 'Unit not found' },
          { status: 400 }
        );
      }
    }

    // Check username uniqueness if being changed
    if (validatedData.TenDangNhap && validatedData.TenDangNhap !== existingUser.TenDangNhap) {
      const userWithSameUsername = await taiKhoanRepo.findByUsername(validatedData.TenDangNhap);
      if (userWithSameUsername) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    // Handle password update separately
    if (validatedData.MatKhau) {
      await taiKhoanRepo.updatePassword(userId, validatedData.MatKhau);
      delete validatedData.MatKhau;
    }

    // Update user
    const updatedUser = await taiKhoanRepo.update(userId, validatedData);
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Return updated user without sensitive data
    const safeUser = {
      MaTaiKhoan: updatedUser.MaTaiKhoan,
      TenDangNhap: updatedUser.TenDangNhap,
      QuyenHan: updatedUser.QuyenHan,
      MaDonVi: updatedUser.MaDonVi,
      TrangThai: updatedUser.TrangThai,
      TaoLuc: updatedUser.TaoLuc,
    };

    return NextResponse.json(safeUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Deactivate user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);
    
    const userId = params.id;

    // Check if user exists
    const existingUser = await taiKhoanRepo.findById(userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Unit admins can only deactivate users in their unit
    if (session.quyenHan === 'DonVi' && existingUser.MaDonVi !== session.maDonVi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent self-deactivation
    if (session.sub === userId) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Soft delete by setting TrangThai to false
    const updatedUser = await taiKhoanRepo.update(userId, { TrangThai: false });
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}