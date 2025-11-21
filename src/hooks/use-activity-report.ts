import { useQuery } from '@tanstack/react-query';
import type { ActivityReportData, ActivityReportFilters } from '@/types/reports';

interface UseActivityReportOptions {
  showAll?: boolean;
}

export function useActivityReport(
  unitId: string,
  filters: Omit<ActivityReportFilters, 'startDate' | 'endDate'> & { startDate?: Date; endDate?: Date },
  options?: UseActivityReportOptions
) {
  return useQuery({
    queryKey: ['reports', 'activities', unitId, filters, options?.showAll],
    queryFn: async (): Promise<ActivityReportData> => {
      const params = new URLSearchParams({ unitId });

      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString().split('T')[0]);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString().split('T')[0]);
      }
      if (filters.activityType && filters.activityType.length > 0) {
        // For now, take the first activity type (single selection)
        params.append('activityType', filters.activityType[0]);
      }
      if (filters.approvalStatus && filters.approvalStatus !== 'all') {
        params.append('approvalStatus', filters.approvalStatus);
      }
      if (filters.practitionerId) {
        params.append('practitionerId', filters.practitionerId);
      }
      if (options?.showAll !== undefined) {
        params.append('showAll', String(options.showAll));
      }

      const response = await fetch(`/api/reports/activities?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activity report data');
      }

      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    refetchOnMount: false, // Prevent refetch on component mount (rely on staleTime)
    refetchOnWindowFocus: false, // Prevent refetch on window focus (rely on staleTime)
    enabled: !!unitId,
  });
}
