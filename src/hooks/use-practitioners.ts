"use client";

import { useQuery } from "@tanstack/react-query";

export interface UsePractitionersOptions {
  page: number;
  limit: number;
  searchTerm?: string;
  statusFilter?: string;
  unitFilter?: string;
  complianceFilter?: string;
}

export function practitionersQueryKey(o: UsePractitionersOptions) {
  return [
    "practitioners",
    o.page,
    o.limit,
    o.searchTerm || "",
    o.statusFilter || "all",
    o.unitFilter || "all",
    o.complianceFilter || "all",
  ] as const;
}

export async function fetchPractitionersApi(o: UsePractitionersOptions) {
  const params = new URLSearchParams({
    page: String(o.page),
    limit: String(o.limit),
  });
  if (o.searchTerm) params.append("search", o.searchTerm);
  if (o.statusFilter && o.statusFilter !== "all") params.append("status", o.statusFilter);
  if (o.unitFilter && o.unitFilter !== "all") params.append("unitId", o.unitFilter);
  if (o.complianceFilter && o.complianceFilter !== "all")
    params.append("complianceStatus", o.complianceFilter);

  const res = await fetch(`/api/practitioners?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch practitioners");
  return res.json();
}

export function usePractitioners(o: UsePractitionersOptions) {
  return useQuery({
    queryKey: practitionersQueryKey(o),
    queryFn: () => fetchPractitionersApi(o),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
