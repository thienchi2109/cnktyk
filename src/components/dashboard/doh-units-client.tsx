'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import {
  DashboardTableSkeleton,
} from '@/components/dashboard/dashboard-skeletons';
import { UnitComparisonGrid } from '@/components/dashboard/unit-comparison-grid';
import type { UnitComparisonSummary, UnitMetrics } from '@/types/dashboard';
import type { UnitSortState } from '@/components/dashboard/unit-comparison-grid';
import { fetchUnitMetrics, unitMetricsQueryKey } from '@/lib/dashboard/unit-metrics';

const UnitDetailSheet = dynamic(() => import('@/components/dashboard/unit-detail-sheet'), {
  ssr: false,
});

const DEFAULT_UNIT_SORTS: ReadonlyArray<UnitSortState> = [
  { field: 'compliance', direction: 'desc' },
  { field: 'name', direction: 'asc' },
] as const;

interface DohUnitsClientProps {
  userId: string;
  initialUnitId: string | null;
}

export function DohUnitsClient({ userId, initialUnitId }: DohUnitsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [unitPage, setUnitPage] = useState(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    return page > 0 ? page : 1;
  });

  const [unitPageSize, setUnitPageSize] = useState(() => {
    const size = parseInt(searchParams.get('pageSize') || '20', 10);
    return [10, 20, 30, 50].includes(size) ? size : 20;
  });

  const [unitSorts, setUnitSorts] = useState<UnitSortState[]>(() => {
    const sortParam = searchParams.get('sort');
    if (!sortParam) return DEFAULT_UNIT_SORTS.map((s) => ({ ...s }));

    const parsed: UnitSortState[] = [];
    const segments = sortParam.split(',');
    for (const segment of segments) {
      const [field, direction] = segment.split(':');
      if (
        field &&
        ['name', 'compliance', 'practitioners', 'pending', 'totalCredits'].includes(field) &&
        (direction === 'asc' || direction === 'desc')
      ) {
        parsed.push({ field: field as UnitSortState['field'], direction });
      }
    }
    return parsed.length > 0 ? parsed : DEFAULT_UNIT_SORTS.map((s) => ({ ...s }));
  });

  const [units, setUnits] = useState<UnitComparisonSummary[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [unitTotalItems, setUnitTotalItems] = useState(0);
  const [unitTotalPages, setUnitTotalPages] = useState(0);
  const [unitsRefreshKey, setUnitsRefreshKey] = useState(0);
  const [expandedSections, setExpandedSections] = useState({ units: true });

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitComparisonSummary | null>(null);
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateURL = useCallback(
    (params: {
      search?: string;
      page?: number;
      pageSize?: number;
      sort?: UnitSortState[];
      unit?: string | null;
    }) => {
      const newParams = new URLSearchParams();

      const search = params.search ?? searchTerm;
      if (search) newParams.set('search', search);

      const page = params.page ?? unitPage;
      if (page > 1) newParams.set('page', page.toString());

      const pageSize = params.pageSize ?? unitPageSize;
      if (pageSize !== 20) newParams.set('pageSize', pageSize.toString());

      const sorts = params.sort ?? unitSorts;
      const sortStr = sorts.map((s) => `${s.field}:${s.direction}`).join(',');
      const defaultSortStr = DEFAULT_UNIT_SORTS.map((s) => `${s.field}:${s.direction}`).join(',');
      if (sortStr !== defaultSortStr) {
        newParams.set('sort', sortStr);
      }

      const unit = params.unit !== undefined ? params.unit : selectedUnitId;
      if (unit) newParams.set('unit', unit);

      const queryString = newParams.toString();
      router.replace(queryString ? `/dashboard/doh/units?${queryString}` : '/dashboard/doh/units', {
        scroll: false,
      });
    },
    [router, searchTerm, unitPage, unitPageSize, unitSorts, selectedUnitId],
  );

  useEffect(() => {
    updateURL({});
  }, [debouncedSearchTerm, unitPage, unitPageSize, unitSorts, selectedUnitId]);

  const prefetchMetrics = useCallback(
    (unitId: string) => {
      if (!unitId) return;
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
    if (!pendingInitialUnitId) return;

    const match = units.find((row) => row.id === pendingInitialUnitId);
    if (!match) {
      if (initialUnitLookupRef.current === pendingInitialUnitId) return;

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

          const summary = payload.data as UnitComparisonSummary;
          if (cancelled) return;

          setSelectedUnitId(summary.id);
          setSelectedUnit(summary);
          prefetchMetrics(summary.id);
          setSheetOpen(true);
          setPendingInitialUnitId(null);
        } catch (error) {
          if (cancelled) return;
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
    unitData: UnitComparisonSummary,
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
      updateURL({ unit: null });
    }
  };

  const initialMetrics = useMemo<UnitMetrics | undefined>(() => {
    if (!selectedUnit) return undefined;
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

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setUnitsLoading(true);
        setUnitsError(null);

        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
        params.set('page', unitPage.toString());
        params.set('pageSize', unitPageSize.toString());
        unitSorts.forEach((sort) => {
          params.append('sort', `${sort.field}:${sort.direction}`);
        });

        console.log('[DOH Units] Fetching units with params:', params.toString());
        const response = await fetch(`/api/system/units-performance?${params.toString()}`);
        console.log('[DOH Units] Response status:', response.status, response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[DOH Units] Response error:', errorText);
          throw new Error('Không thể tải danh sách đơn vị');
        }

        const data = await response.json();
        console.log('[DOH Units] Response data:', data);
        
        if (!data.success) {
          throw new Error(data.error || 'Dữ liệu không hợp lệ');
        }

        console.log('[DOH Units] Units received:', data.data.units?.length || 0);
        setUnits(data.data.units || []);
        setUnitTotalItems(data.data.totalItems);
        setUnitTotalPages(data.data.totalPages);
      } catch (error) {
        console.error('[DOH Units] Fetch error:', error);
        setUnitsError(
          error instanceof Error ? error.message : 'Không thể tải danh sách đơn vị',
        );
      } finally {
        setUnitsLoading(false);
      }
    };

    void fetchUnits();
  }, [debouncedSearchTerm, unitPage, unitPageSize, unitSorts, unitsRefreshKey]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Quản lý đơn vị</h1>
          <p className="text-gray-600">Theo dõi và đánh giá hiệu suất các đơn vị y tế</p>
        </div>

        <GlassCard className="p-6" aria-busy={unitsLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100/50">
                <Building2 className="w-5 h-5 text-medical-blue" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Danh sách đơn vị</h2>
              {!unitsLoading && !unitsError && unitTotalItems > 0 && (
                <span className="px-3 py-1 rounded-full bg-medical-blue/20 text-medical-blue text-sm font-semibold">
                  {unitTotalItems.toLocaleString('vi-VN')} đơn vị
                </span>
              )}
            </div>
            <button
              onClick={() => toggleSection('units')}
              className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
              aria-label={expandedSections.units ? 'Thu gọn' : 'Mở rộng'}
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
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setUnitPage(1);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/50"
                  />
                  {searchTerm && (
                    <GlassButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setUnitPage(1);
                      }}
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      Xóa
                    </GlassButton>
                  )}
                </div>
                <GlassButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setUnitSorts(DEFAULT_UNIT_SORTS.map((s) => ({ ...s })));
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
                  const nextState =
                    next.length > 0 ? next : DEFAULT_UNIT_SORTS.map((s) => ({ ...s }));
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
    </div>
  );
}
