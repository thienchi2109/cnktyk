import { DashboardCardSkeleton, DashboardKpiSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { GlassCard } from "@/components/ui/glass-card";

export default function ReportsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white/30 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-white/20 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <GlassCard className="p-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-32 bg-white/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </GlassCard>

      {/* Content skeleton - KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <DashboardKpiSkeleton key={i} />
        ))}
      </div>

      {/* Additional content skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <DashboardCardSkeleton lines={5} />
        <DashboardCardSkeleton lines={5} />
      </div>
    </div>
  );
}
