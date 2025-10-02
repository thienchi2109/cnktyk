import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { notificationRepo } from '@/lib/db/repositories';
import { z } from 'zod';

const BulkActionSchema = z.object({
  action: z.enum(['markAllRead', 'deleteAll']),
  notificationIds: z.array(z.string()).optional()
});

// POST /api/notifications/bulk - Bulk operations on notifications
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { action, notificationIds } = BulkActionSchema.parse(body);

    let result;
    
    switch (action) {
      case 'markAllRead':
        if (notificationIds && notificationIds.length > 0) {
          // Mark specific notifications as read
          const promises = notificationIds.map(id => notificationRepo.markAsRead(id));
          result = await Promise.all(promises);
        } else {
          // Mark all user's notifications as read
          const userNotifications = await notificationRepo.findByUser(session.user.id);
          const unreadNotifications = userNotifications.filter(n => n.TrangThai === 'Moi');
          const promises = unreadNotifications.map(n => notificationRepo.markAsRead(n.MaThongBao));
          result = await Promise.all(promises);
        }
        break;

      case 'deleteAll':
        await requireRole(['SoYTe']);
        
        if (notificationIds && notificationIds.length > 0) {
          const promises = notificationIds.map(id => notificationRepo.delete(id));
          result = await Promise.all(promises);
        } else {
          return NextResponse.json({ error: 'Notification IDs required for delete operation' }, { status: 400 });
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${action} completed successfully`,
      affectedCount: result.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}