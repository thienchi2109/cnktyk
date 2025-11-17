'use client';

import { GlassCard } from '@/components/ui/glass-card';
import {
  DashboardKpiSkeleton,
  DashboardErrorCard,
} from '@/components/dashboard/dashboard-skeletons';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { usePerformanceSummary } from '@/hooks/use-performance-summary';
import type { ReportFilters } from '@/types/reports';

interface PerformanceSummaryReportProps {
  unitId: string;
  filters: ReportFilters;
}

export function PerformanceSummaryReport({
  unitId,
  filters,
}: PerformanceSummaryReportProps) {
  const { data, isLoading, error } = usePerformanceSummary(unitId, filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <DashboardKpiSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <DashboardErrorCard
        message="Không thể tải báo cáo tổng quan. Vui lòng thử lại."
        className="col-span-full"
      />
    );
  }

  if (!data || !data.currentPeriod) {
    return (
      <div className="glass-card p-12 text-center">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Không có dữ liệu
        </h3>
        <p className="text-gray-600">
          Không tìm thấy dữ liệu cho khoảng thời gian đã chọn
        </p>
      </div>
    );
  }

  const metrics = data.currentPeriod;

  return (
    <div className="space-y-6">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Practitioners */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100/50">
              <Users className="w-5 h-5 text-medical-blue" />
            </div>
            <span className="text-sm text-gray-600">Tổng số</span>
          </div>
          <p className="text-3xl font-bold text-medical-blue">
            {metrics.totalPractitioners}
          </p>
          <p className="text-xs text-gray-500 mt-1">Người hành nghề</p>
        </GlassCard>

        {/* Active Practitioners */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100/50">
              <TrendingUp className="w-5 h-5 text-medical-green" />
            </div>
            <span className="text-sm text-gray-600">Đang hoạt động</span>
          </div>
          <p className="text-3xl font-bold text-medical-green">
            {metrics.activePractitioners}
          </p>
          <p className="text-xs text-gray-500 mt-1">Người hành nghề</p>
        </GlassCard>

        {/* Compliance Rate */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100/50">
              <CheckCircle className="w-5 h-5 text-medical-green" />
            </div>
            <span className="text-sm text-gray-600">Tuân thủ</span>
          </div>
          <p className="text-3xl font-bold text-medical-green">
            {metrics.complianceRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Tỷ lệ hoàn thành</p>
        </GlassCard>

        {/* At Risk Practitioners */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-100/50">
              <AlertTriangle className="w-5 h-5 text-medical-red" />
            </div>
            <span className="text-sm text-gray-600">Rủi ro</span>
          </div>
          <p className="text-3xl font-bold text-medical-red">
            {metrics.atRiskPractitioners}
          </p>
          <p className="text-xs text-gray-500 mt-1">Cần theo dõi</p>
        </GlassCard>
      </div>

      {/* Activity Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Hoạt động trong kỳ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Approvals */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-100/50">
                <Clock className="w-5 h-5 text-medical-amber" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Chờ duyệt
              </span>
            </div>
            <p className="text-3xl font-bold text-medical-amber">
              {metrics.pendingApprovals}
            </p>
            <p className="text-xs text-gray-500 mt-1">Hoạt động</p>
          </GlassCard>

          {/* Approved Activities */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-100/50">
                <CheckCircle className="w-5 h-5 text-medical-green" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Đã duyệt
              </span>
            </div>
            <p className="text-3xl font-bold text-medical-green">
              {metrics.approvedActivities}
            </p>
            <p className="text-xs text-gray-500 mt-1">Hoạt động</p>
          </GlassCard>

          {/* Rejected Activities */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-100/50">
                <XCircle className="w-5 h-5 text-medical-red" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Từ chối
              </span>
            </div>
            <p className="text-3xl font-bold text-medical-red">
              {metrics.rejectedActivities}
            </p>
            <p className="text-xs text-gray-500 mt-1">Hoạt động</p>
          </GlassCard>
        </div>
      </div>

      {/* Summary Footer */}
      <GlassCard className="p-4">
        <div className="text-sm text-gray-600 text-center">
          <p>
            Báo cáo được tạo lúc:{' '}
            <span className="font-medium text-gray-800">
              {new Date().toLocaleString('vi-VN')}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Dữ liệu được cập nhật theo thời gian thực
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
