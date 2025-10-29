import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { BulkAssignmentWizard } from '@/components/submissions/bulk-assignment-wizard';

export default async function BulkAssignmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/signin');
  if (!['DonVi', 'SoYTe'].includes(user.role)) redirect('/auth/error?error=AccessDenied');

  return (
    <div className="max-w-7xl mx-auto">
      <BulkAssignmentWizard />
    </div>
  );
}