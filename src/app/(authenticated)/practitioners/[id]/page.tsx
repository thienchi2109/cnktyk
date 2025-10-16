import { requireAuth } from '@/lib/auth/server';
import { donViRepo } from '@/lib/db/repositories';
import { PractitionerProfile } from '@/components/practitioners/practitioner-profile';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PractitionerDetailPage({ params }: PageProps) {
  const session = await requireAuth();

  // Get units for form (needed for editing)
  let units: Array<{ MaDonVi: string; TenDonVi: string }> = [];
  
  if (session.user.role === 'SoYTe') {
    const allUnits = await donViRepo.findAll();
    units = allUnits.map(unit => ({
      MaDonVi: unit.MaDonVi,
      TenDonVi: unit.TenDonVi
    }));
  } else if (session.user.role === 'DonVi' && session.user.unitId) {
    const unit = await donViRepo.findById(session.user.unitId);
    if (unit) {
      units = [{
        MaDonVi: unit.MaDonVi,
        TenDonVi: unit.TenDonVi
      }];
    }
  }

  return (
    <div className="container mx-auto py-6">
      <PractitionerProfile
        practitionerId={params.id}
        userRole={session.user.role}
        userUnitId={session.user.unitId}
        units={units}
      />
    </div>
  );
}
