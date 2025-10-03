import { requireAuth, requireRole } from '@/lib/auth/server';
import { donViRepo } from '@/lib/db/repositories';
import { PractitionerForm } from '@/components/practitioners/practitioner-form';

export default async function NewPractitionerPage() {
  const session = await requireAuth();
  await requireRole(['SoYTe', 'DonVi']);

  // Get units for form
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
      <PractitionerForm
        unitId={session.user.role === 'DonVi' ? session.user.unitId : undefined}
        units={units}
        mode="create"
      />
    </div>
  );
}