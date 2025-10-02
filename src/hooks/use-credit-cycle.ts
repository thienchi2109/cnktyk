/**
 * React Hook: useCredit Cycle
 * Fetch and manage compliance cycle information
 */

'use client';

import { useState, useEffect } from 'react';

export interface ComplianceCycle {
  MaNhanVien: string;
  NgayBatDau: string;
  NgayKetThuc: string;
  TongTinChiYeuCau: number;
  TongTinChiDatDuoc: number;
  TyLeHoanThanh: number;
  TrangThai: 'DangThucHien' | 'HoanThanh' | 'QuaHan' | 'SapHetHan';
  SoNgayConLai: number;
}

export interface CreditSummary {
  LoaiHoatDong: string;
  TongTinChi: number;
  SoHoatDong: number;
  TranToiDa?: number;
  ConLai?: number;
}

export interface CreditHistory {
  MaGhiNhan: string;
  TenHoatDong: string;
  LoaiHoatDong: string | null;
  SoTinChi: number;
  NgayGhiNhan: string;
  TrangThaiDuyet: string;
  GhiChu: string | null;
}

interface CycleData {
  cycle: ComplianceCycle;
  creditSummary: CreditSummary[];
  creditHistory?: CreditHistory[];
}

export function useCreditCycle(practitionerId: string | null, includeHistory: boolean = false) {
  const [data, setData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!practitionerId) {
      setLoading(false);
      return;
    }

    const fetchCycleData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          practitionerId,
          includeHistory: includeHistory.toString()
        });

        const response = await fetch(`/api/credits/cycle?${params}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Lỗi khi tải thông tin chu kỳ');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };

    fetchCycleData();
  }, [practitionerId, includeHistory]);

  const refetch = async () => {
    if (!practitionerId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        practitionerId,
        includeHistory: includeHistory.toString()
      });

      const response = await fetch(`/api/credits/cycle?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Lỗi khi tải thông tin chu kỳ');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  return {
    cycle: data?.cycle || null,
    creditSummary: data?.creditSummary || [],
    creditHistory: data?.creditHistory || [],
    loading,
    error,
    refetch
  };
}
