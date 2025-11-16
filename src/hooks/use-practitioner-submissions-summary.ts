"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Hook for fetching submission summary statistics for a practitioner
 * Returns counts grouped by status (pending, approved, rejected, total)
 */

export interface PractitionerSubmissionsSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface PractitionerSubmissionsSummaryResponse {
  success: boolean;
  summary: PractitionerSubmissionsSummary;
  practitionerId: string;
}

export function practitionerSubmissionsSummaryQueryKey(practitionerId: string | null) {
  return ["practitioner-submissions-summary", practitionerId] as const;
}

export async function fetchPractitionerSubmissionsSummary(
  practitionerId: string
): Promise<PractitionerSubmissionsSummaryResponse> {
  const params = new URLSearchParams({ practitionerId });

  const res = await fetch(`/api/submissions/summary?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch submissions summary");
  }

  return res.json();
}

export function usePractitionerSubmissionsSummary(practitionerId: string | null) {
  return useQuery<PractitionerSubmissionsSummaryResponse>({
    queryKey: practitionerSubmissionsSummaryQueryKey(practitionerId),
    queryFn: () => {
      if (!practitionerId) {
        throw new Error("practitionerId is required");
      }
      return fetchPractitionerSubmissionsSummary(practitionerId);
    },
    enabled: !!practitionerId, // Only fetch if practitionerId is provided
    staleTime: 30_000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60_000, // Garbage collect after 5 minutes
    refetchOnWindowFocus: false,
  });
}
