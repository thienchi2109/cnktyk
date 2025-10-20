import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { taiKhoanRepo, donViRepo } from '@/lib/db/repositories';
import { UpdateTaiKhoanSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: userId } = await params;

    // Check permissions
    if (session.user.role === 'NguoiHanhNghe' && session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await taiKhoanRepo.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Unit admins can only see NguoiHanhNghe users in their unit
    if (session.user.role === 'DonVi') {
      if (user.MaDonVi !== session.user.unitId || user.QuyenHan !== 'NguoiHanhNghe') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: userId } = await params;
    const body = await request.json();

    // Check if user exists
    const existingUser = await taiKhoanRepo.findById(userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Permission checks
    const isSelfUpdate = session.user.id === userId;
    const isAdmin = ['SoYTe', 'DonVi'].includes(session.user.role);
    const isUnitAdmin = session.user.role === 'DonVi' && existingUser.MaDonVi === session.user.unitId;

    if (!isSelfUpdate && !isAdmin && !isUnitAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate input - different schemas for self vs admin updates
    if (isSelfUpdate && !isAdmin) {
      // Regular users can only update their password
      const SelfUpdateSchema = z.object({
        MatKhau: z.string().min(6, 'Password must be at least 6 characters').optional(),
      });
      const validatedData = SelfUpdateSchema.parse(body);
      
      // Handle password update for self-update
      if (validatedData.MatKhau) {
        await taiKhoanRepo.updatePassword(userId, validatedData.MatKhau);
      }
      
      // Get updated user data
      const updatedUser = await taiKhoanRepo.findById(userId);
      if (!updatedUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          MaTaiKhoan: updatedUser.MaTaiKhoan,
          TenDangNhap: updatedUser.TenDangNhap,
          QuyenHan: updatedUser.QuyenHan,
          MaDonVi: updatedUser.MaDonVi,
          TrangThai: updatedUser.TrangThai,
        },
      });
    } else {
      // Admins can update more fields
      const validatedData = UpdateTaiKhoanSchema.parse(body);
      
      // Unit admins have restrictions
      if (session.user.role === 'DonVi') {
        // DonVi can only edit NguoiHanhNghe accounts
        if (existingUser.QuyenHan !== 'NguoiHanhNghe') {
          return NextResponse.json(
            { error: 'DonVi users can only manage NguoiHanhNghe (practitioner) accounts' },
            { status: 403 }
          );
        }

        // Cannot change unit to outside their jurisdiction
        if (validatedData.MaDonVi && validatedData.MaDonVi !== session.user.unitId) {
          return NextResponse.json(
            { error: 'You can only assign users to your own unit' },
            { status: 403 }
          );
        }
        
        // Cannot change role from NguoiHanhNghe to anything else
        if (validatedData.QuyenHan && validatedData.QuyenHan !== 'NguoiHanhNghe') {
          return NextResponse.json(
            { error: 'DonVi users can only manage NguoiHanhNghe (practitioner) accounts' },
            { status: 403 }
          );
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

      // Update user
      const updatedUser = await taiKhoanRepo.update(userId, validatedData);
      if (!updatedUser) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      // Return updated user without sensitive data
      return NextResponse.json({
        user: {
          MaTaiKhoan: updatedUser.MaTaiKhoan,
          TenDangNhap: updatedUser.TenDangNhap,
          QuyenHan: updatedUser.QuyenHan,
          MaDonVi: updatedUser.MaDonVi,
          TrangThai: updatedUser.TrangThai,
          TaoLuc: updatedUser.TaoLuc,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);
    
    const { id: userId } = await params;

    // Check if user exists
    const existingUser = await taiKhoanRepo.findById(userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Unit admins can only deactivate NguoiHanhNghe users in their unit
    if (session.user.role === 'DonVi') {
      if (existingUser.MaDonVi !== session.user.unitId || existingUser.QuyenHan !== 'NguoiHanhNghe') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Prevent self-deactivation
    if (session.user.id === userId) {
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