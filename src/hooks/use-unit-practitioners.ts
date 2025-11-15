"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Practitioner data structure for unit-based selection
 */
export interface UnitPractitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  ChucDanh: string | null;
}

/**
 * Options for fetching unit practitioners
 */
export interface UseUnitPractitionersOptions {
  /** Unit ID to fetch practitioners for (optional for DonVi role - uses session) */
  unitId?: string;
  /** Initial data from server-side render (for SSR optimization) */
  initialData?: UnitPractitioner[];
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Query key factory for unit practitioners
 */
export function unitPractitionersQueryKey(unitId?: string) {
  return ["unit-practitioners", unitId || "current"] as const;
}

/**
 * Fetches all practitioners for a unit (no pagination)
 * Optimized for selector components with 100+ practitioners
 */
export async function fetchUnitPractitioners(
  unitId?: string
): Promise<UnitPractitioner[]> {
  const params = new URLSearchParams({
    limit: "1000", // High limit to get all practitioners
    page: "1",
  });

  if (unitId) {
    params.append("unitId", unitId);
  }

  const response = await fetch(`/api/practitioners?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch practitioners");
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * TanStack Query hook for fetching unit practitioners with caching
 * 
 * Features:
 * - 5-minute stale time (instant display on 2nd+ dialog open)
 * - Background refetch on window focus
 * - Accepts initialData from SSR for first paint optimization
 * - Automatic error handling and retry
 * 
 * @example
 * ```tsx
 * // With server-side initial data
 * const { data: practitioners, isLoading } = useUnitPractitioners({
 *   initialData: serverPractitioners,
 * });
 * 
 * // Without initial data (client-side only)
 * const { data: practitioners, isLoading } = useUnitPractitioners();
 * ```
 */
export function useUnitPractitioners(options: UseUnitPractitionersOptions = {}) {
  const { unitId, initialData, enabled = true } = options;

  return useQuery({
    queryKey: unitPractitionersQueryKey(unitId),
    queryFn: () => fetchUnitPractitioners(unitId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime in v4)
    enabled,
    initialData,
    refetchOnWindowFocus: true,
    retry: 3,
  });
}
