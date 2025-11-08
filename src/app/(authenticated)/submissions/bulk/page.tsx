import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { BulkSubmissionWizard } from '@/components/submissions/bulk-submission-wizard';

export default async function BulkSubmissionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/signin');
  if (!['DonVi', 'SoYTe'].includes(user.role)) redirect('/auth/error?error=AccessDenied');

  return (
    <div className="max-w-7xl mx-auto">
      <BulkSubmissionWizard />
    </div>
  );
}
