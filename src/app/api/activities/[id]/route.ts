import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { danhMucHoatDongRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';
import { UpdateDanhMucHoatDongSchema } from '@/lib/db/schemas';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/activities/[id] - Get activity details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activity = await danhMucHoatDongRepo.findById(id);
    
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json(activity);

  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/activities/[id] - Update activity with scope validation
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both SoYTe and DonVi can update activities (within their scope)
    if (user.role !== 'SoYTe' && user.role !== 'DonVi') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Validate input
    const validatedData = UpdateDanhMucHoatDongSchema.parse(body);

    // Check if user can mutate this activity
    const mutationCheck = await danhMucHoatDongRepo.assertCanMutate(
      id,
      user.role,
      user.unitId || null
    );

    if (!mutationCheck.canMutate) {
      // Log denied action
      await nhatKyHeThongRepo.logCatalogChange(
        user.id,
        'UPDATE_DENIED',
        id,
        {
          reason: mutationCheck.reason,
          actorRole: user.role,
          unitId: user.unitId || null,
        }
      );

      return NextResponse.json(
        { error: mutationCheck.reason || 'Cannot modify this activity' },
        { status: 403 }
      );
    }

    const activity = mutationCheck.activity!;
    const scopeBefore = activity.MaDonVi ? 'unit' : 'global';

    // Handle adoption to global (SoYTe only)
    let scopeAfter = scopeBefore;
    if (user.role === 'SoYTe' && body.MaDonVi === null && activity.MaDonVi !== null) {
      // SoYTe is adopting a unit activity to global
      const adoptedActivity = await danhMucHoatDongRepo.adoptToGlobal(id, user.id);
      
      await nhatKyHeThongRepo.logCatalogChange(
        user.id,
        'ADOPT_TO_GLOBAL',
        id,
        {
          activityName: activity.TenDanhMuc,
          scopeBefore,
          scopeAfter: 'global',
          unitId: activity.MaDonVi,
          actorRole: user.role,
        }
      );

      return NextResponse.json(adoptedActivity);
    }

    // Security: DonVi cannot change MaDonVi
    if (user.role === 'DonVi') {
      delete (body as any).MaDonVi;
    }

    // Update activity with ownership tracking
    const updatedActivity = await danhMucHoatDongRepo.updateWithOwnership(
      id,
      validatedData,
      user.id
    );

    if (!updatedActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Log update
    await nhatKyHeThongRepo.logCatalogChange(
      user.id,
      'UPDATE',
      id,
      {
        activityName: updatedActivity.TenDanhMuc,
        scope: updatedActivity.MaDonVi ? 'unit' : 'global',
        unitId: updatedActivity.MaDonVi,
        actorRole: user.role,
      }
    );

    return NextResponse.json(updatedActivity);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id] - Soft delete activity
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both SoYTe and DonVi can soft delete activities (within their scope)
    if (user.role !== 'SoYTe' && user.role !== 'DonVi') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    // Check if user can mutate this activity
    const mutationCheck = await danhMucHoatDongRepo.assertCanMutate(
      id,
      user.role,
      user.unitId || null
    );

    if (!mutationCheck.canMutate) {
      // Log denied action
      await nhatKyHeThongRepo.logCatalogChange(
        user.id,
        'DELETE_DENIED',
        id,
        {
          reason: mutationCheck.reason,
          actorRole: user.role,
          unitId: user.unitId || null,
        }
      );

      return NextResponse.json(
        { error: mutationCheck.reason || 'Cannot delete this activity' },
        { status: 403 }
      );
    }

    const activity = mutationCheck.activity!;

    // Soft delete the activity
    const deletedActivity = await danhMucHoatDongRepo.softDelete(id, user.id);

    if (!deletedActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Log soft delete
    await nhatKyHeThongRepo.logCatalogChange(
      user.id,
      'SOFT_DELETE',
      id,
      {
        activityName: activity.TenDanhMuc,
        scope: activity.MaDonVi ? 'unit' : 'global',
        unitId: activity.MaDonVi,
        actorRole: user.role,
      }
    );

    return NextResponse.json({ 
      message: 'Activity soft deleted successfully',
      activity: deletedActivity 
    });

  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}