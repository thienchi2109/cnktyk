"use client";

import { useEffect, useMemo, useState } from "react";
import { useActivitiesCatalog, ActivityCatalogItem } from "@/hooks/use-activities";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Building2, Globe, Loader2, RefreshCcw, Search, AlertCircle } from "lucide-react";

const activityTypeLabels: Record<ActivityCatalogItem["LoaiHoatDong"], string> = {
  KhoaHoc: "Khóa học",
  HoiThao: "Hội thảo",
  NghienCuu: "Nghiên cứu",
  BaoCao: "Báo cáo",
};

type ScopeFilter = "all" | "global" | "unit";

interface ActivitySelectorProps {
  selectedActivityId?: string;
  preselectedActivityId?: string;
  onSelect: (activity: ActivityCatalogItem | null) => void;
}

function getActivityStatus(activity: ActivityCatalogItem) {
  if (activity.DaXoaMem) {
    return "inactive" as const;
  }

  if (activity.TrangThai && activity.TrangThai !== "Active") {
    return "inactive" as const;
  }

  const now = new Date();
  const startDate = activity.HieuLucTu ? new Date(activity.HieuLucTu) : null;
  const endDate = activity.HieuLucDen ? new Date(activity.HieuLucDen) : null;

  if (startDate && startDate > now) {
    return "pending" as const;
  }

  if (endDate && endDate < now) {
    return "expired" as const;
  }

  return "active" as const;
}

function ActivityRow({
  activity,
  isSelected,
  onSelect,
}: {
  activity: ActivityCatalogItem;
  isSelected: boolean;
  onSelect: (activity: ActivityCatalogItem) => void;
}) {
  const scope = activity.MaDonVi ? "unit" : "global";
  const status = getActivityStatus(activity);
  const scopeLabel = scope === "global" ? "Hệ thống" : "Đơn vị";

  return (
    <button
      type="button"
      onClick={() => onSelect(activity)}
      className={cn(
        "w-full text-left",
        "rounded-xl border bg-white/40 p-3 sm:p-4 transition",
        "hover:border-medical-blue/50 hover:bg-medical-blue/5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-medical-blue/60 focus-visible:ring-offset-2",
        isSelected && "border-medical-blue bg-medical-blue/10 shadow-sm shadow-medical-blue/10"
      )}
      aria-pressed={isSelected}
      aria-label={`${activity.TenDanhMuc}, ${activityTypeLabels[activity.LoaiHoatDong]}, ${scopeLabel}, ${activity.YeuCauMinhChung ? 'yêu cầu minh chứng' : 'không yêu cầu minh chứng'}`}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{activity.TenDanhMuc}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Loại hoạt động: {activityTypeLabels[activity.LoaiHoatDong]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={scope === "global" ? "secondary" : "outline"} className="flex items-center gap-1">
            {scope === "global" ? <Globe className="h-3 w-3" aria-hidden="true" /> : <Building2 className="h-3 w-3" aria-hidden="true" />}
            <span>{scopeLabel}</span>
          </Badge>
          <Badge variant={activity.YeuCauMinhChung ? "default" : "outline"}>
            {activity.YeuCauMinhChung ? "Yêu cầu minh chứng" : "Không yêu cầu minh chứng"}
          </Badge>
        </div>
      </div>

      {status !== "active" && (
        <p className="mt-2 text-xs text-yellow-700" role="status">
          Hoạt động này đang ở trạng thái {status === "pending" ? "chưa hiệu lực" : "hết hiệu lực"}.
        </p>
      )}
    </button>
  );
}

export function ActivitySelector({ selectedActivityId, preselectedActivityId, onSelect }: ActivitySelectorProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useActivitiesCatalog();
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const accessibleActivities = useMemo(() => {
    if (!data) return [] as ActivityCatalogItem[];
    return [...(data.global ?? []), ...(data.unit ?? [])];
  }, [data]);

  // Auto-select preselected activity when data is loaded
  useEffect(() => {
    if (preselectedActivityId && accessibleActivities.length > 0 && !selectedActivityId) {
      const preselectedActivity = accessibleActivities.find(
        activity => activity.MaDanhMuc === preselectedActivityId
      );
      if (preselectedActivity) {
        onSelect(preselectedActivity);
      }
    }
  }, [preselectedActivityId, accessibleActivities, selectedActivityId, onSelect]);

  const filteredActivities = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    return accessibleActivities
      .filter(activity => getActivityStatus(activity) === "active")
      .filter(activity => {
        if (scopeFilter === "global") {
          return !activity.MaDonVi;
        }
        if (scopeFilter === "unit") {
          return !!activity.MaDonVi;
        }
        return true;
      })
      .filter(activity => {
        if (!normalizedSearch) return true;
        return activity.TenDanhMuc.toLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => a.TenDanhMuc.localeCompare(b.TenDanhMuc, "vi"));
  }, [accessibleActivities, scopeFilter, searchTerm]);

  if (isError) {
    return (
      <Alert className="border-red-200 bg-red-50" role="alert">
        <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
        <AlertDescription className="flex flex-col gap-2 text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error instanceof Error ? error.message : "Không thể tải danh sách hoạt động"}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium underline hover:no-underline"
            onClick={() => refetch()}
            aria-label="Thử tải lại danh sách hoạt động"
          >
            <RefreshCcw className="h-3 w-3" aria-hidden="true" /> Thử lại
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4" role="search" aria-label="Tìm kiếm và chọn hoạt động">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Tìm kiếm hoạt động theo tên..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="pl-10"
              aria-label="Tìm kiếm hoạt động"
              type="search"
            />
          </div>
        </div>

        <div className="sm:w-52">
          <Select value={scopeFilter} onValueChange={value => setScopeFilter(value as ScopeFilter)}>
            <SelectTrigger aria-label="Lọc theo phạm vi hoạt động">
              <SelectValue placeholder="Phạm vi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phạm vi</SelectItem>
              <SelectItem value="global">Chỉ hoạt động hệ thống</SelectItem>
              <SelectItem value="unit">Chỉ hoạt động đơn vị</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-medical-blue/40 bg-white px-3 py-2 text-sm font-medium text-medical-blue shadow-sm transition hover:border-medical-blue hover:bg-medical-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isFetching}
          aria-label={isFetching ? "Đang làm mới danh sách" : "Làm mới danh sách hoạt động"}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
          <span>Làm mới</span>
        </button>
      </div>

      <GlassCard className="p-3 sm:p-4" role="region" aria-label="Danh sách hoạt động">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Đang tải danh sách hoạt động">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl bg-slate-200" />
            ))}
            <span className="sr-only">Đang tải danh sách hoạt động...</span>
          </div>
        ) : filteredActivities.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4" role="status">
            Không tìm thấy hoạt động phù hợp. Thử điều chỉnh từ khóa hoặc bộ lọc.
          </p>
        ) : (
          <div className="space-y-3" role="listbox" aria-label="Chọn hoạt động">
            {filteredActivities.map(activity => (
              <ActivityRow
                key={activity.MaDanhMuc}
                activity={activity}
                isSelected={activity.MaDanhMuc === selectedActivityId}
                onSelect={item => onSelect(item.MaDanhMuc === selectedActivityId ? null : item)}
              />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
