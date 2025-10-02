/**
 * React Hook: useCreditStatistics
 * Fetch compliance statistics for dashboards
 */

'use client';

import { useState, useEffect } from 'react';

export interface ComplianceStatistics {
  total: number;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  averageCompletion: number;
}

export function useCreditStatistics(unitId?: string | null) {
  const [statistics, setStatistics] = useState<ComplianceStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (unitId) {
          params.append('unitId', unitId);
        }

        const response = await fetch(`/api/credits/statistics?${params}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Lỗi khi tải thống kê tuân thủ');
        }

        setStatistics(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [unitId]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (unitId) {
        params.append('unitId', unitId);
      }

      const response = await fetch(`/api/credits/statistics?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Lỗi khi tải thống kê tuân thủ');
      }

      setStatistics(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  return {
    statistics,
    loading,
    error,
    refetch
  };
}
