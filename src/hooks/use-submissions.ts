"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

export interface UseSubmissionsOptions {
  page: number;
  limit: number;
  status?: string; // ChoDuyet | DaDuyet | TuChoi | 'all'
  search?: string;
}

export function submissionsQueryKey(o: UseSubmissionsOptions) {
  return [
    "submissions",
    o.page,
    o.limit,
    o.status ?? "all",
    o.search ?? "",
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

  // Prefetch next page for smoother UX
  if (query.data && query.data.pagination && o.page < query.data.pagination.totalPages) {
    const nextOpts = { ...o, page: o.page + 1 };
    qc.prefetchQuery({ queryKey: submissionsQueryKey(nextOpts), queryFn: () => fetchSubmissionsApi(nextOpts) });
  }

  return query;
}