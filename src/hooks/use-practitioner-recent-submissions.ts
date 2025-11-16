"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Hook for fetching recent submissions for a practitioner
 * Returns the last 5 submissions for preview in the practitioner detail sheet
 */

export interface RecentSubmission {
  MaGhiNhan: string;
  TenHoatDong: string;
  NgayGhiNhan: string;
  TrangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  SoGioTinChiQuyDoi: number | null;
  NgayBatDau: string | null;
  NgayKetThuc: string | null;
  SoTiet: number | null;
  FileMinhChungUrl: string | null;
  practitioner: {
    HoVaTen: string;
    SoCCHN: string | null;
    ChucDanh: string | null;
  };
  activityCatalog: {
    TenDanhMuc: string;
    LoaiHoatDong: string;
  } | null;
}

export interface PractitionerRecentSubmissionsResponse {
  success: boolean;
  data: RecentSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function practitionerRecentSubmissionsQueryKey(practitionerId: string | null) {
  return ["practitioner-recent-submissions", practitionerId] as const;
}

export async function fetchPractitionerRecentSubmissions(
  practitionerId: string
): Promise<PractitionerRecentSubmissionsResponse> {
  const params = new URLSearchParams({
    practitionerId,
    page: "1",
    limit: "5", // Only fetch last 5 for preview
  });

  const res = await fetch(`/api/submissions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch recent submissions");
  }

  return res.json();
}

export function usePractitionerRecentSubmissions(practitionerId: string | null) {
  return useQuery<PractitionerRecentSubmissionsResponse>({
    queryKey: practitionerRecentSubmissionsQueryKey(practitionerId),
    queryFn: () => {
      if (!practitionerId) {
        throw new Error("practitionerId is required");
      }
      return fetchPractitionerRecentSubmissions(practitionerId);
    },
    enabled: !!practitionerId, // Only fetch if practitionerId is provided
    staleTime: 30_000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60_000, // Garbage collect after 5 minutes
    refetchOnWindowFocus: false,
  });
}
