'use client';

/**
 * Recent Submissions Table Component
 * Displays the last 5 submissions for a practitioner in a preview table
 */

import { usePractitionerRecentSubmissions } from '@/hooks/use-practitioner-recent-submissions';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RecentSubmissionsTableProps {
  practitionerId: string;
  onSelectSubmission?: (submissionId: string) => void;
}

export function RecentSubmissionsTable({ practitionerId, onSelectSubmission }: RecentSubmissionsTableProps) {
  const { data, isLoading, isError, error, refetch } = usePractitionerRecentSubmissions(practitionerId);

  const getStatusBadge = (status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi') => {
    switch (status) {
      case 'ChoDuyet':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Chờ duyệt
          </Badge>
        );
      case 'DaDuyet':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đã duyệt
          </Badge>
        );
      case 'TuChoi':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Từ chối
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <GlassCard className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
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
          {(error as Error)?.message || 'Không thể tải danh sách hoạt động gần đây.'}
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

  const submissions = data?.data || [];

  return (
    <GlassCard className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-medical-blue" />
          <h4 className="font-semibold text-gray-900">Hoạt động gần đây</h4>
          {submissions.length > 0 && (
            <span className="text-sm text-gray-500">({submissions.length} hoạt động)</span>
          )}
        </div>

        {/* Table */}
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Chưa có hoạt động gần đây</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Hoạt động
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Ngày
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Trạng thái
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Tín chỉ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {submissions.map((submission) => (
                    <tr
                      key={submission.MaGhiNhan}
                      className={`hover:bg-gray-50/60 transition cursor-pointer ${onSelectSubmission ? 'focus-within:bg-gray-50/80' : ''}`}
                      onClick={() => onSelectSubmission?.(submission.MaGhiNhan)}
                      role={onSelectSubmission ? 'button' : undefined}
                      tabIndex={onSelectSubmission ? 0 : -1}
                      onKeyDown={(e) => {
                        if (!onSelectSubmission) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectSubmission(submission.MaGhiNhan);
                        }
                      }}
                    >
                      <td className="px-3 py-3 max-w-[200px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="font-medium text-gray-900 truncate cursor-help">
                              {submission.TenHoatDong}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {submission.TenHoatDong}
                          </TooltipContent>
                        </Tooltip>
                        {submission.activityCatalog && (
                          <p className="text-xs text-gray-500 truncate">
                            {submission.activityCatalog.TenDanhMuc}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                        {formatDate(submission.NgayGhiNhan)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getStatusBadge(submission.TrangThaiDuyet)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-gray-900">
                        {submission.SoGioTinChiQuyDoi !== null
                          ? submission.SoGioTinChiQuyDoi.toFixed(1)
                          : '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
      </div>
    </GlassCard>
  );
}
