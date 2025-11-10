import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';

import { SubmissionReview } from '@/components/submissions/submission-review';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { getCurrentUser } from '@/lib/auth/server';

type SubmissionDetailPageProps = {
  params: {
    id?: string;
  };
};

export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const submissionId = params?.id;

  if (!submissionId) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <Suspense
        fallback={
          <LoadingNotice
            message="Đang tải chi tiết hoạt động..."
            align="left"
            size="sm"
            className="px-1"
          />
        }
      >
        <SubmissionReview submissionId={submissionId} userRole={user.role} />
      </Suspense>
    </div>
  );
}
