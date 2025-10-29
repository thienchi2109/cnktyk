import { requireAuth } from '@/lib/auth/server';
import { ResponsiveNavigation } from '@/components/layout/responsive-navigation';
import { db } from '@/lib/db/client';
import { ghiNhanHoatDongRepo } from '@/lib/db/repositories';

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

  // Fetch pending submissions count for Unit Admins
  let submissionsPendingCount = 0;
  try {
    if (session.user.role === 'DonVi' && session.user.unitId) {
      const stats = await ghiNhanHoatDongRepo.getActivityStats(session.user.unitId);
      submissionsPendingCount = stats.pending;
    }
  } catch (error) {
    console.error('Failed to fetch submissions pending count:', error);
  }

  // Expose a small cache-buster for client-initiated refreshes (e.g., after bulk approve)
  const stats = { submissionsPendingCount };

  return (
    <ResponsiveNavigation
      user={{
        name: session.user.username,
        role: session.user.role,
      }}
      notifications={unreadCount}
      submissionPendingCount={stats.submissionsPendingCount}
      featureFlags={{
        donViAccountManagementEnabled:
          session.featureFlags.donViAccountManagementEnabled,
      }}
    >
      {children}
    </ResponsiveNavigation>
  );
}
