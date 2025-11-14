import { GlassCard } from '@/components/ui/glass-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function UnitDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 bg-white/40" />
          <Skeleton className="h-4 w-40 mt-2 bg-white/20" />
        </div>
        <Skeleton className="h-9 w-32 bg-white/30" />
      </div>

      <GlassCard className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <GlassCard key={i} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-100/50">
                    <Skeleton className="w-5 h-5 bg-white/40" />
                  </div>
                  <Skeleton className="h-4 w-16 bg-white/30" />
                </div>
                <Skeleton className="h-8 w-20 bg-white/40" />
              </GlassCard>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}