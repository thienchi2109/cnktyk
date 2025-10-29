import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { nhanVienRepo, ghiNhanHoatDongRepo } from '@/lib/db/repositories';
import { UpdateNhanVienSchema } from '@/lib/db/schemas';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/practitioners/[id] - Get practitioner details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: practitionerId } = await params;

    // Find practitioner
    const practitioner = await nhanVienRepo.findById(practitionerId);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Practitioner not found' },
        { status: 404 }
      );
    }

    // Role-based access control
    if (session.user.role === 'NguoiHanhNghe') {
      // Practitioners can only access their own data
      if (session.user.id !== practitionerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (session.user.role === 'DonVi') {
      // Unit admins can only access practitioners in their unit
      if (practitioner.MaDonVi !== session.user.unitId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }
    // SoYTe and Auditor can access all practitioners

    // Get compliance status
    const complianceStatus = await nhanVienRepo.getComplianceStatus(practitionerId);

    // Get recent activities
    const recentActivities = await ghiNhanHoatDongRepo.findByPractitioner(practitionerId, 10);

    return NextResponse.json({
      ...practitioner,
      complianceStatus,
      recentActivities
    });
  } catch (error) {
    console.error('Error fetching practitioner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/practitioners/[id] - Update practitioner
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: practitionerId } = await params;

    // Find practitioner
    const practitioner = await nhanVienRepo.findById(practitionerId);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Practitioner not found' },
        { status: 404 }
      );
    }

    // Role-based access control
    if (session.user.role === 'NguoiHanhNghe') {
      // Practitioners can only update their own basic info (not unit or status)
      if (session.user.id !== practitionerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (session.user.role === 'DonVi') {
      // Unit admins can only update practitioners in their unit
      if (practitioner.MaDonVi !== session.user.unitId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (!['SoYTe'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = UpdateNhanVienSchema.parse(body);

    // Restrict what practitioners can update about themselves
    if (session.user.role === 'NguoiHanhNghe') {
      // Practitioners can only update personal info, not unit or work status
      const allowedFields = ['Email', 'DienThoai'];
      const restrictedFields = Object.keys(validatedData).filter(
        key => !allowedFields.includes(key)
      );
      
      if (restrictedFields.length > 0) {
        return NextResponse.json(
          { error: `You can only update: ${allowedFields.join(', ')}` },
          { status: 403 }
        );
      }
    }

    // Unit admins cannot change unit assignment
    if (session.user.role === 'DonVi' && validatedData.MaDonVi && validatedData.MaDonVi !== practitioner.MaDonVi) {
      return NextResponse.json(
        { error: 'You cannot change unit assignment' },
        { status: 403 }
      );
    }

    // Check if CCHN already exists (if being updated)
    if (validatedData.SoCCHN && validatedData.SoCCHN !== practitioner.SoCCHN) {
      const existingPractitioner = await nhanVienRepo.findByCCHN(validatedData.SoCCHN);
      if (existingPractitioner) {
        return NextResponse.json(
          { error: 'CCHN number already exists' },
          { status: 400 }
        );
      }
    }

    // Update practitioner
    const updatedPractitioner = await nhanVienRepo.update(practitionerId, validatedData);
    if (!updatedPractitioner) {
      return NextResponse.json(
        { error: 'Failed to update practitioner' },
        { status: 500 }
      );
    }

    // Get updated compliance status
    const complianceStatus = await nhanVienRepo.getComplianceStatus(practitionerId);

    return NextResponse.json({
      ...updatedPractitioner,
      complianceStatus
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating practitioner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/practitioners/[id] - Deactivate practitioner (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);
    
    const { id: practitionerId } = await params;

    // Find practitioner
    const practitioner = await nhanVienRepo.findById(practitionerId);
    if (!practitioner) {
      return NextResponse.json(
        { error: 'Practitioner not found' },
        { status: 404 }
      );
    }

    // Unit admins can only deactivate practitioners in their unit
    if (session.user.role === 'DonVi' && practitioner.MaDonVi !== session.user.unitId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete by updating status
    const updatedPractitioner = await nhanVienRepo.update(practitionerId, {
      TrangThaiLamViec: 'DaNghi'
    });

    if (!updatedPractitioner) {
      return NextResponse.json(
        { error: 'Failed to deactivate practitioner' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Practitioner deactivated successfully',
      practitioner: updatedPractitioner
    });
  } catch (error) {
    console.error('Error deactivating practitioner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}