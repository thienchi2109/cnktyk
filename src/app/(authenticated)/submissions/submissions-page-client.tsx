'use client';

import { useMemo, useState } from 'react';
import { SubmissionsList } from '@/components/submissions/submissions-list';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ActivitySubmissionForm } from '@/components/submissions/activity-submission-form';
import { SubmissionReview } from '@/components/submissions/submission-review';

interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  ChucDanh: string | null;
}

interface SubmissionsPageClientProps {
  userRole: string;
  practitioners: Practitioner[];
  initialPractitionerId?: string;
}

export function SubmissionsPageClient({ userRole, practitioners, initialPractitionerId }: SubmissionsPageClientProps) {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showViewSheet, setShowViewSheet] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const preparedPractitioners = useMemo(() => (
    (practitioners || []).map(p => ({
      MaNhanVien: p.MaNhanVien,
      HoVaTen: p.HoVaTen,
      SoCCHN: p.SoCCHN ?? null,
      ChucDanh: p.ChucDanh ?? null,
    }))
  ), [practitioners]);

  const handleCreateSubmission = () => {
    setShowCreateSheet(true);
  };

  const handleViewSubmission = (id: string) => {
    setSelectedSubmissionId(id);
    setShowViewSheet(true);
  };

  const handleCreated = () => {
    setShowCreateSheet(false);
    setRefreshKey(k => k + 1);
  };

  const handleReviewComplete = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <>
      <SubmissionsList
        userRole={userRole}
        onCreateSubmission={handleCreateSubmission}
        onViewSubmission={handleViewSubmission}
        refreshKey={refreshKey}
      />

      {/* Create Submission Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ghi nhận hoạt động</SheetTitle>
            <SheetDescription>Gửi hoạt động đào tạo liên tục để được phê duyệt</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ActivitySubmissionForm
              userRole={userRole}
              practitioners={preparedPractitioners}
              redirectOnSuccess={false}
              onSubmit={handleCreated}
              onCancel={() => setShowCreateSheet(false)}
              initialPractitionerId={initialPractitionerId}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* View Submission Sheet */}
      <Sheet 
        open={showViewSheet} 
        onOpenChange={(open) => {
          setShowViewSheet(open);
          if (!open) setSelectedSubmissionId(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chi tiết hoạt động</SheetTitle>
            <SheetDescription>Xem xét và phê duyệt hoạt động đào tạo liên tục</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedSubmissionId && (
              <SubmissionReview
                submissionId={selectedSubmissionId}
                userRole={userRole}
                onBack={() => setShowViewSheet(false)}
                onReviewComplete={handleReviewComplete}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
