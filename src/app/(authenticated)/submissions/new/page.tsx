import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { ActivitySubmissionForm } from '@/components/submissions/activity-submission-form';

export default async function Page() {
  const session = await requireAuth();
  const role = session.user.role;

  let initialPractitionerId: string | undefined = undefined;
  let practitioners: Array<{ MaNhanVien: string; HoVaTen: string; SoCCHN: string | null; ChucDanh: string | null; }> = [];

  if (role === 'NguoiHanhNghe') {
    // Map current account to practitioner via new FK
    const row = await db.queryOne<{ MaNhanVien: string }>(
      'SELECT "MaNhanVien" FROM "TaiKhoan" WHERE "MaTaiKhoan" = $1 AND "MaNhanVien" IS NOT NULL LIMIT 1',
      [session.user.id]
    );
    initialPractitionerId = row?.MaNhanVien;
  } else if (role === 'DonVi' && session.user.unitId) {
    practitioners = await db.query(
      'SELECT "MaNhanVien", "HoVaTen", "SoCCHN", "ChucDanh" FROM "NhanVien" WHERE "MaDonVi" = $1 ORDER BY "HoVaTen" ASC',
      [session.user.unitId]
    );
  }

  return (
    <ActivitySubmissionForm 
      userRole={role}
      practitioners={practitioners}
      initialPractitionerId={initialPractitionerId}
      redirectOnSuccess={true}
      variant="page"
    />
  );
}