'use client';

import { useActivityReport } from '@/hooks/use-activity-report';
import type { ActivityReportFilters } from '@/types/reports';
import { ActivityDonutChart } from './charts/activity-donut-chart';
import { ActivityTimelineChart } from './charts/activity-timeline-chart';
import { ActivityTypeBarChart } from './charts/activity-type-bar-chart';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ActivityReportProps {
  unitId: string;
  filters: Omit<ActivityReportFilters, 'startDate' | 'endDate'> & { startDate?: Date; endDate?: Date };
}

export function ActivityReport({ unitId, filters }: ActivityReportProps) {
  const { data, isLoading, error } = useActivityReport(unitId, filters);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="glass-card p-6 animate-pulse">
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Có lỗi xảy ra</h3>
          <p className="text-sm text-gray-600">
            Không thể tải dữ liệu báo cáo. Vui lòng thử lại sau.
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.summary.totalSubmissions === 0) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có dữ liệu</h3>
          <p className="text-sm text-gray-600">
            Chưa có hoạt động nào được ghi nhận trong khoảng thời gian này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Submissions */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng số</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.summary.totalSubmissions}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Pending */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chờ duyệt</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {data.summary.pendingCount}
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* Approved */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đã duyệt</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {data.summary.approvedCount}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Rejected */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Từ chối</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {data.summary.rejectedCount}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Average Approval Time */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">TB duyệt (ngày)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.summary.averageApprovalDays.toFixed(1)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Charts Row 1: Status Distribution & Activity Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Phân bố theo trạng thái
          </h3>
          <ActivityDonutChart data={data.byStatus} />
        </div>

        {/* Activity Type Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Phân bố theo loại hoạt động
          </h3>
          <ActivityTypeBarChart data={data.byActivityType} />
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Xu hướng theo tháng
        </h3>
        <ActivityTimelineChart data={data.timeline} />
      </div>

      {/* Approval Efficiency Metrics */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Hiệu suất duyệt
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/50 rounded-lg border border-white/60">
            <p className="text-sm font-medium text-gray-600">Nhanh nhất</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              {data.approvalMetrics.fastestApproval.toFixed(1)} ngày
            </p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg border border-white/60">
            <p className="text-sm font-medium text-gray-600">Trung bình</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {data.approvalMetrics.avgDaysToApproval.toFixed(1)} ngày
            </p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg border border-white/60">
            <p className="text-sm font-medium text-gray-600">Chậm nhất</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {data.approvalMetrics.slowestApproval.toFixed(1)} ngày
            </p>
          </div>
        </div>
      </div>

      {/* Footer timestamp */}
      <div className="text-xs text-gray-500 text-center">
        Cập nhật lúc: {new Date().toLocaleString('vi-VN')}
      </div>
    </div>
  );
}
