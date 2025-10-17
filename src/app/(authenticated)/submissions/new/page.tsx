import { requireAuth } from '@/lib/auth/server';
import { nhanVienRepo } from '@/lib/db/repositories';
import { redirect } from 'next/navigation';
import { ActivitySubmissionForm } from '@/components/submissions/activity-submission-form';

export default async function NewSubmissionPage() {
  const session = await requireAuth();
  const { user } = session;

  // Only allow Practitioner and Unit Admin
  if (!['NguoiHanhNghe', 'DonVi'].includes(user.role)) {
    redirect('/submissions');
  }

  // Load practitioners list for Unit Admin (restricted to user's unit)
  let practitioners: Array<{ MaNhanVien: string; HoVaTen: string; SoCCHN: string | null; ChucDanh: string | null; }> = [];
  if (user.role === 'DonVi' && user.unitId) {
    const list = await nhanVienRepo.findByUnit(user.unitId);
    practitioners = list.map((p: any) => ({
      MaNhanVien: p.MaNhanVien,
      HoVaTen: p.HoVaTen,
      SoCCHN: p.SoCCHN ?? null,
      ChucDanh: p.ChucDanh ?? null,
    }));
  }

  return (
    <div className="container mx-auto py-6">
      <ActivitySubmissionForm
        userRole={user.role}
        practitioners={practitioners}
      />
    </div>
  );
}