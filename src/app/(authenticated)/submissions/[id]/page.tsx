import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { SubmissionReview } from '@/components/submissions/submission-review';

interface SubmissionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  return (
    <div className="container mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
          </div>
        }>
        <SubmissionReview
          submissionId={id}
          userRole={user.role}
        />
        </Suspense>
    </div>
  );
}