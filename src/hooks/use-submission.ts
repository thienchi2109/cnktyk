"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function submissionQueryKey(id: string) {
  return ["submission", id] as const;
}

export async function fetchSubmissionApi(id: string) {
  const res = await fetch(`/api/submissions/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch submission");
  }
  return res.json(); // { submission }
}

export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: id ? submissionQueryKey(id) : ["submission", "none"],
    queryFn: () => fetchSubmissionApi(id as string),
    enabled: !!id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useReviewSubmissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; action: "approve" | "reject" | "request_info"; comments?: string; reason?: string }) => {
      const res = await fetch(`/api/submissions/${args.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: args.action, comments: args.comments, reason: args.reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update submission");
      }
      return data as { submission: any; message: string };
    },
    onSuccess: (data, vars) => {
      // update detail cache
      qc.setQueryData(submissionQueryKey(vars.id), { submission: data.submission });
      // invalidate list queries
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useEditSubmissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; data: Record<string, any> }) => {
      const res = await fetch(`/api/submissions/${args.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args.data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Failed to edit submission");
      }
      return result as { submission: any; message: string };
    },
    onSuccess: (data, vars) => {
      // update detail cache
      qc.setQueryData(submissionQueryKey(vars.id), { submission: data.submission });
      // invalidate list queries
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useDeleteSubmissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string }) => {
      const res = await fetch(`/api/submissions/${args.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Failed to delete submission");
      }
      return result as { success: boolean; message: string };
    },
    onSuccess: (data, vars) => {
      // remove from cache
      qc.removeQueries({ queryKey: submissionQueryKey(vars.id) });
      // invalidate list queries to refresh
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}
