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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
          </div>
        }>
          <SubmissionReview
            submissionId={id}
            userRole={user.role}
            onBack={() => window.history.back()}
          />
        </Suspense>
      </div>
    </div>
  );
}