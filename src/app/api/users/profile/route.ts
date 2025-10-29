import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { taiKhoanRepo, donViRepo } from '@/lib/db/repositories';
import { z } from 'zod';

// GET /api/users/profile - Get current user's profile
export async function GET() {
  try {
    const session = await requireAuth();
    
    const user = await taiKhoanRepo.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get unit information if user belongs to a unit
    let unit = null;
    if (user.MaDonVi) {
      unit = await donViRepo.findById(user.MaDonVi);
    }

    // Return profile without sensitive data
    const profile = {
      MaTaiKhoan: user.MaTaiKhoan,
      TenDangNhap: user.TenDangNhap,
      QuyenHan: user.QuyenHan,
      MaDonVi: user.MaDonVi,
      TrangThai: user.TrangThai,
      TaoLuc: user.TaoLuc,
      DonVi: unit ? {
        MaDonVi: unit.MaDonVi,
        TenDonVi: unit.TenDonVi,
        CapQuanLy: unit.CapQuanLy,
      } : null,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Users can only update their password
    const ProfileUpdateSchema = z.object({
      MatKhau: z.string().min(6, 'Password must be at least 6 characters').optional(),
    });

    const validatedData = ProfileUpdateSchema.parse(body);

    if (validatedData.MatKhau) {
      await taiKhoanRepo.updatePassword(session.user.id, validatedData.MatKhau);
    }

    // Get updated user data
    const updatedUser = await taiKhoanRepo.findById(session.user.id);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get unit information if user belongs to a unit
    let unit = null;
    if (updatedUser.MaDonVi) {
      unit = await donViRepo.findById(updatedUser.MaDonVi);
    }

    // Return updated profile without sensitive data
    const profile = {
      MaTaiKhoan: updatedUser.MaTaiKhoan,
      TenDangNhap: updatedUser.TenDangNhap,
      QuyenHan: updatedUser.QuyenHan,
      MaDonVi: updatedUser.MaDonVi,
      TrangThai: updatedUser.TrangThai,
      TaoLuc: updatedUser.TaoLuc,
      DonVi: unit ? {
        MaDonVi: unit.MaDonVi,
        TenDonVi: unit.TenDonVi,
        CapQuanLy: unit.CapQuanLy,
      } : null,
    };

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}