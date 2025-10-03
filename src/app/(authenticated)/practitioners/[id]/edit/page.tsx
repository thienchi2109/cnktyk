import { requireAuth, requireRole } from '@/lib/auth/server';
import { nhanVienRepo, donViRepo } from '@/lib/db/repositories';
import { PractitionerForm } from '@/components/practitioners/practitioner-form';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditPractitionerPage({ params }: PageProps) {
  const session = await requireAuth();
  
  // Check if user has permission to edit practitioners
  const canEdit = ['SoYTe', 'DonVi', 'NguoiHanhNghe'].includes(session.user.role);
  if (!canEdit) {
    await requireRole(['SoYTe', 'DonVi', 'NguoiHanhNghe']);
  }

  // Get practitioner data
  const practitioner = await nhanVienRepo.findById(params.id);
  if (!practitioner) {
    notFound();
  }

  // Role-based access control
  if (session.user.role === 'NguoiHanhNghe') {
    // Practitioners can only edit their own profile
    if (session.user.id !== params.id) {
      await requireRole(['SoYTe', 'DonVi']);
    }
  } else if (session.user.role === 'DonVi') {
    // Unit admins can only edit practitioners in their unit
    if (practitioner.MaDonVi !== session.user.unitId) {
      await requireRole(['SoYTe']);
    }
  }

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
        initialData={practitioner}
        units={units}
        mode="edit"
      />
    </div>
  );
}