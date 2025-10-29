"use client";

import { useQuery } from "@tanstack/react-query";

export function activitiesQueryKey() {
  return ["activities", "active"] as const;
}

async function fetchActivities() {
  const res = await fetch(`/api/activities?activeOnly=true&limit=1000&page=1`);
  if (!res.ok) throw new Error("Failed to fetch activities");
  return res.json(); // { activities, pagination }
}

export function useActivities() {
  return useQuery({
    queryKey: activitiesQueryKey(),
    queryFn: fetchActivities,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}