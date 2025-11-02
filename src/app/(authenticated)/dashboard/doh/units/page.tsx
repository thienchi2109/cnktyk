import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { DohUnitsClient } from '@/components/dashboard/doh-units-client';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DohUnitsPage({ searchParams }: PageProps = {}) {
  const session = await requireAuth();

  // Only SoYTe role can access units management
  if (session.user.role !== 'SoYTe') {
    redirect('/auth/error?error=AccessDenied');
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const unitParam = resolvedSearchParams.unit;
  const initialUnitId = Array.isArray(unitParam) ? unitParam[0] ?? null : unitParam ?? null;

  return <DohUnitsClient userId={session.user.id} initialUnitId={initialUnitId} />;
}
