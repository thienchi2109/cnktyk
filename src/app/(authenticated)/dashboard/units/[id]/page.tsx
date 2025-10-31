import { requireAuth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
import { donViRepo } from '@/lib/db/repositories';
interface PageProps {
  params: { id: string };
}

export default async function UnitDetailPage({ params }: PageProps) {
  const session = await requireAuth();

  // SoYTe-only access for this detail view spec
  if (session.user.role !== 'SoYTe') {
    redirect('/auth/error?error=AccessDenied');
  }

  const unit = await donViRepo.findById(params.id);
  if (!unit) {
    notFound();
  }

  redirect(`/dashboard/doh?unit=${params.id}`);
}