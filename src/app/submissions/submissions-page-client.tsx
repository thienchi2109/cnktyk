'use client';

import { useState } from 'react';
import { SubmissionsList } from '@/components/submissions/submissions-list';
import { ActivitySubmissionForm } from '@/components/submissions/activity-submission-form';

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
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  const handleCreateSubmission = () => {
    setShowSubmissionForm(true);
  };

  const handleSubmissionComplete = (submissionId: string) => {
    setShowSubmissionForm(false);
    // Could add success notification here
  };

  const handleCancelSubmission = () => {
    setShowSubmissionForm(false);
  };

  if (showSubmissionForm) {
    return (
      <ActivitySubmissionForm
        userRole={userRole}
        practitioners={practitioners}
        onSubmit={handleSubmissionComplete}
        onCancel={handleCancelSubmission}
      />
    );
  }

  return (
    <SubmissionsList
      userRole={userRole}
      onCreateSubmission={handleCreateSubmission}
    />
  );
}