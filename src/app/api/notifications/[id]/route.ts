import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { notificationRepo } from '@/lib/db/repositories';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/notifications/[id] - Get specific notification
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const notification = await notificationRepo.findById(id);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check if user owns this notification
    if (notification.MaNguoiNhan !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      notification,
      success: true
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/[id] - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // First check if notification exists and belongs to user
    const existingNotification = await notificationRepo.findById(id);
    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existingNotification.MaNguoiNhan !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark as read
    const updatedNotification = await notificationRepo.markAsRead(id);

    return NextResponse.json({
      notification: updatedNotification,
      success: true
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    await requireRole(['SoYTe']);

    const deleted = await notificationRepo.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}