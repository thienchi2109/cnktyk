import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { danhMucHoatDongRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/activities/[id]/restore - Restore soft-deleted activity
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both SoYTe and DonVi can restore activities (within their scope)
    if (user.role !== 'SoYTe' && user.role !== 'DonVi') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Load the activity to check ownership and soft-delete status
    const activity = await danhMucHoatDongRepo.findById(id);

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Check if activity is soft-deleted
    if (!activity.DaXoaMem) {
      return NextResponse.json(
        { error: 'Activity is not soft-deleted' },
        { status: 400 }
      );
    }

    // Check if user can restore this activity
    if (user.role === 'DonVi') {
      if (!user.unitId) {
        return NextResponse.json({ error: 'User has no unit assigned' }, { status: 403 });
      }

      // DonVi can only restore their own unit's activities
      if (activity.MaDonVi !== user.unitId) {
        // Log denied action
        await nhatKyHeThongRepo.logCatalogChange(
          user.id,
          'RESTORE_DENIED',
          id,
          {
            reason: 'Can only restore activities from your unit',
            actorRole: user.role,
            unitId: user.unitId,
          }
        );

        return NextResponse.json(
          { error: 'Can only restore activities from your unit' },
          { status: 403 }
        );
      }
    }

    // Restore the activity
    const restoredActivity = await danhMucHoatDongRepo.restore(id, user.id);

    if (!restoredActivity) {
      return NextResponse.json({ error: 'Failed to restore activity' }, { status: 500 });
    }

    // Log restore action
    await nhatKyHeThongRepo.logCatalogChange(
      user.id,
      'RESTORE',
      id,
      {
        activityName: restoredActivity.TenDanhMuc,
        scope: restoredActivity.MaDonVi ? 'unit' : 'global',
        unitId: restoredActivity.MaDonVi,
        actorRole: user.role,
      }
    );

    return NextResponse.json({
      message: 'Activity restored successfully',
      activity: restoredActivity
    });

  } catch (error) {
    console.error('Error restoring activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
