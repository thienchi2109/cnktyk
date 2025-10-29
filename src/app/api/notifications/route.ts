import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { notificationRepo } from '@/lib/db/repositories';
import { CreateThongBaoSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let notifications;
    if (unreadOnly) {
      // Get only unread notifications
      notifications = await notificationRepo.findByUser(session.user.id, limit);
      notifications = notifications.filter(n => n.TrangThai === 'Moi');
    } else {
      // Get all notifications
      notifications = await notificationRepo.findByUser(session.user.id, limit);
    }

    // Get unread count
    const unreadCount = await notificationRepo.getUnreadCount(session.user.id);

    return NextResponse.json({
      notifications,
      unreadCount,
      success: true
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create new notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);

    const body = await request.json();
    const validatedData = CreateThongBaoSchema.parse({
      ...body,
      TaoLuc: new Date()
    });

    const notification = await notificationRepo.create(validatedData);

    return NextResponse.json({
      notification,
      success: true
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}