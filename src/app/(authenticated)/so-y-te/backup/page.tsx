import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { BackupCenterClient } from './backup-center-client';

export default async function BackupPage() {
  const session = await requireAuth();

  if (session.user.role !== 'SoYTe') {
    redirect('/dashboard');
  }

  return <BackupCenterClient adminName={session.user.username} />;
}
