'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/glass-card';
import { Users, CheckCircle, Clock, AlertTriangle, Award } from 'lucide-react';

type Metrics = {
  totalPractitioners: number;
  activePractitioners: number;
  complianceRate: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  atRiskPractitioners: number;
};

export default function UnitDetailClient({ unitId, unitName }: { unitId: string; unitName: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/units/${unitId}/metrics`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || 'Unknown error');
        if (!canceled) setMetrics(json.data as Metrics);
      } catch (e: any) {
        if (!canceled) setError('Không thể tải số liệu đơn vị. Vui lòng thử lại.');
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    load();
    return () => {
      canceled = true;
      controller.abort();
    };
  }, [unitId]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" aria-busy={loading || undefined}>
        <GlassStat icon={<Users className="w-5 h-5 text-medical-blue" />} label="Nhân sự" value={metrics?.activePractitioners ?? 0} loading={loading} />
        <GlassStat icon={<CheckCircle className="w-5 h-5 text-medical-green" />} label="Tuân thủ" value={metrics?.complianceRate ? `${metrics.complianceRate}%` : 0} loading={loading} />
        <GlassStat icon={<Clock className="w-5 h-5 text-medical-amber" />} label="Chờ duyệt" value={metrics?.pendingApprovals ?? 0} loading={loading} />
        <GlassStat icon={<AlertTriangle className="w-5 h-5 text-medical-red" />} label="Rủi ro" value={metrics?.atRiskPractitioners ?? 0} loading={loading} />
        <GlassStat icon={<Award className="w-5 h-5 text-medical-blue" />} label="Đã phê duyệt (tháng)" value={metrics?.approvedThisMonth ?? 0} loading={loading} />
      </div>
    </div>
  );
}

function GlassStat({ icon, label, value, loading, isText = false }: { icon: React.ReactNode; label: string; value: string | number; loading: boolean; isText?: boolean }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-blue-100/50">
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24 rounded-lg bg-white/40" aria-hidden />
      ) : (
        <p className={`text-2xl font-bold ${isText ? 'text-gray-800 truncate' : 'text-medical-blue'}`}>{value}</p>
      )}
    </GlassCard>
  );
}
