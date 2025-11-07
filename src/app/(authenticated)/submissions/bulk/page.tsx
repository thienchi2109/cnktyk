import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { BulkSubmissionWizard } from '@/components/submissions/bulk-submission-wizard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ghi nhận hàng loạt | Hệ thống quản lý',
  description: 'Tạo bản ghi hoạt động hàng loạt cho nhóm người hành nghề',
};

export default async function BulkEnrollmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/signin');
  if (!['DonVi', 'SoYTe'].includes(user.role)) redirect('/auth/error?error=AccessDenied');

  return (
    <div className="max-w-7xl mx-auto">
      <BulkSubmissionWizard />
    </div>
  );
}