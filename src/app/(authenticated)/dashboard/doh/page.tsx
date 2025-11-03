import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { DohDashboard } from '@/components/dashboard/doh-dashboard';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DohDashboardPage({ searchParams }: PageProps = {}) {
  const session = await requireAuth();

  // Only SoYTe role can access this dashboard
  if (session.user.role !== 'SoYTe') {
    redirect('/dashboard');
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const unitParam = resolvedSearchParams.unit;
  const initialUnitId = Array.isArray(unitParam) ? unitParam[0] ?? null : unitParam ?? null;

  return <DohDashboard userId={session.user.id} initialUnitId={initialUnitId} />;
}
