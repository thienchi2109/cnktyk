import { requireAuth } from '@/lib/auth/server';
import { ResponsiveNavigation } from '@/components/layout/responsive-navigation';
import { db } from '@/lib/db/client';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication for all pages in this layout
  const session = await requireAuth();

  // Fetch unread notifications count
  let unreadCount = 0;
  try {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM "ThongBao" 
       WHERE "MaNguoiNhan" = $1 AND "TrangThai" = 'Moi'`,
      [session.user.id]
    );
    unreadCount = parseInt(result[0]?.count || '0', 10);
  } catch (error) {
    console.error('Failed to fetch notification count:', error);
  }

  return (
    <ResponsiveNavigation
      user={{
        name: session.user.username,
        role: session.user.role,
      }}
      notifications={unreadCount}
    >
      {children}
    </ResponsiveNavigation>
  );
}
