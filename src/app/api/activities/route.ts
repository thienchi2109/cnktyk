import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { danhMucHoatDongRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';
import { CreateDanhMucHoatDongSchema, UpdateDanhMucHoatDongSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/activities - List activity catalog with scope filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'all'; // 'all', 'global', 'unit'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // SoYTe can see all activities, DonVi only their unit + global
    const isSoYTe = user.role === 'SoYTe';
    
    let global: any[] = [];
    let unit: any[] = [];

    if (isSoYTe) {
      // SoYTe sees all activities
      if (scope === 'all' || scope === 'global') {
        global = await danhMucHoatDongRepo.findGlobal();
      }
      
      if (scope === 'all' || scope === 'unit') {
        // For SoYTe, get all unit activities (from all units)
        const allActivities = await danhMucHoatDongRepo.findAll();
        unit = allActivities.filter(a => a.MaDonVi !== null && !a.DaXoaMem);
      }
    } else if (user.role === 'DonVi') {
      // DonVi sees global + their unit activities
      if (!user.unitId) {
        return NextResponse.json({ error: 'User has no unit assigned' }, { status: 403 });
      }

      if (scope === 'all') {
        const accessible = await danhMucHoatDongRepo.findAccessible(user.unitId);
        global = accessible.global;
        unit = accessible.unit;
      } else if (scope === 'global') {
        global = await danhMucHoatDongRepo.findGlobal();
      } else if (scope === 'unit') {
        unit = await danhMucHoatDongRepo.findByUnit(user.unitId);
      }
    } else {
      // Other roles only see global activities
      if (scope === 'all' || scope === 'global') {
        global = await danhMucHoatDongRepo.findGlobal();
      }
    }

    // Calculate permissions based on role
    const permissions = {
      canCreateGlobal: isSoYTe,
      canCreateUnit: user.role === 'DonVi' || isSoYTe,
      canEditGlobal: isSoYTe,
      canEditUnit: user.role === 'DonVi' || isSoYTe,
      canAdoptToGlobal: isSoYTe,
      canRestoreSoftDeleted: isSoYTe || user.role === 'DonVi',
    };

    return NextResponse.json({
      global,
      unit,
      permissions,
      pagination: {
        page,
        limit,
        totalGlobal: global.length,
        totalUnit: unit.length,
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/activities - Create new activity (SoYTe and DonVi)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both SoYTe and DonVi can create activities
    if (user.role !== 'SoYTe' && user.role !== 'DonVi') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = CreateDanhMucHoatDongSchema.parse(body);

    // Determine scope based on user role
    let unitId: string | null = null;
    let scope: 'global' | 'unit' = 'global';

    if (user.role === 'DonVi') {
      // DonVi can only create unit activities - auto-inject their unitId
      if (!user.unitId) {
        return NextResponse.json({ error: 'User has no unit assigned' }, { status: 403 });
      }
      unitId = user.unitId;
      scope = 'unit';
      
      // Security: Ignore any MaDonVi from client input for DonVi users
      delete (body as any).MaDonVi;
    } else if (user.role === 'SoYTe') {
      // SoYTe can create global (MaDonVi = null) or unit-specific activities
      // If MaDonVi is provided in body, use it; otherwise create global
      unitId = body.MaDonVi || null;
      scope = unitId ? 'unit' : 'global';
    }

    // Create activity with ownership tracking
    const newActivity = await danhMucHoatDongRepo.createWithOwnership(
      validatedData,
      user.id,
      unitId
    );

    // Log catalog change
    await nhatKyHeThongRepo.logCatalogChange(
      user.id,
      'CREATE',
      newActivity.MaDanhMuc,
      {
        activityName: newActivity.TenDanhMuc,
        scope,
        unitId,
        actorRole: user.role,
      }
    );

    return NextResponse.json(newActivity, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}