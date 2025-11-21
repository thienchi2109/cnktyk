import { useQuery } from '@tanstack/react-query';
import type { ComplianceReportFilters, ComplianceReportData, ApiResponse } from '@/types/reports';

interface UseComplianceReportOptions {
  enabled?: boolean;
  refetchInterval?: number;
  page?: number;
  limit?: number;
}

interface ComplianceReportResponse {
  data: ComplianceReportData;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export function useComplianceReport(
  unitId: string,
  filters: ComplianceReportFilters,
  options?: UseComplianceReportOptions
) {
  return useQuery({
    queryKey: ['reports', 'compliance', unitId, filters, options?.page, options?.limit],
    queryFn: async (): Promise<ComplianceReportResponse> => {
      const params = new URLSearchParams();

      // Add date filters if provided
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      // Add employment status filter
      if (filters.employmentStatus && filters.employmentStatus.length > 0) {
        params.append('employmentStatus', filters.employmentStatus.join(','));
      }

      // Add position filter
      if (filters.position) {
        params.append('position', filters.position);
      }

      // Add pagination parameters
      if (options?.page) {
        params.append('page', options.page.toString());
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }

      const response = await fetch(`/api/reports/compliance?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch compliance report');
      }

      const result: ApiResponse<ComplianceReportData> & { pagination?: ComplianceReportResponse['pagination'] } = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load compliance report');
      }

      return {
        data: result.data,
        pagination: result.pagination || {
          page: options?.page || 1,
          limit: options?.limit || 50,
          totalCount: 0,
          totalPages: 0,
        },
      };
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}
