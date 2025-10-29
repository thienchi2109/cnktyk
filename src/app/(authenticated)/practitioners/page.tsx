import { requireAuth } from '@/lib/auth/server';
import { donViRepo } from '@/lib/db/repositories';
import { PractitionersList } from '@/components/practitioners/practitioners-list';

export default async function PractitionersPage() {
  const session = await requireAuth();
  
  // Get units for filtering (SoYTe can see all units)
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
    <div className="max-w-7xl mx-auto">
      <PractitionersList
        userRole={session.user.role}
        userUnitId={session.user.unitId}
        units={units}
      />
    </div>
  );
}