"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, keepPreviousData, useMutation } from "@tanstack/react-query";

export interface UseSubmissionsOptions {
  page: number;
  limit: number;
  status?: string; // ChoDuyet | DaDuyet | TuChoi | 'all'
  search?: string;
  refreshKey?: number;
  unitId?: string;
  practitionerId?: string;
}

export function submissionsQueryKey(o: UseSubmissionsOptions) {
  return [
    "submissions",
    o.page,
    o.limit,
    o.status ?? "all",
    o.search ?? "",
    o.refreshKey ?? 0,
    o.unitId ?? "all-unit",
    o.practitionerId ?? "all-practitioner",
  ] as const;
}

export type SubmissionsApiResponse = {
  data: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchSubmissionsApi(o: UseSubmissionsOptions): Promise<SubmissionsApiResponse> {
  const params = new URLSearchParams({ page: String(o.page), limit: String(o.limit) });
  if (o.status && o.status !== "all") params.append("status", o.status);
  if (o.search) params.append("search", o.search);
  if (o.unitId) params.append("unitId", o.unitId);
  if (o.practitionerId) params.append("practitionerId", o.practitionerId);

  const res = await fetch(`/api/submissions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch submissions");
  }
  return res.json(); // { data, pagination }
}

export function useSubmissions(o: UseSubmissionsOptions) {
  const qc = useQueryClient();
  const query = useQuery<SubmissionsApiResponse>({
    queryKey: submissionsQueryKey(o),
    queryFn: () => fetchSubmissionsApi(o),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!query.isSuccess) return;
    const totalPages = query.data?.pagination?.totalPages ?? 0;
    if (!totalPages || o.page >= totalPages) return;

    const nextOpts: UseSubmissionsOptions = { ...o, page: o.page + 1 };
    qc.prefetchQuery({
      queryKey: submissionsQueryKey(nextOpts),
      queryFn: () => fetchSubmissionsApi(nextOpts),
      staleTime: 30_000,
    });
  }, [
    qc,
    o.page,
    o.limit,
    o.search,
    o.status,
    o.refreshKey,
    o.unitId,
    o.practitionerId,
    query.isSuccess,
    query.data?.pagination?.totalPages,
  ]);

  return query;
}

export function useBulkApproveSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { ids: string[]; comments?: string }) => {
      const res = await fetch('/api/submissions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', ids: args.ids, comments: args.comments }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to bulk approve');
      }
      return data as { processedCount: number; updatedIds: string[]; skippedIds: string[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

export function useBulkDeleteSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { ids: string[] }) => {
      const res = await fetch('/api/submissions/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: args.ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to bulk delete');
      }
      return data as {
        success: boolean;
        deleted: number;
        skipped: number;
        failed: number;
        details: {
          deletedIds: string[];
          skippedIds: string[];
          errors: Array<{ id: string; error: string }>;
        };
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}
