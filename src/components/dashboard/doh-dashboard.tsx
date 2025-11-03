'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Award,
  Download,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import {
  DashboardCardSkeleton,
  DashboardErrorCard,
  DashboardErrorPanel,
} from '@/components/dashboard/dashboard-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { UnitComparisonGrid } from '@/components/dashboard/unit-comparison-grid';
import { fetchUnitMetrics, unitMetricsQueryKey } from '@/lib/dashboard/unit-metrics';
import type { UnitComparisonSummary, UnitMetrics } from '@/types/dashboard';

interface SystemMetrics {
  totalUnits: number;
  totalPractitioners: number;
  activePractitioners: number;
  complianceRate: number;
  totalSubmissions: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  totalCreditsAwarded: number;
  atRiskPractitioners: number;
}

type UnitComparisonRow = UnitComparisonSummary;

type UnitSortField = 'name' | 'compliance' | 'practitioners' | 'pending' | 'totalCredits';
interface UnitSortState {
  field: UnitSortField;
  direction: 'asc' | 'desc';
}
const DEFAULT_UNIT_SORTS: ReadonlyArray<UnitSortState> = [
  { field: 'compliance', direction: 'desc' },
  { field: 'name', direction: 'asc' },
] as const;

export interface DohDashboardProps {
  userId: string;
  initialUnitId?: string | null;
}

const UnitDetailSheet = dynamic(() => import('./unit-detail-sheet'), { ssr: false });

