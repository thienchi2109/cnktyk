/**
 * SubmissionsSection Component
 *
 * Displays practitioner's activity submissions including summary statistics,
 * recent submissions preview table, and navigation to full submissions list.
 * Wraps existing SubmissionsSummaryCard and RecentSubmissionsTable components.
 *
 * @example
 * ```tsx
 * <SubmissionsSection
 *   practitionerId={practitioner.MaNhanVien}
 *   variant="full"
 *   userRole="DonVi"
 * />
 * ```
 */

'use client';

import { FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmissionsSummaryCard } from '@/components/practitioners/submissions-summary-card';
import { RecentSubmissionsTable } from '@/components/practitioners/recent-submissions-table';
import type { SectionVariant } from './types';

export interface SubmissionsSectionProps {
  practitionerId: string;
  variant?: SectionVariant;
  userRole?: string;
  onSelectSubmission?: (submissionId: string) => void;
}

export function SubmissionsSection({
  practitionerId,
  variant = 'full',
  userRole,
  onSelectSubmission,
}: SubmissionsSectionProps) {
  const buttonSize = variant === 'compact' ? 'default' : 'lg';

  const handleViewAll = () => {
    window.location.href = `/submissions?practitionerId=${practitionerId}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Hoạt động đã ghi nhận
      </h3>

      {/* Summary Card */}
      <SubmissionsSummaryCard practitionerId={practitionerId} />

      {/* Recent Submissions Table */}
      <RecentSubmissionsTable
        practitionerId={practitionerId}
        onSelectSubmission={onSelectSubmission}
      />

      {/* View All Button */}
      <Button
        variant="medical-secondary"
        className="w-full gap-2"
        size={buttonSize}
        onClick={handleViewAll}
      >
        Xem tất cả hoạt động
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
