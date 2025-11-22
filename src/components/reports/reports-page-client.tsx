'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportErrorBoundary } from '@/components/reports/report-error-boundary';
import { FilterPanel } from '@/components/reports/filter-panel';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { PractitionerSelector } from '@/components/ui/practitioner-selector';
import { useUnitPractitioners } from '@/hooks/use-unit-practitioners';
import type { ReportType, ReportFilters, ComplianceReportFilters, ActivityReportFilters, PractitionerDetailFilters } from '@/types/reports';
import { subDays } from 'date-fns';

// Dynamic imports for code splitting - load reports only when needed
const PerformanceSummaryReport = dynamic(
  () => import('@/components/reports/performance-summary').then(mod => ({ default: mod.PerformanceSummaryReport })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

const ComplianceReport = dynamic(
  () => import('@/components/reports/compliance-report').then(mod => ({ default: mod.ComplianceReport })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
    ),
  }
);

const ActivityReport = dynamic(
  () => import('@/components/reports/activity-report').then(mod => ({ default: mod.ActivityReport })),
  {
    loading: () => (
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
    ),
  }
);

const PractitionerReport = dynamic(
  () => import('@/components/reports/practitioner-report').then(mod => ({ default: mod.PractitionerReport })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="glass-card p-6 animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full max-w-md mb-4"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 animate-pulse col-span-2 h-40"></div>
          <div className="glass-card p-6 animate-pulse h-40"></div>
        </div>
      </div>
    ),
  }
);

interface ReportsPageClientProps {
  unitId: string;
  userId: string;
}

