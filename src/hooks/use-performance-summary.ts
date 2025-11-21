import { useQuery } from '@tanstack/react-query';
import type { ReportFilters, PerformanceSummaryData, ApiResponse } from '@/types/reports';

interface UsePerformanceSummaryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function usePerformanceSummary(
  unitId: string,
  filters: ReportFilters,
  options?: UsePerformanceSummaryOptions
) {
  return useQuery({
    queryKey: ['reports', 'performance-summary', unitId, filters],
    queryFn: async (): Promise<PerformanceSummaryData> => {
      const params = new URLSearchParams({
        period: filters.preset || 'current_month',
      });

      // Add custom dates if provided
      if (filters.preset === 'custom' && filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate);
        params.append('endDate', filters.endDate);
      }

      const response = await fetch(`/api/reports/performance-summary?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch performance summary');
      }

      const result: ApiResponse<PerformanceSummaryData> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load performance summary');
      }

      return result.data;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes (formerly cacheTime)
    refetchOnMount: false, // Prevent refetch on component mount (rely on staleTime)
    refetchOnWindowFocus: false, // Prevent refetch on window focus (rely on staleTime)
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}
