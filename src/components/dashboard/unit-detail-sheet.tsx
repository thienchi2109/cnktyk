'use client';

import React, { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GlassCard } from '@/components/ui/glass-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, Clock, AlertTriangle, Award, TrendingUp, XCircle } from 'lucide-react';
import { fetchUnitMetrics, unitMetricsQueryKey } from '@/lib/dashboard/unit-metrics';
import type { UnitComparisonSummary, UnitMetrics } from '@/types/dashboard';

interface UnitDetailSheetProps {
  unitId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitSummary?: UnitComparisonSummary;
  initialData?: UnitMetrics;
}

export default function UnitDetailSheet({
  unitId,
  open,
  onOpenChange,
  unitSummary,
  initialData,
}: UnitDetailSheetProps) {
  const hasUnit = Boolean(unitId);
  const fallback: UnitMetrics = {
    totalPractitioners: 0,
    activePractitioners: 0,
    complianceRate: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    atRiskPractitioners: 0,
    totalCredits: initialData?.totalCredits ?? unitSummary?.totalCredits,
    compliantPractitioners: initialData?.compliantPractitioners ?? unitSummary?.compliantPractitioners,
  };

  const queryKey = hasUnit ? unitMetricsQueryKey(unitId) : ['unit-metrics', 'idle'] as const;

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
  } = useQuery<UnitMetrics>({
    queryKey,
    enabled: open && hasUnit,
    queryFn: () => fetchUnitMetrics(unitId as string),
    staleTime: 30_000,
    gcTime: 300_000,
    initialData,
  });

  const metrics = data ?? initialData ?? fallback;
  const loading = isPending && !initialData;
  const refreshing = isFetching && Boolean(initialData);
  const errorMessage = error instanceof Error ? error.message : 'Không thể tải số liệu đơn vị.';

  const complianceTag = useMemo(() => {
    if (!metrics) {
      return null;
    }
    const rate = Number(metrics.complianceRate ?? 0);
    if (rate >= 90) return <Badge className="bg-green-100 text-green-800">Tuân thủ cao</Badge>;
    if (rate >= 70) return <Badge className="bg-amber-100 text-amber-800">Đang cải thiện</Badge>;
    return <Badge className="bg-red-100 text-red-800">Cần chú ý</Badge>;
  }, [metrics]);

  const sheetOpen = open && hasUnit;

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange} modal>
      {!hasUnit ? null : (
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto focus:outline-none">
        <SheetHeader>
            <SheetTitle>{unitSummary?.name ?? 'Chi tiết đơn vị'}</SheetTitle>
            <SheetDescription>
            {unitSummary?.type ? `Cấp quản lý: ${unitSummary.type}` : 'Thông tin hiệu suất chi tiết của đơn vị.'}
          </SheetDescription>
        </SheetHeader>

          <div className="mt-6 space-y-6">
              <GlassCard className="p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-medical-blue" />
                    <p className="text-sm text-gray-600">Tổng số nhân sự</p>
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-32 bg-white/40" aria-hidden />
                  ) : (
                    <p className="text-3xl font-semibold text-medical-blue">
                      {metrics.totalPractitioners.toLocaleString('vi-VN')}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      Đang hoạt động:{' '}
                      {loading ? '—' : metrics.activePractitioners.toLocaleString('vi-VN')}
                    </span>
                    {complianceTag}
                  </div>
                </div>
              </GlassCard>

              {isError && !initialData ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  icon={<CheckCircle className="h-5 w-5 text-medical-green" />}
                  label="Tỷ lệ tuân thủ"
                  value={`${Math.round(metrics.complianceRate ?? 0)}%`}
                  loading={loading}
                />
                <MetricCard
                  icon={<Clock className="h-5 w-5 text-medical-amber" />}
                  label="Chờ duyệt"
                  value={Number(metrics.pendingApprovals ?? 0).toLocaleString('vi-VN')}
                  loading={loading}
                />
                <MetricCard
                  icon={<AlertTriangle className="h-5 w-5 text-medical-red" />}
                  label="Đang rủi ro"
                  value={Number(metrics.atRiskPractitioners ?? 0).toLocaleString('vi-VN')}
                  loading={loading}
                />
                <MetricCard
                  icon={<Award className="h-5 w-5 text-medical-blue" />}
                  label="Đã phê duyệt (tháng)"
                  value={Number(metrics.approvedThisMonth ?? 0).toLocaleString('vi-VN')}
                  loading={loading}
                />
                <MetricCard
                  icon={<TrendingUp className="h-5 w-5 text-medical-blue" />}
                  label="Tổng tín chỉ"
                  value={Number(
                    metrics.totalCredits ?? unitSummary?.totalCredits ?? 0,
                  ).toLocaleString('vi-VN')}
                  loading={loading}
                />
                <MetricCard
                  icon={<XCircle className="h-5 w-5 text-medical-amber" />}
                  label="Bị từ chối (tháng)"
                  value={Number(metrics.rejectedThisMonth ?? 0).toLocaleString('vi-VN')}
                  loading={loading}
                />
              </div>

              {refreshing ? (
                <p className="text-xs text-gray-500" aria-live="polite">
                  Đang cập nhật số liệu mới nhất...
                </p>
              ) : null}

              {isError && initialData ? (
                <p className="text-xs text-medical-red" role="status">
                  {errorMessage}
                </p>
              ) : null}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  loading: boolean;
}

function MetricCard({ icon, label, value, loading }: MetricCardProps) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-white/60 p-2 text-medical-blue">{icon}</div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 bg-white/40" aria-hidden />
      ) : (
        <p className="text-2xl font-semibold text-medical-blue">{value}</p>
      )}
    </GlassCard>
  );
}
