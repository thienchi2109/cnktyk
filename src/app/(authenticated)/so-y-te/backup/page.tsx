import { requireRole } from '@/lib/auth/server';
import { BackupCenterClient } from './backup-center-client';

export default async function BackupPage() {
  const session = await requireRole(['SoYTe']);

  return <BackupCenterClient adminName={session.user.username} />;
}
