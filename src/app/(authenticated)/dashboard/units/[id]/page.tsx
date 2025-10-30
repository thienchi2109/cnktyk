import { requireAuth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
import { donViRepo } from '@/lib/db/repositories';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import Link from 'next/link';
import UnitDetailClient from '@/components/dashboard/unit-detail-client';

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

  const unitName = unit.TenDonVi;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{unitName}</h1>
          <p className="text-gray-600 text-sm">Chi tiết hiệu suất đơn vị</p>
        </div>
        <GlassButton asChild variant="outline" size="sm">
          <Link href="/dashboard/doh">Quay lại bảng điều khiển</Link>
        </GlassButton>
      </div>

      <GlassCard className="p-6">
        <UnitDetailClient unitId={params.id} unitName={unitName} />
      </GlassCard>
    </div>
  );
}