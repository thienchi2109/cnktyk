'use client';

import { useRouter } from 'next/navigation';
import { SubmissionsList } from '@/components/submissions/submissions-list';

interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  ChucDanh: string | null;
}

interface SubmissionsPageClientProps {
  userRole: string;
  practitioners: Practitioner[];
}

export function SubmissionsPageClient({ userRole, practitioners }: SubmissionsPageClientProps) {
  const router = useRouter();

  const handleCreateSubmission = () => {
    router.push('/submissions/new');
  };

  return (
    <SubmissionsList
      userRole={userRole}
      onCreateSubmission={handleCreateSubmission}
    />
  );
}
