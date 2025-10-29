'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Award,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity
} from 'lucide-react';
import { useIsDesktop } from '@/hooks/use-media-query';
import { useDebounce } from '@/hooks/use-debounce';
import {
  DashboardCardSkeleton,
  DashboardKpiSkeleton,
  DashboardErrorCard,
  DashboardErrorPanel,
} from '@/components/dashboard/dashboard-skeletons';

interface SystemMetrics {
  totalUnits: number;
  totalPractitioners: number;
  activePractitioners: number;
  complianceRate: number;
  totalSubmissions: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  totalCreditsAwarded: number;
  atRiskPractitioners: number;
}

interface UnitPerformance {
  id: string;
  name: string;
  type: string;
  totalPractitioners: number;
  activePractitioners: number;
  compliantPractitioners: number;
  complianceRate: number;
  pendingApprovals: number;
  totalCredits: number;
}

interface RecentActivity {
  id: string;
  type: 'approval' | 'rejection' | 'submission' | 'alert';
  message: string;
  timestamp: string;
  unitName?: string;
}

export interface DohDashboardProps {
  userId: string;
}

export function DohDashboard({ userId }: DohDashboardProps) {
  const isDesktop = useIsDesktop();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUnits: 0,
    totalPractitioners: 0,
    activePractitioners: 0,
    complianceRate: 0,
    totalSubmissions: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    totalCreditsAwarded: 0,
    atRiskPractitioners: 0
  });
  const [units, setUnits] = useState<UnitPerformance[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [sortBy, setSortBy] = useState<'name' | 'compliance' | 'practitioners'>('compliance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    units: true,
    analytics: true,
    activity: true
  });

  // Fetch system metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);
        setMetricsError(null);
        const response = await fetch('/api/system/metrics');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load system metrics');
        }

        setMetrics(result.data);
      } catch (error) {
        console.error('Error fetching system metrics:', error);
        setMetricsError('Không thể tải số liệu hệ thống. Vui lòng thử lại.');
        setMetrics({
          totalUnits: 0,
          totalPractitioners: 0,
          activePractitioners: 0,
          complianceRate: 0,
          totalSubmissions: 0,
          pendingApprovals: 0,
          approvedThisMonth: 0,
          rejectedThisMonth: 0,
          totalCreditsAwarded: 0,
          atRiskPractitioners: 0,
        });
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Fetch units performance with server-side filtering and sorting
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setUnitsLoading(true);
        setUnitsError(null);

        const params = new URLSearchParams();
        if (debouncedSearchTerm.trim()) {
          params.append('search', debouncedSearchTerm.trim());
        }
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);

        const response = await fetch(`/api/system/units-performance?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load units performance');
        }

        setUnits(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        console.error('Error fetching units performance:', error);
        setUnitsError('Không thể tải danh sách đơn vị. Vui lòng thử lại.');
        setUnits([]);
      } finally {
        setUnitsLoading(false);
      }
    };

    fetchUnits();
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getComplianceColor = (percent: number) => {
    if (percent >= 90) return 'text-medical-green';
    if (percent >= 70) return 'text-medical-amber';
    return 'text-medical-red';
  };

  const getComplianceBgColor = (percent: number) => {
    if (percent >= 90) return 'bg-medical-green/10 border-medical-green/30';
    if (percent >= 70) return 'bg-medical-amber/10 border-medical-amber/30';
    return 'bg-medical-red/10 border-medical-red/30';
  };

  // No need for client-side sorting and filtering - now handled by server

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Executive Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-medical-blue/10 backdrop-blur-sm">
                <Building2 className="w-8 h-8 text-medical-blue" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Bảng điều khiển Sở Y Tế
                </h1>
                <p className="text-gray-600">Giám sát toàn Hệ thống Quản lý đào tạo nhân lực y tế</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton variant="outline" size="sm" className="hidden md:flex items-center gap-2">
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </GlassButton>
            </div>
          </div>

          {/* Executive KPI Cards */}
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
            aria-busy={metricsLoading || undefined}
          >
            {metricsLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <DashboardKpiSkeleton key={index} />
              ))
            ) : metricsError ? (
              <DashboardErrorCard
                message={metricsError}
                className="col-span-full"
              />
            ) : (
              <>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100/50">
                      <Building2 className="w-5 h-5 text-medical-blue" />
                    </div>
                    <span className="text-sm text-gray-600">Đơn vị</span>
                  </div>
                  <p className="text-3xl font-bold text-medical-blue">{metrics.totalUnits}</p>
                  <p className="text-xs text-gray-500 mt-1">Đang hoạt động</p>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100/50">
                      <Users className="w-5 h-5 text-medical-blue" />
                    </div>
                    <span className="text-sm text-gray-600">Người hành nghề</span>
                  </div>
                  <p className="text-3xl font-bold text-medical-blue">{metrics.activePractitioners}</p>
                  <p className="text-xs text-gray-500 mt-1">Đang làm việc</p>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-100/50">
                      <CheckCircle className="w-5 h-5 text-medical-green" />
                    </div>
                    <span className="text-sm text-gray-600">Tuân thủ</span>
                  </div>
                  <p className="text-3xl font-bold text-medical-green">{metrics.complianceRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">Tỷ lệ hoàn thành</p>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-amber-100/50">
                      <Clock className="w-5 h-5 text-medical-amber" />
                    </div>
                    <span className="text-sm text-gray-600">Chờ duyệt</span>
                  </div>
                  <p className="text-3xl font-bold text-medical-amber">{metrics.pendingApprovals}</p>
                  <p className="text-xs text-gray-500 mt-1">Hoạt động</p>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-red-100/50">
                      <AlertTriangle className="w-5 h-5 text-medical-red" />
                    </div>
                    <span className="text-sm text-gray-600">Rủi ro</span>
                  </div>
                  <p className="text-3xl font-bold text-medical-red">{metrics.atRiskPractitioners}</p>
                  <p className="text-xs text-gray-500 mt-1">Cần theo dõi</p>
                </GlassCard>
              </>
            )}
          </div>
        </div>

        {/* System Analytics */}
        <GlassCard className="p-6" aria-busy={metricsLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100/50">
                <BarChart3 className="w-5 h-5 text-medical-blue" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Phân tích hệ thống</h2>
            </div>
            <button
              onClick={() => toggleSection('analytics')}
              className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              {expandedSections.analytics ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {expandedSections.analytics && (
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              aria-busy={metricsLoading || undefined}
            >
              {metricsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <DashboardCardSkeleton key={index} lines={3} />
                ))
              ) : metricsError ? (
                <DashboardErrorPanel
                  message={metricsError}
                  className="col-span-full"
                />
              ) : (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Hoạt động tháng này</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                        <span className="text-sm text-gray-600">Đã phê duyệt</span>
                        <span className="text-lg font-bold text-medical-green">{metrics.approvedThisMonth}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/50">
                        <span className="text-sm text-gray-600">Từ chối</span>
                        <span className="text-lg font-bold text-medical-red">{metrics.rejectedThisMonth}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50">
                        <span className="text-sm text-gray-600">Tổng ghi nhận</span>
                        <span className="text-lg font-bold text-medical-blue">{metrics.totalSubmissions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Tín chỉ</h3>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-medical-blue" />
                        <span className="text-sm text-gray-600">Tổng tín chỉ cấp</span>
                      </div>
                      <p className="text-3xl font-bold text-medical-blue">
                        {metrics.totalCreditsAwarded.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Tất cả hoạt động đã duyệt</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Hiệu suất</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50">
                        <span className="text-sm text-gray-600">Tỷ lệ phê duyệt</span>
                        <span className="text-lg font-bold text-medical-blue">
                          {metrics.totalSubmissions > 0 
                            ? Math.round((metrics.approvedThisMonth / metrics.totalSubmissions) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                        <span className="text-sm text-gray-600">Trung bình/người</span>
                        <span className="text-lg font-bold text-medical-green">
                          {metrics.activePractitioners > 0
                            ? (metrics.totalCreditsAwarded / metrics.activePractitioners).toFixed(1)
                            : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* Multi-Unit Comparison */}
        <GlassCard className="p-6" aria-busy={unitsLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100/50">
                <Building2 className="w-5 h-5 text-medical-blue" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">So sánh đơn vị</h2>
              {!unitsLoading && !unitsError && units.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-medical-blue/20 text-medical-blue text-sm font-semibold">
                  {units.length} đơn vị
                </span>
              )}
            </div>
            <button
              onClick={() => toggleSection('units')}
              className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              {expandedSections.units ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {expandedSections.units && (
            <div className="space-y-4">
              {/* Search and Sort Controls */}
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Tìm kiếm đơn vị..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/50"
                />
                <div className="flex gap-2">
                  <GlassButton
                    variant={sortBy === 'name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('name')}
                  >
                    Tên
                  </GlassButton>
                  <GlassButton
                    variant={sortBy === 'compliance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('compliance')}
                  >
                    Tuân thủ
                  </GlassButton>
                  <GlassButton
                    variant={sortBy === 'practitioners' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('practitioners')}
                  >
                    Số lượng
                  </GlassButton>
                  <GlassButton
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </GlassButton>
                </div>
              </div>

              {/* Units Grid */}
              {unitsError ? (
                <DashboardErrorPanel message={unitsError} />
              ) : unitsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <DashboardCardSkeleton key={index} lines={4} />
                  ))}
                </div>
              ) : units.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">Không tìm thấy đơn vị</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((unit) => (
                    <GlassCard key={unit.id} className={`p-4 border-2 ${getComplianceBgColor(unit.complianceRate)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">{unit.name}</h3>
                          <p className="text-xs text-gray-500">{unit.type}</p>
                        </div>
                        <div className={`text-2xl font-bold ${getComplianceColor(unit.complianceRate)}`}>
                          {unit.complianceRate}%
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Người hành nghề</span>
                          <span className="font-semibold text-gray-800">{unit.activePractitioners}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Hoàn thành</span>
                          <span className="font-semibold text-medical-green">{unit.compliantPractitioners}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Chờ duyệt</span>
                          <span className="font-semibold text-medical-amber">{unit.pendingApprovals}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Tổng tín chỉ</span>
                          <span className="font-semibold text-medical-blue">{unit.totalCredits.toFixed(0)}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200/50">
                        <GlassButton variant="outline" size="sm" className="w-full">
                          Xem chi tiết
                        </GlassButton>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassCard>

    </div>
  );
}
