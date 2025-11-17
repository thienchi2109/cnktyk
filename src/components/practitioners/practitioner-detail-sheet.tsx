'use client';

/**
 * Practitioner Detail Sheet Component
 * Displays detailed information about a practitioner in a slide-out panel
 * Refactored to use shared section components for consistency
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { practitionerRecentSubmissionsQueryKey } from '@/hooks/use-practitioner-recent-submissions';
import { practitionerSubmissionsSummaryQueryKey } from '@/hooks/use-practitioner-submissions-summary';
import { Maximize, PenLine } from 'lucide-react';
import { PractitionerForm } from './practitioner-form';
import { SubmissionReview } from '@/components/submissions/submission-review';
import {
  BasicInfoSection,
  LicenseInfoSection,
  ContactInfoSection,
  ComplianceStatusSection,
  SubmissionsSection,
} from './practitioner-detail-sections';

interface PractitionerDetailSheetProps {
  practitionerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
  onUpdate?: () => void;
  userRole: 'SoYTe' | 'DonVi' | 'NguoiHanhNghe' | 'Auditor' | string;
}

export function PractitionerDetailSheet({
  practitionerId,
  open,
  onOpenChange,
  canEdit = false,
  units = [],
  onUpdate,
  userRole
}: PractitionerDetailSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);

  useEffect(() => {
    if (open && practitionerId) {
      fetchPractitionerDetails();
      setIsEditing(false); // Reset edit mode when opening
    }
  }, [open, practitionerId]);

  const fetchPractitionerDetails = async () => {
    if (!practitionerId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/practitioners/${practitionerId}`);
      if (response.ok) {
        const data = await response.json();
        setPractitioner(data);
      }
    } catch (error) {
      console.error('Error fetching practitioner details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!practitionerId) return;
    const ok = window.confirm('Xác nhận vô hiệu hóa người hành nghề này?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/practitioners/${practitionerId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Xóa (vô hiệu) thất bại');
      }
      // Invalidate list cache
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      if (onUpdate) onUpdate();
      onOpenChange(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể vô hiệu hóa');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Chỉnh sửa người hành nghề' : 'Chi tiết người hành nghề'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Cập nhật thông tin người hành nghề' : 'Thông tin chi tiết và trạng thái tuân thủ'}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <LoadingNotice message="Đang tải thông tin người hành nghề..." align="left" size="sm" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isEditing && practitioner ? (
          <div className="mt-6">
            <PractitionerForm
              initialData={practitioner}
              units={units}
              mode="edit"
              variant="sheet"
              userRole={userRole}
              onSuccess={() => {
                setIsEditing(false);
                fetchPractitionerDetails();
                if (onUpdate) onUpdate();
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : practitioner ? (
          <div className="mt-6 space-y-6">
            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!isEditing && practitionerId && (
                <Button
                  variant="medical"
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-medical-blue to-blue-600 hover:from-medical-blue/90 hover:to-blue-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                  onClick={() => router.push(`/practitioners/${practitionerId}`)}
                >
                  <Maximize className="w-5 h-5" />
                  Xem Hồ Sơ Đầy Đủ
                </Button>
              )}

              {canEdit && !isEditing && (
                <Button
                  variant="medical-secondary"
                  size="lg"
                  onClick={() => setIsEditing(true)}
                >
                  <PenLine className="w-4 h-4 mr-2" />
                  Chỉnh sửa
                </Button>
              )}

              {practitionerId && (
                <Button
                  variant="medical-secondary"
                  size="lg"
                  onClick={() => router.push(`/submissions?practitionerId=${practitionerId}`)}
                >
                  Xem tất cả hoạt động
                </Button>
              )}
            </div>

            {/* Basic Information Section */}
            <BasicInfoSection
              practitioner={practitioner}
              variant="compact"
              showEdit={false}
            />

            {/* License Information Section */}
            <LicenseInfoSection
              practitioner={practitioner}
              variant="compact"
            />

            {/* Contact Information Section */}
            <ContactInfoSection
              practitioner={practitioner}
              variant="compact"
            />

            {/* Compliance Status Section */}
            {practitioner.complianceStatus && (
              <ComplianceStatusSection
                complianceStatus={practitioner.complianceStatus}
                variant="compact"
              />
            )}

            {/* Activity Submissions Section */}
            {practitionerId && (
              <SubmissionsSection
                practitionerId={practitionerId}
                variant="compact"
                userRole={userRole}
                showViewAllButton={false}
                onSelectSubmission={(submissionId) => {
                  setSelectedSubmissionId(submissionId);
                  setShowSubmissionDialog(true);
                }}
              />
            )}
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-500">
            Không tìm thấy thông tin người hành nghề
          </div>
        )}

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
                      // Invalidate submission queries
                      queryClient.invalidateQueries({ queryKey: practitionerRecentSubmissionsQueryKey(practitionerId) });
                      queryClient.invalidateQueries({ queryKey: practitionerSubmissionsSummaryQueryKey(practitionerId) });
                      // Refresh practitioner data to update compliance status/credits
                      fetchPractitionerDetails();
                    }
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

      </SheetContent>
    </Sheet>
  );
}
