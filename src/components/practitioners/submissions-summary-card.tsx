'use client';

/**
 * Submissions Summary Card Component
 * Displays summary statistics for a practitioner's submissions (counts by status)
 */

import { usePractitionerSubmissionsSummary } from '@/hooks/use-practitioner-submissions-summary';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubmissionsSummaryCardProps {
  practitionerId: string;
}

export function SubmissionsSummaryCard({ practitionerId }: SubmissionsSummaryCardProps) {
  const { data, isLoading, isError, error, refetch } = usePractitionerSubmissionsSummary(practitionerId);

  // Loading state
  if (isLoading) {
    return (
      <GlassCard className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          {(error as Error)?.message || 'Không thể tải dữ liệu tóm tắt hoạt động.'}
          <Button
            variant="link"
            size="sm"
            onClick={() => refetch()}
            className="ml-2 text-red-700 underline"
          >
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const summary = data?.summary;

  if (!summary) {
    return null;
  }

  return (
    <GlassCard className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-medical-blue" />
          <h4 className="font-semibold text-gray-900">Tóm tắt hoạt động</h4>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pending */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-800">Chờ duyệt</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">{summary.pending}</p>
          </div>

          {/* Approved */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-800">Đã duyệt</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{summary.approved}</p>
          </div>

          {/* Rejected */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-red-800">Từ chối</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{summary.rejected}</p>
          </div>

          {/* Total */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-800">Tổng cộng</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>
        </div>

        {/* Empty state hint */}
        {summary.total === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">
            Người hành nghề chưa có hoạt động nào
          </p>
        )}
      </div>
    </GlassCard>
  );
}
