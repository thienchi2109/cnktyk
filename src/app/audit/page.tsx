/**
 * Audit Dashboard Page
 * Comprehensive audit log viewing and analysis
 */

import { Metadata } from 'next';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditLogViewer } from '@/components/audit/audit-log-viewer';

export const metadata: Metadata = {
  title: 'Nhật ký hệ thống | CNKTYKLT',
  description: 'Xem và phân tích nhật ký hoạt động hệ thống',
};

export default async function AuditPage() {
  const session = await getCurrentSession();

  // Only SoYTe and Auditor roles can access audit logs
  if (!session?.user || (session.user.role !== 'SoYTe' && session.user.role !== 'Auditor')) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <AuditLogViewer />
      </div>
    </div>
  );
}