export function DohDashboard({ userId, initialUnitId = null }: DohDashboardProps) {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUnits: 0,
    totalPractitioners: 0,
    activePractitioners: 0,
    complianceRate: 0,
    totalSubmissions: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    totalCreditsAwarded: 0,
    atRiskPractitioners: 0
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [units, setUnits] = useState<UnitComparisonRow[]>([]);
  const [unitPage, setUnitPage] = useState(1);
  const [unitPageSize, setUnitPageSize] = useState(20);
  const [unitTotalItems, setUnitTotalItems] = useState(0);
  const [unitTotalPages, setUnitTotalPages] = useState(0);
  const [unitSorts, setUnitSorts] = useState<UnitSortState[]>(() =>
    DEFAULT_UNIT_SORTS.map((entry) => ({ ...entry }))
  );
  const [unitsRefreshKey, setUnitsRefreshKey] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    units: true,
    analytics: true,
    activity: true
  });
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitComparisonRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingInitialUnitId, setPendingInitialUnitId] = useState<string | null>(
    initialUnitId ?? null,
  );
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const initialUnitLookupRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sheetOpen && detailTriggerRef.current) {
      detailTriggerRef.current.focus({ preventScroll: true });
      detailTriggerRef.current = null;
    }
  }, [sheetOpen]);

  const prefetchMetrics = useCallback(
    (unitId: string) => {
      if (!unitId) {
        return;
      }
      queryClient.prefetchQuery({
        queryKey: unitMetricsQueryKey(unitId),
        queryFn: () => fetchUnitMetrics(unitId),
        staleTime: 30_000,
      });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!pendingInitialUnitId) {
      initialUnitLookupRef.current = null;
      return;
    }
    prefetchMetrics(pendingInitialUnitId);
  }, [pendingInitialUnitId, prefetchMetrics]);

  useEffect(() => {
    if (!pendingInitialUnitId) {
      return;
    }
    const match = units.find((row) => row.id === pendingInitialUnitId);
    if (!match) {
      if (initialUnitLookupRef.current === pendingInitialUnitId) {
        return;
      }

      initialUnitLookupRef.current = pendingInitialUnitId;
      let cancelled = false;

      const resolveInitialUnit = async () => {
        try {
          const response = await fetch(`/api/system/unit-summary/${pendingInitialUnitId}`);
          if (!response.ok) {
            throw new Error(`Failed to load unit summary: ${response.status}`);
          }

          const payload = await response.json();
          if (!payload?.success || !payload?.data) {
            throw new Error(payload?.error || 'Unit summary payload invalid');
          }

          const summary = payload.data as UnitComparisonRow;
          if (cancelled) {
            return;
          }

          setSelectedUnitId(summary.id);
          setSelectedUnit(summary);
          prefetchMetrics(summary.id);
          setSheetOpen(true);
          setPendingInitialUnitId(null);
        } catch (error) {
          if (cancelled) {
            return;
          }
          console.error('Error resolving initial unit summary:', error);
          setSelectedUnitId(pendingInitialUnitId);
          setSelectedUnit(null);
          prefetchMetrics(pendingInitialUnitId);
          setSheetOpen(true);
          setPendingInitialUnitId(null);
        } finally {
          initialUnitLookupRef.current = null;
        }
      };

      void resolveInitialUnit();

      return () => {
        cancelled = true;
      };
    }
    setSelectedUnitId(match.id);
    setSelectedUnit(match);
    prefetchMetrics(match.id);
    setSheetOpen(true);
    setPendingInitialUnitId(null);
    initialUnitLookupRef.current = null;
  }, [pendingInitialUnitId, prefetchMetrics, units]);

  const handleUnitDetailClick = (
    unitId: string,
    unitData: UnitComparisonRow,
    trigger: HTMLButtonElement,
  ) => {
    detailTriggerRef.current = trigger;
    setSelectedUnitId(unitId);
    setSelectedUnit(unitData);
    setSheetOpen(true);
    prefetchMetrics(unitId);
  };

  const handleUnitDetailHover = (unitId: string) => {
    prefetchMetrics(unitId);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      setSelectedUnitId(null);
      setSelectedUnit(null);
    }
  };

  const initialMetrics = useMemo<UnitMetrics | undefined>(() => {
    if (!selectedUnit) {
      return undefined;
    }
    return {
      totalPractitioners: selectedUnit.totalPractitioners,
      activePractitioners: selectedUnit.activePractitioners,
      complianceRate: selectedUnit.complianceRate,
      pendingApprovals: selectedUnit.pendingApprovals,
      approvedThisMonth: 0,
      rejectedThisMonth: 0,
      atRiskPractitioners: Math.max(
        0,
        selectedUnit.activePractitioners - selectedUnit.compliantPractitioners,
      ),
      totalCredits: selectedUnit.totalCredits,
      compliantPractitioners: selectedUnit.compliantPractitioners,
    };
  }, [selectedUnit]);

  // Fetch system metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);
        setMetricsError(null);
        const response = await fetch('/api/system/metrics');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load system metrics');
        }

        setMetrics(result.data);
      } catch (error) {
        console.error('Error fetching system metrics:', error);
        setMetricsError('Không thể tải số liệu hệ thống. Vui lòng thử lại.');
        setMetrics({
          totalUnits: 0,
          totalPractitioners: 0,
          activePractitioners: 0,
          complianceRate: 0,
          totalSubmissions: 0,
          pendingApprovals: 0,
          approvedThisMonth: 0,
          rejectedThisMonth: 0,
          totalCreditsAwarded: 0,
          atRiskPractitioners: 0,
        });
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  useEffect(() => {
    setUnitPage(1);
  }, [debouncedSearchTerm]);

  // Fetch units performance with server-side filtering, sorting, and pagination
  useEffect(() => {
    const controller = new AbortController();

    const fetchUnits = async () => {
      try {
        setUnitsLoading(true);
        setUnitsError(null);

        const params = new URLSearchParams();
        params.set('page', unitPage.toString());
        params.set('pageSize', unitPageSize.toString());

        if (debouncedSearchTerm.trim()) {
          params.set('search', debouncedSearchTerm.trim());
        }

        if (unitSorts.length > 0) {
          params.set(
            'sort',
            unitSorts.map((entry) => `${entry.field}:${entry.direction}`).join(','),
          );
        }

        const response = await fetch(`/api/system/units-performance?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to load units performance');
        }

        const data = result.data;
        const items: UnitComparisonRow[] = Array.isArray(data.items)
          ? data.items.map((item: any) => ({
              id: String(item.id),
              name: String(item.name),
              type: String(item.type ?? 'Không xác định'),
              totalPractitioners: Number(item.totalPractitioners ?? 0),
              activePractitioners: Number(item.activePractitioners ?? 0),
              compliantPractitioners: Number(item.compliantPractitioners ?? 0),
              complianceRate: Number(item.complianceRate ?? 0),
              pendingApprovals: Number(item.pendingApprovals ?? 0),
              totalCredits: Number(item.totalCredits ?? 0),
            }))
          : [];

        setUnits(items);

        const nextTotalItems = Number.isFinite(Number(data.totalItems)) ? Number(data.totalItems) : items.length;
        const nextTotalPages = Number.isFinite(Number(data.totalPages)) ? Number(data.totalPages) : (items.length > 0 ? 1 : 0);

        setUnitTotalItems(nextTotalItems);
        setUnitTotalPages(nextTotalPages);

        const serverPage = Number.isFinite(Number(data.page)) ? Number(data.page) : unitPage;
        const serverPageSize = Number.isFinite(Number(data.pageSize))
          ? Number(data.pageSize)
          : unitPageSize;

        if (serverPageSize !== unitPageSize) {
          setUnitPageSize(serverPageSize);
        }

        const normalizedPage =
          nextTotalPages > 0 ? Math.min(Math.max(1, serverPage), nextTotalPages) : 1;

        if (normalizedPage !== unitPage) {
          setUnitPage(normalizedPage);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Error fetching units performance:', error);
        setUnitsError('Không thể tải danh sách đơn vị. Vui lòng thử lại.');
        setUnits([]);
        setUnitTotalItems(0);
        setUnitTotalPages(0);
      } finally {
        if (!controller.signal.aborted) {
          setUnitsLoading(false);
        }
      }
    };

    fetchUnits();

    return () => controller.abort();
  }, [debouncedSearchTerm, unitSorts, unitPage, unitPageSize, unitsRefreshKey]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // No need for client-side sorting and filtering - now handled by server

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Executive Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-medical-blue/10 backdrop-blur-sm">
                <Building2 className="w-8 h-8 text-medical-blue" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Bảng điều khiển Sở Y Tế
                </h1>
                <p className="text-gray-600">Giám sát toàn Hệ thống Quản lý đào tạo nhân lực y tế</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => window.location.href = '/dashboard/doh/units'}
              >
                <Building2 className="w-4 h-4" />
                Quản lý đơn vị
                <ExternalLink className="w-3 h-3" />
              </GlassButton>
              <GlassButton variant="outline" size="sm" className="hidden md:flex items-center gap-2">
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </GlassButton>
            </div>
          </div>

          {/* Executive KPI Cards */}
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
            aria-busy={metricsLoading || undefined}
          >
            {metricsError ? (
              <DashboardErrorCard
                message={metricsError}
                className="col-span-full"
              />
            ) : (
              <>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100/50">
                      <Building2 className="w-5 h-5 text-medical-blue" />
                    </div>
                    <span className="text-sm text-gray-600">Đơn vị</span>
                  </div>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-20 rounded-lg bg-white/40" aria-hidden />
                  ) : (
                    <p className="text-3xl font-bold text-medical-blue">{metrics.totalUnits}</p>
                  )}
                  {metricsLoading ? (
                    <Skeleton className="h-3 w-24 mt-2 bg-white/20" aria-hidden />
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Đang hoạt động</p>
                  )}
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100/50">
                      <Users className="w-5 h-5 text-medical-blue" />
                    </div>
                    <span className="text-sm text-gray-600">Người hành nghề</span>
                  </div>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-24 rounded-lg bg-white/40" aria-hidden />
                  ) : (
                    <p className="text-3xl font-bold text-medical-blue">{metrics.activePractitioners}</p>
                  )}
                  {metricsLoading ? (
                    <Skeleton className="h-3 w-28 mt-2 bg-white/20" aria-hidden />
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Đang làm việc</p>
                  )}
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-100/50">
                      <CheckCircle className="w-5 h-5 text-medical-green" />
                    </div>
                    <span className="text-sm text-gray-600">Tuân thủ</span>
                  </div>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-24 rounded-lg bg-white/40" aria-hidden />
                  ) : (
                    <p className="text-3xl font-bold text-medical-green">{metrics.complianceRate}%</p>
                  )}
                  {metricsLoading ? (
                    <Skeleton className="h-3 w-28 mt-2 bg-white/20" aria-hidden />
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Tỷ lệ hoàn thành</p>
                  )}
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-amber-100/50">
                      <Clock className="w-5 h-5 text-medical-amber" />
                    </div>
                    <span className="text-sm text-gray-600">Chờ duyệt</span>
                  </div>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-24 rounded-lg bg-white/40" aria-hidden />
                  ) : (
                    <p className="text-3xl font-bold text-medical-amber">{metrics.pendingApprovals}</p>
                  )}
                  {metricsLoading ? (
                    <Skeleton className="h-3 w-24 mt-2 bg-white/20" aria-hidden />
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Hoạt động</p>
                  )}
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-red-100/50">
                      <AlertTriangle className="w-5 h-5 text-medical-red" />
                    </div>
                    <span className="text-sm text-gray-600">Rủi ro</span>
                  </div>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-24 rounded-lg bg-white/40" aria-hidden />
                  ) : (
                    <p className="text-3xl font-bold text-medical-red">{metrics.atRiskPractitioners}</p>
                  )}
                  {metricsLoading ? (
                    <Skeleton className="h-3 w-24 mt-2 bg-white/20" aria-hidden />
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Cần theo dõi</p>
                  )}
                </GlassCard>
              </>
            )}
          </div>
        </div>

        {/* System Analytics */}
        <GlassCard className="p-6" aria-busy={metricsLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100/50">
                <BarChart3 className="w-5 h-5 text-medical-blue" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Phân tích hệ thống</h2>
            </div>
            <button
              onClick={() => toggleSection('analytics')}
              className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              {expandedSections.analytics ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {expandedSections.analytics && (
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              aria-busy={metricsLoading || undefined}
            >
              {metricsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <DashboardCardSkeleton key={index} lines={3} />
                ))
              ) : metricsError ? (
                <DashboardErrorPanel
                  message={metricsError}
                  className="col-span-full"
                />
              ) : (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Hoạt động tháng này</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                        <span className="text-sm text-gray-600">Đã phê duyệt</span>
                        <span className="text-lg font-bold text-medical-green">{metrics.approvedThisMonth}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/50">
                        <span className="text-sm text-gray-600">Từ chối</span>
                        <span className="text-lg font-bold text-medical-red">{metrics.rejectedThisMonth}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50">
                        <span className="text-sm text-gray-600">Tổng ghi nhận</span>
                        <span className="text-lg font-bold text-medical-blue">{metrics.totalSubmissions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Tín chỉ</h3>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-medical-blue" />
                        <span className="text-sm text-gray-600">Tổng tín chỉ cấp</span>
                      </div>
                      <p className="text-3xl font-bold text-medical-blue">
                        {metrics.totalCreditsAwarded.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Tất cả hoạt động đã duyệt</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Hiệu suất</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50">
                        <span className="text-sm text-gray-600">Tỷ lệ phê duyệt</span>
                        <span className="text-lg font-bold text-medical-blue">
                          {metrics.totalSubmissions > 0 
                            ? Math.round((metrics.approvedThisMonth / metrics.totalSubmissions) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                        <span className="text-sm text-gray-600">Trung bình/người</span>
                        <span className="text-lg font-bold text-medical-green">
                          {metrics.activePractitioners > 0
                            ? (metrics.totalCreditsAwarded / metrics.activePractitioners).toFixed(1)
                            : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* Multi-Unit Comparison */}
        <GlassCard className="p-6" aria-busy={unitsLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100/50">
                <Building2 className="w-5 h-5 text-medical-blue" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">So sánh đơn vị</h2>
              {!unitsLoading && !unitsError && unitTotalItems > 0 && (
                <span className="px-3 py-1 rounded-full bg-medical-blue/20 text-medical-blue text-sm font-semibold">
                  {unitTotalItems.toLocaleString('vi-VN')} đơn vị
                </span>
              )}
            </div>
            <button
              onClick={() => toggleSection('units')}
              className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              {expandedSections.units ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {expandedSections.units && (
            <div className="space-y-4">
              {/* Search and Sort Controls */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex flex-1 gap-3">
                  <label htmlFor="unit-search" className="sr-only">
                    Tìm kiếm đơn vị
                  </label>
                  <input
                    id="unit-search"
                    type="search"
                    placeholder="Tìm kiếm đơn vị..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/50"
                  />
                  {searchTerm ? (
                    <GlassButton
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      Xóa
                    </GlassButton>
                  ) : null}
                </div>
                <GlassButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setUnitSorts(DEFAULT_UNIT_SORTS.map((entry) => ({ ...entry })));
                    setUnitPageSize(20);
                    setUnitPage(1);
                  }}
                >
                  Đặt lại
                </GlassButton>
              </div>

              <UnitComparisonGrid
                rows={units}
                isLoading={unitsLoading}
                error={unitsError}
                page={unitPage}
                pageSize={unitPageSize}
                totalItems={unitTotalItems}
                totalPages={unitTotalPages}
                sort={unitSorts}
                onSortChange={(next) => {
                  const nextState = next.length > 0 ? next : DEFAULT_UNIT_SORTS.map((entry) => ({ ...entry }));
                  setUnitSorts(nextState);
                  setUnitPage(1);
                }}
                onPageChange={(next) => setUnitPage(next)}
                onPageSizeChange={(size) => {
                  setUnitPageSize(size);
                  setUnitPage(1);
                }}
                onRetry={() => setUnitsRefreshKey((prev) => prev + 1)}
                onUnitDetailClick={handleUnitDetailClick}
                onUnitDetailHover={handleUnitDetailHover}
              />
            </div>
          )}
        </GlassCard>

        <UnitDetailSheet
          open={sheetOpen && Boolean(selectedUnitId)}
          onOpenChange={handleSheetOpenChange}
          unitId={selectedUnitId}
          unitSummary={selectedUnit ?? undefined}
          initialData={initialMetrics}
        />

    </div>
  );
}