export function ReportsPageClient({ unitId }: ReportsPageClientProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('performance');

  // Lazy load practitioners list - only fetch when Practitioner Detail tab is selected
  // This saves ~500ms on initial page load by not fetching up to 1000 practitioners unnecessarily
  const { data: practitioners } = useUnitPractitioners({
    unitId,
    enabled: selectedReport === 'practitioner' // Only fetch when user views practitioner tab
  });

  // Common Filters State
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

  // Activity-specific filters
  const [activityFilters, setActivityFilters] = useState<ActivityReportFilters>({
    startDate: subDays(new Date(), 30).toISOString(),
    endDate: new Date().toISOString(),
    preset: 'last_30_days',
    approvalStatus: 'all',
  });

  // Practitioner-specific filters
  const [practitionerFilters, setPractitionerFilters] = useState<Omit<PractitionerDetailFilters, 'practitionerId'>>({
    startDate: '',
    endDate: '',
    preset: 'current_cycle',
  });
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('');

  // Helper to count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedReport === 'performance') {
      if (filters.preset !== 'last_30_days') count++;
    } else if (selectedReport === 'compliance') {
      if (complianceFilters.preset !== 'last_30_days') count++;
      if (complianceFilters.employmentStatus?.length) count++;
      if (complianceFilters.position) count++;
    } else if (selectedReport === 'activities') {
      if (activityFilters.preset !== 'last_30_days') count++;
      if (activityFilters.activityType) count++;
      if (activityFilters.approvalStatus !== 'all') count++;
    } else if (selectedReport === 'practitioner') {
      if (selectedPractitionerId) count++;
      if (practitionerFilters.preset !== 'current_cycle') count++;
    }
    return count;
  };

  const handleResetFilters = () => {
    if (selectedReport === 'performance') {
      setFilters({
        startDate: subDays(new Date(), 30).toISOString(),
        endDate: new Date().toISOString(),
        preset: 'last_30_days',
      });
    } else if (selectedReport === 'compliance') {
      setComplianceFilters({
        startDate: subDays(new Date(), 30).toISOString(),
        endDate: new Date().toISOString(),
        preset: 'last_30_days',
      });
    } else if (selectedReport === 'activities') {
      setActivityFilters({
        startDate: subDays(new Date(), 30).toISOString(),
        endDate: new Date().toISOString(),
        preset: 'last_30_days',
        approvalStatus: 'all',
      });
    } else if (selectedReport === 'practitioner') {
      setPractitionerFilters({
        startDate: '',
        endDate: '',
        preset: 'current_cycle',
      });
      setSelectedPractitionerId('');
    }
  };

  // Drill-down navigation handler
  const handleNavigateToPractitioner = (practitionerId: string) => {
    setSelectedPractitionerId(practitionerId);
    setSelectedReport('practitioner');
  };

  const renderFilterPanel = () => {
    const commonProps = {
      activeFilterCount: getActiveFilterCount(),
      onReset: handleResetFilters,
      className: 'glass-card p-4 w-full shadow-sm',
    };

    if (selectedReport === 'performance') {
      return (
        <FilterPanel {...commonProps}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Thời gian</label>
              <DateRangeFilter
                startDate={filters.startDate}
                endDate={filters.endDate}
                onRangeChange={(range) => setFilters({ ...filters, ...range })}
              />
            </div>
          </div>
        </FilterPanel>
      );
    }

    if (selectedReport === 'compliance') {
      return (
        <FilterPanel {...commonProps}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Thời gian</label>
              <DateRangeFilter
                startDate={complianceFilters.startDate}
                endDate={complianceFilters.endDate}
                onRangeChange={(range) => setComplianceFilters({ ...complianceFilters, ...range })}
              />
            </div>
          </div>
        </FilterPanel>
      );
    }

    if (selectedReport === 'activities') {
      return (
        <FilterPanel {...commonProps}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Thời gian</label>
              <DateRangeFilter
                startDate={activityFilters.startDate}
                endDate={activityFilters.endDate}
                onRangeChange={(range) => setActivityFilters({ ...activityFilters, ...range })}
              />
            </div>
          </div>
        </FilterPanel>
      );
    }

    if (selectedReport === 'practitioner') {
      return (
        <FilterPanel {...commonProps}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Người hành nghề</label>
              <PractitionerSelector
                practitioners={practitioners || []}
                value={selectedPractitionerId}
                onValueChange={setSelectedPractitionerId}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Thời gian</label>
              <DateRangeFilter
                startDate={practitionerFilters.startDate}
                endDate={practitionerFilters.endDate}
                onRangeChange={(range) => setPractitionerFilters({ ...practitionerFilters, ...range })}
              />
            </div>
          </div>
        </FilterPanel>
      );
    }

    return null;
  };

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

        <div className="w-full">{renderFilterPanel()}</div>

        {/* Performance Summary Report */}
        <TabsContent value="performance" className="space-y-6 mt-0">
          <ReportErrorBoundary>
            <PerformanceSummaryReport unitId={unitId} filters={filters} />
          </ReportErrorBoundary>
        </TabsContent>

        {/* Compliance Report */}
        <TabsContent value="compliance" className="space-y-6 mt-0">
          <ReportErrorBoundary>
            <ComplianceReport
              unitId={unitId}
              filters={complianceFilters}
              onNavigateToPractitioner={handleNavigateToPractitioner}
            />
          </ReportErrorBoundary>
        </TabsContent>

        {/* Activity Report */}
        <TabsContent value="activities" className="space-y-6 mt-0">
          <ReportErrorBoundary>
            <ActivityReport
              unitId={unitId}
              filters={{
                startDate: activityFilters.startDate ? new Date(activityFilters.startDate) : undefined,
                endDate: activityFilters.endDate ? new Date(activityFilters.endDate) : undefined,
                activityType: activityFilters.activityType,
                approvalStatus: activityFilters.approvalStatus,
                practitionerId: activityFilters.practitionerId,
              }}
            />
          </ReportErrorBoundary>
        </TabsContent>

        {/* Practitioner Detail Report */}
        <TabsContent value="practitioner" className="space-y-6 mt-0">
          <ReportErrorBoundary>
            <PractitionerReport
              unitId={unitId}
              filters={practitionerFilters}
              practitionerId={selectedPractitionerId}
            />
          </ReportErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
