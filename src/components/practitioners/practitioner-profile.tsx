'use client';

/**
 * PractitionerProfile Component
 * Full-page standalone view for practitioner details
 * Refactored to use shared section components with full variant
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { practitionerRecentSubmissionsQueryKey } from '@/hooks/use-practitioner-recent-submissions';
import { practitionerSubmissionsSummaryQueryKey } from '@/hooks/use-practitioner-submissions-summary';
import { PractitionerForm } from './practitioner-form';
import { SubmissionReview } from '@/components/submissions/submission-review';
import {
  BasicInfoSection,
  LicenseInfoSection,
  ContactInfoSection,
  ComplianceStatusSection,
  SubmissionsSection,
} from './practitioner-detail-sections';

import type { PractitionerDetailData, ComplianceStatusData } from './practitioner-detail-sections';

interface PractitionerProfileProps {
  practitionerId: string;
  userRole: string;
  userUnitId?: string;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
}

export function PractitionerProfile({ practitionerId, userRole, userUnitId, units = [] }: PractitionerProfileProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);

  useEffect(() => {
    fetchPractitioner();
  }, [practitionerId]);

  const fetchPractitioner = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/practitioners/${practitionerId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Practitioner not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this practitioner');
        }
        throw new Error('Failed to fetch practitioner details');
      }

      const data = await response.json();
      setPractitioner(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = userRole === 'SoYTe' ||
    (userRole === 'DonVi' && practitioner?.MaDonVi === userUnitId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!practitioner) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        <Alert>
          <AlertDescription>Không tìm thấy người hành nghề.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-3xl font-bold page-title">{practitioner.HoVaTen}</h1>
            <p className="text-gray-600">{practitioner.ChucDanh || 'Người hành nghề y tế'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information Section */}
          <BasicInfoSection
            practitioner={practitioner}
            variant="full"
            showEdit={canEdit}
            onEdit={() => setShowEditSheet(true)}
          />

          {/* License Information Section */}
          <LicenseInfoSection
            practitioner={practitioner}
            variant="full"
          />

          {/* Contact Information Section */}
          <ContactInfoSection
            practitioner={practitioner}
            variant="full"
          />

          {/* Activity Submissions Section (NEW) */}
          {practitionerId && (
            <SubmissionsSection
              practitionerId={practitionerId}
              variant="full"
              userRole={userRole}
              onSelectSubmission={(submissionId) => {
                setSelectedSubmissionId(submissionId);
                setShowSubmissionDialog(true);
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compliance Status Section */}
          {practitioner.complianceStatus && (
            <ComplianceStatusSection
              complianceStatus={practitioner.complianceStatus}
              variant="full"
            />
          )}
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>Chỉnh sửa người hành nghề</SheetTitle>
            <SheetDescription>
              Cập nhật thông tin người hành nghề
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <PractitionerForm
              initialData={practitioner}
              units={units}
              mode="edit"
              variant="sheet"
              userRole={userRole}
              onSuccess={() => {
                setShowEditSheet(false);
                fetchPractitioner();
              }}
              onCancel={() => setShowEditSheet(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Submission Review Dialog */}
      <Dialog
        open={showSubmissionDialog}
        onOpenChange={(open) => {
          setShowSubmissionDialog(open);
          if (!open) {
            setSelectedSubmissionId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hoạt động</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedSubmissionId && (
              <SubmissionReview
                submissionId={selectedSubmissionId}
                userRole={userRole}
                showHeading={false}
                onBack={() => setShowSubmissionDialog(false)}
                onReviewComplete={() => {
                  if (practitionerId) {
                    queryClient.invalidateQueries({ queryKey: practitionerRecentSubmissionsQueryKey(practitionerId) });
                    queryClient.invalidateQueries({ queryKey: practitionerSubmissionsSummaryQueryKey(practitionerId) });
                  }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
