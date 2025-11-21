'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import {
  DashboardKpiSkeleton,
  DashboardCardSkeleton,
  DashboardErrorCard,
} from '@/components/dashboard/dashboard-skeletons';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingDown,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { useComplianceReport } from '@/hooks/use-compliance-report';
import { CompliancePieChart } from '@/components/reports/charts/compliance-pie-chart';
import { ComplianceBarChart } from '@/components/reports/charts/compliance-bar-chart';
import type { ComplianceReportFilters } from '@/types/reports';

interface ComplianceReportProps {
  unitId: string;
  filters: ComplianceReportFilters;
  onNavigateToPractitioner?: (practitionerId: string) => void;
}

export function ComplianceReport({ unitId, filters, onNavigateToPractitioner }: ComplianceReportProps) {
  const [page, setPage] = useState(1);
  const [showTopPerformers, setShowTopPerformers] = useState(true);
  const limit = 50; // Default limit as per API

  const { data: response, isLoading, error } = useComplianceReport(unitId, filters, { page, limit });
  const data = response?.data;
  const pagination = response?.pagination;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleLoadMore = () => {
    if (pagination && page < pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <DashboardKpiSkeleton key={index} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <DashboardCardSkeleton lines={10} />
          <DashboardCardSkeleton lines={10} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <DashboardErrorCard
        message="Không thể tải báo cáo tuân thủ. Vui lòng thử lại."
        className="col-span-full"
      />
    );
  }

  if (!data || !data.summary) {
    return (
      <div className="glass-card p-12 text-center">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Không có dữ liệu
        </h3>
        <p className="text-gray-600">
          Không tìm thấy dữ liệu tuân thủ cho khoảng thời gian đã chọn
        </p>
      </div>
    );
  }

  const { summary, distribution, practitioners } = data;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
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
            {summary.totalPractitioners}
          </p>
          <p className="text-xs text-gray-500 mt-1">Người hành nghề</p>
        </GlassCard>

        {/* Compliant */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100/50">
              <CheckCircle className="w-5 h-5 text-medical-green" />
            </div>
            <span className="text-sm text-gray-600">Đạt chuẩn</span>
          </div>
          <p className="text-3xl font-bold text-medical-green">
            {summary.compliantCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">≥90% tín chỉ</p>
        </GlassCard>

        {/* At Risk */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-100/50">
              <AlertTriangle className="w-5 h-5 text-medical-amber" />
            </div>
            <span className="text-sm text-gray-600">Cần theo dõi</span>
          </div>
          <p className="text-3xl font-bold text-medical-amber">
            {summary.atRiskCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">70-89% tín chỉ</p>
        </GlassCard>

        {/* Critical */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-100/50">
              <XCircle className="w-5 h-5 text-medical-red" />
            </div>
            <span className="text-sm text-gray-600">Rủi ro cao</span>
          </div>
          <p className="text-3xl font-bold text-medical-red">
            {summary.criticalCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">&lt;70% tín chỉ</p>
        </GlassCard>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart: Distribution */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Phân bổ tuân thủ
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Phân loại {summary.totalPractitioners} người hành nghề theo mức độ tuân thủ
          </p>
          <CompliancePieChart data={distribution} />
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Tỷ lệ tuân thủ trung bình:{' '}
              <span className="font-semibold text-medical-green">
                {summary.complianceRate}%
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Trung bình tín chỉ: {summary.averageCredits.toFixed(1)}/120
            </p>
          </div>
        </GlassCard>

        {/* Bar Chart: Credits by Practitioner */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Phân tích tín chỉ
              </h3>
              <p className="text-sm text-gray-600">
                {showTopPerformers ? 'Top 10 cao nhất' : 'Top 10 thấp nhất'}
              </p>
            </div>
            <button
              onClick={() => setShowTopPerformers(!showTopPerformers)}
              className="px-3 py-1 text-sm bg-white/30 hover:bg-white/50 rounded-lg transition-colors"
            >
              {showTopPerformers ? (
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  Thấp nhất
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Cao nhất
                </span>
              )}
            </button>
          </div>
          <ComplianceBarChart
            data={practitioners}
            limit={10}
            showTopPerformers={showTopPerformers}
            onBarClick={onNavigateToPractitioner}
          />
        </GlassCard>
      </div>

      {/* Pagination Section */}
      {pagination && pagination.totalCount > 0 && (
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Hiển thị{' '}
              <span className="font-semibold text-gray-800">
                {Math.min(page * limit, pagination.totalCount)}
              </span>{' '}
              trong tổng số{' '}
              <span className="font-semibold text-gray-800">
                {pagination.totalCount}
              </span>{' '}
              người hành nghề
            </div>

            {page < pagination.totalPages && (
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-4 py-2 bg-medical-blue/10 hover:bg-medical-blue/20 text-medical-blue rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Tải thêm</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500 text-center">
            Trang {pagination.page} / {pagination.totalPages}
          </div>
        </GlassCard>
      )}

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
