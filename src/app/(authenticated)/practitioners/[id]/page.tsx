import { requireAuth } from '@/lib/auth/server';
import { PractitionerProfile } from '@/components/practitioners/practitioner-profile';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PractitionerDetailPage({ params }: PageProps) {
  const session = await requireAuth();

  return (
    <div className="container mx-auto py-6">
      <PractitionerProfile
        practitionerId={params.id}
        userRole={session.user.role}
        userUnitId={session.user.unitId}
      />
    </div>
  );
}