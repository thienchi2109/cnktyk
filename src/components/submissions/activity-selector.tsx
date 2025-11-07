"use client";

import { useMemo, useState } from "react";
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
import { Building2, Globe, Loader2, RefreshCcw, Search } from "lucide-react";

const activityTypeLabels: Record<ActivityCatalogItem["LoaiHoatDong"], string> = {
  KhoaHoc: "Khóa học",
  HoiThao: "Hội thảo",
  NghienCuu: "Nghiên cứu",
  BaoCao: "Báo cáo",
};

type ScopeFilter = "all" | "global" | "unit";

interface ActivitySelectorProps {
  selectedActivityId?: string;
  onSelect: (activity: ActivityCatalogItem | null) => void;
}

function getActivityStatus(activity: ActivityCatalogItem) {
  if (activity.DaXoaMem) {
    return "inactive" as const;
  }

  if (activity.TrangThai && activity.TrangThai !== "DangHoatDong") {
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

  return (
    <button
      type="button"
      onClick={() => onSelect(activity)}
      className={cn(
        "w-full text-left",
        "rounded-xl border bg-white/40 p-4 transition",
        "hover:border-medical-blue/50 hover:bg-medical-blue/5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-medical-blue/60",
        isSelected && "border-medical-blue bg-medical-blue/10 shadow-sm shadow-medical-blue/10"
      )}
      aria-pressed={isSelected}
      data-selected={isSelected ? 'true' : 'false'}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{activity.TenDanhMuc}</p>
          <p className="text-xs text-gray-600">
            Loại hoạt động: {activityTypeLabels[activity.LoaiHoatDong]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={scope === "global" ? "secondary" : "outline"} className="flex items-center gap-1">
            {scope === "global" ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
            {scope === "global" ? "Hệ thống" : "Đơn vị"}
          </Badge>
          <Badge variant={activity.YeuCauMinhChung ? "default" : "outline"}>
            {activity.YeuCauMinhChung ? "Yêu cầu minh chứng" : "Không yêu cầu minh chứng"}
          </Badge>
        </div>
      </div>

      {status !== "active" && (
        <p className="mt-2 text-xs text-yellow-700">
          Hoạt động này đang ở trạng thái {status === "pending" ? "chưa hiệu lực" : "hết hiệu lực"}.
        </p>
      )}
    </button>
  );
}

export function ActivitySelector({ selectedActivityId, onSelect }: ActivitySelectorProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useActivitiesCatalog();
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const accessibleActivities = useMemo(() => {
    if (!data) return [] as ActivityCatalogItem[];
    return [...(data.global ?? []), ...(data.unit ?? [])];
  }, [data]);

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
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="flex items-center justify-between gap-3 text-red-700">
          <span>{error instanceof Error ? error.message : "Không thể tải danh sách hoạt động"}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium underline"
            onClick={() => refetch()}
          >
            <RefreshCcw className="h-3 w-3" /> Thử lại
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm kiếm hoạt động theo tên..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="sm:w-52">
          <Select value={scopeFilter} onValueChange={value => setScopeFilter(value as ScopeFilter)}>
            <SelectTrigger>
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
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Làm mới
        </button>
      </div>

      <GlassCard className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <p className="text-sm text-gray-600">
            Không tìm thấy hoạt động phù hợp. Thử điều chỉnh từ khóa hoặc bộ lọc.
          </p>
        ) : (
          <div className="space-y-3">
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
