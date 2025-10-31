import { UnitMetrics } from '@/types/dashboard';

export const unitMetricsQueryKey = (unitId: string | null) => ['unit-metrics', unitId] as const;

export async function fetchUnitMetrics(unitId: string): Promise<UnitMetrics> {
  const response = await fetch(`/api/units/${unitId}/metrics`, {
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error('Không thể tải số liệu đơn vị. Vui lòng thử lại.');
  }

  const payload = await response.json();

  if (!payload?.success || !payload?.data) {
    throw new Error(payload?.error ?? 'Dữ liệu đơn vị không hợp lệ.');
  }

  const data = payload.data as Record<string, unknown>;

  return {
    totalPractitioners: Number(data.totalPractitioners ?? 0),
    activePractitioners: Number(data.activePractitioners ?? 0),
    complianceRate: Number(data.complianceRate ?? 0),
    pendingApprovals: Number(data.pendingApprovals ?? 0),
    approvedThisMonth: Number(data.approvedThisMonth ?? 0),
    rejectedThisMonth: Number(data.rejectedThisMonth ?? 0),
    atRiskPractitioners: Number(data.atRiskPractitioners ?? 0),
    totalCredits:
      data.totalCredits === undefined ? undefined : Number(data.totalCredits ?? 0),
    compliantPractitioners:
      data.compliantPractitioners === undefined
        ? undefined
        : Number(data.compliantPractitioners ?? 0),
  } satisfies UnitMetrics;
}
