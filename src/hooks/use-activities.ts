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

export type ActivitiesCatalogScope = "all" | "global" | "unit";
export type ActivitiesCatalogStatusFilter = "active" | "pending" | "expired" | "all";
export type ActivitiesCatalogTypeFilter = ActivityCatalogItem["LoaiHoatDong"] | "all";

export type ActivityLifecycleStatus = "active" | "pending" | "expired";

export interface ActivitiesCatalogFilters {
  scope?: ActivitiesCatalogScope;
  search?: string;
  type?: ActivitiesCatalogTypeFilter;
  status?: ActivitiesCatalogStatusFilter;
  page?: number;
  limit?: number;
}

export const activitiesCatalogBaseKey = ["activities", "catalog"] as const;

export interface NormalizedActivitiesCatalogFilters {
  scope: ActivitiesCatalogScope;
  page: number;
  limit: number;
  search: string;
  type: ActivitiesCatalogTypeFilter;
  status: ActivitiesCatalogStatusFilter;
}

function normalizeCatalogFilters(filters: ActivitiesCatalogFilters = {}): NormalizedActivitiesCatalogFilters {
  const scope: ActivitiesCatalogScope = filters.scope ?? "all";
  const rawPage = filters.page ?? 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawLimit = filters.limit ?? 50;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 50;
  const search = filters.search?.trim() ?? "";
  const type: ActivitiesCatalogTypeFilter = filters.type ?? "all";
  const status: ActivitiesCatalogStatusFilter = filters.status ?? "all";

  return { scope, page, limit, search, type, status } as const;
}

export function activitiesCatalogQueryKey(filters?: ActivitiesCatalogFilters) {
  const normalized = normalizeCatalogFilters(filters);
  return [...activitiesCatalogBaseKey, normalized] as const;
}

export function getNormalizedActivitiesCatalogFilters(filters?: ActivitiesCatalogFilters): NormalizedActivitiesCatalogFilters {
  return normalizeCatalogFilters(filters);
}

export function getActivityLifecycleStatus(activity: ActivityCatalogItem): ActivityLifecycleStatus {
  const now = new Date();
  const startDate = activity.HieuLucTu ? new Date(activity.HieuLucTu) : null;
  const endDate = activity.HieuLucDen ? new Date(activity.HieuLucDen) : null;

  if (startDate && startDate > now) {
    return "pending";
  }

  if (endDate && endDate < now) {
    return "expired";
  }

  return "active";
}

export function activityMatchesFilters(
  activity: ActivityCatalogItem,
  filters: NormalizedActivitiesCatalogFilters
): boolean {
  if (filters.scope === "global" && activity.MaDonVi !== null) {
    return false;
  }

  if (filters.scope === "unit" && activity.MaDonVi === null) {
    return false;
  }

  if (filters.search.length > 0) {
    const searchLower = filters.search.toLowerCase();
    if (!activity.TenDanhMuc.toLowerCase().includes(searchLower)) {
      return false;
    }
  }

  if (filters.type !== "all" && activity.LoaiHoatDong !== filters.type) {
    return false;
  }

  if (filters.status !== "all") {
    const status = getActivityLifecycleStatus(activity);
    if (status !== filters.status) {
      return false;
    }
  }

  return true;
}

async function fetchActivities({ signal }: { signal?: AbortSignal } = {}) {
  const res = await fetch(`/api/activities?activeOnly=true&limit=1000&page=1`, {
    signal,
  });
  if (!res.ok) throw new Error("Failed to fetch activities");
  return res.json(); // { activities, pagination }
}

async function fetchActivitiesCatalog({ signal, filters }: { signal?: AbortSignal; filters?: ActivitiesCatalogFilters } = {}) {
  const normalized = normalizeCatalogFilters(filters);
  const params = new URLSearchParams();
  params.set("scope", normalized.scope);
  params.set("page", normalized.page.toString());
  params.set("limit", normalized.limit.toString());
  if (normalized.search.length > 0) {
    params.set("search", normalized.search);
  }
  if (normalized.type !== "all") {
    params.set("type", normalized.type);
  }
  if (normalized.status !== "all") {
    params.set("status", normalized.status);
  }

  const queryString = params.toString();
  const url = queryString.length > 0 ? `/api/activities?${queryString}` : "/api/activities";
  const res = await fetch(url, { signal });
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

export function useActivitiesCatalog(filters?: ActivitiesCatalogFilters) {
  return useQuery<ActivitiesCatalogResponse, Error>({
    queryKey: activitiesCatalogQueryKey(filters),
    queryFn: ({ signal }) => fetchActivitiesCatalog({ signal, filters }),
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
