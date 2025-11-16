'use client';

import { useState } from 'react';
import { Building, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceSummaryReport } from '@/components/reports/performance-summary';
import { ComplianceReport } from '@/components/reports/compliance-report';
import type { ReportType, ReportFilters, ComplianceReportFilters } from '@/types/reports';
import { subDays } from 'date-fns';

interface ReportsPageClientProps {
  unitId: string;
  userId: string;
}

export function ReportsPageClient({ unitId, userId }: ReportsPageClientProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('performance');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: subDays(new Date(), 30).toISOString(),
    endDate: new Date().toISOString(),
    preset: 'last_30_days',
  });

  // Compliance-specific filters
  const [complianceFilters, setComplianceFilters] = useState<ComplianceReportFilters>({
    startDate: subDays(new Date(), 30).toISOString(),
    endDate: new Date().toISOString(),
    preset: 'last_30_days',
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-medical-blue/10 backdrop-blur-sm">
            <BarChart3 className="w-8 h-8 text-medical-blue" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 page-title">
              Báo cáo phân tích
            </h1>
            <p className="text-gray-600">Phân tích và đánh giá hiệu suất đơn vị</p>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <Tabs
        value={selectedReport}
        onValueChange={(value) => setSelectedReport(value as ReportType)}
        className="space-y-6"
      >
        <TabsList className="glass-card p-1 grid w-full grid-cols-4 gap-1">
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-medical-blue/20 data-[state=active]:text-medical-blue transition-all"
          >
            <span className="hidden sm:inline">Tổng quan</span>
            <span className="sm:hidden">TQ</span>
          </TabsTrigger>
          <TabsTrigger
            value="compliance"
            className="data-[state=active]:bg-medical-blue/20 data-[state=active]:text-medical-blue transition-all"
          >
            <span className="hidden sm:inline">Tuân thủ</span>
            <span className="sm:hidden">TT</span>
          </TabsTrigger>
          <TabsTrigger
            value="activities"
            className="data-[state=active]:bg-medical-blue/20 data-[state=active]:text-medical-blue transition-all"
          >
            <span className="hidden sm:inline">Hoạt động</span>
            <span className="sm:hidden">HĐ</span>
          </TabsTrigger>
          <TabsTrigger
            value="practitioner"
            className="data-[state=active]:bg-medical-blue/20 data-[state=active]:text-medical-blue transition-all"
          >
            <span className="hidden sm:inline">Chi tiết</span>
            <span className="sm:hidden">CT</span>
          </TabsTrigger>
        </TabsList>

        {/* Performance Summary Report */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceSummaryReport unitId={unitId} filters={filters} />
        </TabsContent>

        {/* Compliance Report */}
        <TabsContent value="compliance" className="space-y-6">
          <ComplianceReport unitId={unitId} filters={complianceFilters} />
        </TabsContent>

        {/* Activity Report - Placeholder for Phase 2 */}
        <TabsContent value="activities" className="space-y-6">
          <div className="glass-card p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Báo cáo hoạt động
            </h3>
            <p className="text-gray-600">
              Tính năng này sẽ được triển khai trong Phase 2
            </p>
          </div>
        </TabsContent>

        {/* Practitioner Detail - Placeholder for Phase 3 */}
        <TabsContent value="practitioner" className="space-y-6">
          <div className="glass-card p-12 text-center">
            <Building className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Báo cáo chi tiết cá nhân
            </h3>
            <p className="text-gray-600">
              Tính năng này sẽ được triển khai trong Phase 3
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
