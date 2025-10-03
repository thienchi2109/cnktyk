import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { DohDashboard } from '@/components/dashboard/doh-dashboard';

export default async function DohDashboardPage() {
  const session = await requireAuth();

  // Only SoYTe role can access this dashboard
  if (session.user.role !== 'SoYTe') {
    redirect('/dashboard');
  }

  return <DohDashboard userId={session.user.id} />;
}
