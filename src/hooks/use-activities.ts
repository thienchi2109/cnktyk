"use client";

import { useQuery } from "@tanstack/react-query";

export interface ActivityCatalogItem {
  MaDanhMuc: string;
  TenDanhMuc: string;
  LoaiHoatDong: "KhoaHoc" | "HoiThao" | "NghienCuu" | "BaoCao";
  DonViTinh: "gio" | "tiet" | "tin_chi";
  TyLeQuyDoi: number;
  GioToiThieu: number | null;
  GioToiDa: number | null;
  YeuCauMinhChung: boolean;
  HieuLucTu: string | null;
  HieuLucDen: string | null;
  MaDonVi: string | null;
  DaXoaMem?: boolean;
  TrangThai?: string;
}

export interface ActivityPermissions {
  canCreateGlobal: boolean;
  canCreateUnit: boolean;
  canEditGlobal: boolean;
  canEditUnit: boolean;
  canAdoptToGlobal: boolean;
  canRestoreSoftDeleted: boolean;
}

export interface ActivitiesCatalogResponse {
  global: ActivityCatalogItem[];
  unit: ActivityCatalogItem[];
  permissions: ActivityPermissions;
  pagination?: {
    page: number;
    limit: number;
    totalGlobal: number;
    totalUnit: number;
    totalPages: {
      global: number;
      unit: number;
    };
  };
}

export function activitiesQueryKey() {
  return ["activities", "active"] as const;
}

export function activitiesCatalogQueryKey() {
  return ["activities", "catalog"] as const;
}

async function fetchActivities({ signal }: { signal?: AbortSignal } = {}) {
  const res = await fetch(`/api/activities?activeOnly=true&limit=1000&page=1`, {
    signal,
  });
  if (!res.ok) throw new Error("Failed to fetch activities");
  return res.json(); // { activities, pagination }
}

async function fetchActivitiesCatalog({ signal }: { signal?: AbortSignal } = {}) {
  const res = await fetch(`/api/activities?scope=all&limit=100`, { signal });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to load activities catalog");
  }
  return res.json() as Promise<ActivitiesCatalogResponse>;
}

export function useActivities() {
  return useQuery({
    queryKey: activitiesQueryKey(),
    queryFn: ({ signal }) => fetchActivities({ signal }),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useActivitiesCatalog() {
  return useQuery<ActivitiesCatalogResponse, Error>({
    queryKey: activitiesCatalogQueryKey(),
    queryFn: ({ signal }) => fetchActivitiesCatalog({ signal }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function upsertActivityCatalogEntry(
  catalog: ActivitiesCatalogResponse | undefined,
  activity: ActivityCatalogItem
): ActivitiesCatalogResponse | undefined {
  if (!catalog) {
    return catalog;
  }

  const isGlobal = activity.MaDonVi === null;
  const targetKey = isGlobal ? "global" : "unit";
  const otherKey = isGlobal ? "unit" : "global";

  const updatedTarget = [...catalog[targetKey]];
  const existingIndex = updatedTarget.findIndex(
    (item) => item.MaDanhMuc === activity.MaDanhMuc
  );

  if (existingIndex >= 0) {
    updatedTarget[existingIndex] = activity;
  } else {
    updatedTarget.unshift(activity);
  }

  const updatedOther = catalog[otherKey].filter(
    (item) => item.MaDanhMuc !== activity.MaDanhMuc
  );

  return {
    ...catalog,
    [targetKey]: updatedTarget,
    [otherKey]: updatedOther,
  };
}

export function removeActivityCatalogEntry(
  catalog: ActivitiesCatalogResponse | undefined,
  activityId: string
): ActivitiesCatalogResponse | undefined {
  if (!catalog) {
    return catalog;
  }

  return {
    ...catalog,
    global: catalog.global.filter((item) => item.MaDanhMuc !== activityId),
    unit: catalog.unit.filter((item) => item.MaDanhMuc !== activityId),
  };
}
