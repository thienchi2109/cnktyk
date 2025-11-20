import { useQuery } from '@tanstack/react-query';
import type { PractitionerDetailFilters, PractitionerDetailReportData, ApiResponse } from '@/types/reports';

interface UsePractitionerDetailReportOptions {
    enabled?: boolean;
    refetchInterval?: number;
}

export function usePractitionerDetailReport(
    unitId: string,
    filters: PractitionerDetailFilters,
    options?: UsePractitionerDetailReportOptions
) {
    return useQuery({
        queryKey: ['reports', 'practitioner-detail', unitId, filters],
        queryFn: async (): Promise<PractitionerDetailReportData> => {
            const params = new URLSearchParams();

            // Practitioner ID is required
            if (!filters.practitionerId) {
                throw new Error('Practitioner ID is required');
            }
            params.append('practitionerId', filters.practitionerId);

            // Add date filters if provided
            if (filters.startDate) {
                params.append('startDate', filters.startDate);
            }
            if (filters.endDate) {
                params.append('endDate', filters.endDate);
            }

            const response = await fetch(`/api/reports/practitioner-details?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch practitioner detail report');
            }

            const result: ApiResponse<PractitionerDetailReportData> = await response.json();

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to load practitioner detail report');
            }

            return result.data;
        },
        staleTime: 30000, // 30 seconds
        gcTime: 300000, // 5 minutes
        enabled: options?.enabled && !!filters.practitionerId,
        refetchInterval: options?.refetchInterval,
    });
}
