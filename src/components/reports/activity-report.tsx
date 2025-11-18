'use client';

import { useEffect, useMemo, useState } from 'react';
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

type RangePreset = 'this_month' | 'last_6_months' | 'this_year' | 'all_time' | 'custom';

const getPresetRange = (preset: RangePreset) => {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined = now;

  switch (preset) {
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_6_months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all_time':
      startDate = undefined;
      endDate = undefined;
      break;
    default:
      break;
  }

  return { startDate, endDate };
};

export function ActivityReport({ unitId, filters }: ActivityReportProps) {
  const initialPreset: RangePreset = filters.startDate || filters.endDate ? 'custom' : 'this_month';
  const [rangePreset, setRangePreset] = useState<RangePreset>(initialPreset);
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>(() => {
    if (filters.startDate || filters.endDate) {
      return { startDate: filters.startDate, endDate: filters.endDate };
    }
    return getPresetRange('this_month');
  });

  useEffect(() => {
    if (filters.startDate || filters.endDate) {
      setDateRange({ startDate: filters.startDate, endDate: filters.endDate });
      setRangePreset('custom');
      return;
    }

    setRangePreset('this_month');
    setDateRange((current) => {
      const presetRange = getPresetRange('this_month');
      const sameStart = current.startDate?.getTime() === presetRange.startDate?.getTime();
      const sameEnd = current.endDate?.getTime() === presetRange.endDate?.getTime();
      return sameStart && sameEnd ? current : presetRange;
    });
  }, [filters.startDate?.toISOString(), filters.endDate?.toISOString()]);

  const handlePresetChange = (preset: typeof rangePreset) => {
    const presetRange = getPresetRange(preset);
    setRangePreset(preset);
    setDateRange(presetRange);
  };

  const buttonClass = (preset: typeof rangePreset) =>
    `px-3 py-1 text-sm rounded-lg border transition-colors ${
      rangePreset === preset
        ? 'bg-medical-blue/20 text-medical-blue border-medical-blue/40'
        : 'bg-white/30 text-gray-700 border-white/60 hover:bg-white/50'
    }`;

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [filters, dateRange.startDate, dateRange.endDate]
  );

  const { data, isLoading, error } = useActivityReport(unitId, effectiveFilters);

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('vi-VN') : '—';

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
      {/* Quick date presets */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          className={buttonClass('this_month')}
          onClick={() => handlePresetChange('this_month')}
        >
          Trong tháng
        </button>
        <button
          className={buttonClass('last_6_months')}
          onClick={() => handlePresetChange('last_6_months')}
        >
          6 tháng
        </button>
        <button
          className={buttonClass('this_year')}
          onClick={() => handlePresetChange('this_year')}
        >
          Trong năm
        </button>
        <button
          className={buttonClass('all_time')}
          onClick={() => handlePresetChange('all_time')}
        >
          Tất cả
        </button>
      </div>

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

      {/* Recent activities table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
            <p className="text-sm text-gray-600">10 hoạt động mới nhất trong phạm vi lọc</p>
          </div>
        </div>
        {data.recentActivities.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">
            Chưa có hoạt động nào trong khoảng thời gian này.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/30">
                  <th className="py-3 pr-6 font-semibold text-gray-700 w-[25rem]">Hoạt động</th>
                  <th className="py-3 pr-4 font-semibold text-gray-700">Loại</th>
                  <th className="py-3 pr-4 font-semibold text-gray-700">Tín chỉ</th>
                  <th className="py-3 pr-2 font-semibold text-gray-700 w-32 text-center">Trạng thái</th>
                  <th className="py-3 font-semibold text-gray-700 text-right">Ngày ghi nhận</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivities.map((item) => (
                  <tr key={item.id} className="border-b border-white/10">
                    <td className="py-3 pr-6 text-gray-900 break-words max-w-[24rem]">
                      {item.name}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{item.type}</td>
                    <td className="py-3 pr-4 text-gray-900 font-medium">{item.credits}</td>
                    <td className="py-3 pr-2 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'DaDuyet'
                            ? 'bg-medical-green/20 text-medical-green'
                            : item.status === 'ChoDuyet'
                            ? 'bg-medical-amber/20 text-medical-amber'
                            : 'bg-medical-red/20 text-medical-red'
                        }`}
                      >
                        {item.status === 'DaDuyet'
                          ? 'Đã duyệt'
                          : item.status === 'ChoDuyet'
                          ? 'Chờ duyệt'
                          : 'Từ chối'}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-700">{formatDate(item.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
