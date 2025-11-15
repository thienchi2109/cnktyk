/**
 * Practitioner Dashboard Component
 * Comprehensive dashboard with glassmorphism design for healthcare practitioners
 * Features: Progress tracking, activity management, alerts, analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { useIsDesktop } from '@/hooks/use-media-query';
import { GlassCard } from '@/components/ui/glass-card';
import { ComplianceProgressCard } from '@/components/credits/compliance-progress-card';
import { CreditSummaryChart } from '@/components/credits/credit-summary-chart';
import { CreditHistoryTable } from '@/components/credits/credit-history-table';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import {
  DashboardCardSkeleton,
  DashboardKpiSkeleton,
  DashboardListSkeleton,
  DashboardErrorCard,
  DashboardErrorPanel,
} from '@/components/dashboard/dashboard-skeletons';
import type { CreditSummary } from '@/hooks/use-credit-cycle';
import { 
  Plus, 
  Clock, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Bell,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PractitionerDashboardProps {
  userId: string;
}

interface RecentActivity {
  id: string;
  title: string;
  type: string;
  credits: number;
  status: 'DaDuyet' | 'ChoDuyet' | 'TuChoi' | 'YeuCauBoSung';
  date: string;
  reviewerComment?: string;
}

export function PractitionerDashboard({ userId }: PractitionerDashboardProps) {
  const isDesktop = useIsDesktop();
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<any>(null);
  const [creditSummary, setCreditSummary] = useState<CreditSummary[]>([]);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    activities: true,
    alerts: true,
    analytics: true
  });

  // Fetch all dashboard data in a single API call
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const response = await fetch('/api/dashboard/practitioner');
        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Missing dashboard payload');
        }

        const {
          practitioner,
          cycle: cycleData,
          activities,
          notifications: notifs,
          creditSummary: summary,
        } = result.data;

        if (practitioner) {
          setPractitionerId(practitioner.practitionerId);
        }

        if (cycleData) {
          const toNumber = (v: unknown, fb = 0) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : fb;
          };
          const start = cycleData.startDate ? new Date(cycleData.startDate) : null;
          const end = cycleData.endDate ? new Date(cycleData.endDate) : null;
          const required = toNumber(cycleData.requiredCredits, 0);
          const earned = toNumber(cycleData.earnedCredits, 0);
          const percentRaw = toNumber(
            cycleData.compliancePercent,
            required > 0 ? (earned / required) * 100 : 0
          );
          const percent = Number.isFinite(percentRaw) ? Math.min(Math.max(percentRaw, 0), 100) : 0;
          const daysLeft = end
            ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0;
          const statusMap: Record<string, 'DangThucHien' | 'HoanThanh' | 'QuaHan' | 'SapHetHan'> = {
            DangDienRa: 'DangThucHien',
            HoanThanh: 'HoanThanh',
            QuaHan: 'QuaHan',
            SapHetHan: 'SapHetHan',
          };

          setCycle({
            MaNhanVien: practitioner?.practitionerId ?? '',
            NgayBatDau: start ? start.toISOString() : '',
            NgayKetThuc: end ? end.toISOString() : '',
            TongTinChiYeuCau: required,
            TongTinChiDatDuoc: earned,
            TyLeHoanThanh: percent,
            TrangThai: statusMap[cycleData.status as string] ?? 'DangThucHien',
            SoNgayConLai: daysLeft,
          });
        } else {
          setCycle(null);
        }

        if (activities && Array.isArray(activities)) {
          const mappedActivities = activities.map((item: any) => ({
            id: item.id,
            title: item.title,
            type: item.type || 'Khác',
            credits: parseFloat(item.credits || 0),
            status: item.status,
            date: item.date,
            reviewerComment: item.reviewer_comment,
          }));
          setRecentActivities(mappedActivities);
          setCreditHistory(
            mappedActivities.map((a: any) => ({
              MaGhiNhan: a.id,
              TenHoatDong: a.title,
              TrangThaiDuyet: a.status,
              SoTinChi: a.credits,
              NgayGhiNhan: a.date,
            }))
          );
        } else {
          setRecentActivities([]);
          setCreditHistory([]);
        }

        if (notifs && Array.isArray(notifs)) {
          setNotifications(
            notifs.map((n: any) => ({
              MaThongBao: n.id,
              Loai: n.type,
              ThongDiep: n.message,
              LienKet: n.link,
              TrangThai: n.status,
              TaoLuc: n.created_at,
            }))
          );
        } else {
          setNotifications([]);
        }

        if (summary && Array.isArray(summary)) {
          const toNumber = (value: unknown, fallback = 0) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
          };

          const toOptionalNumber = (value: unknown) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
          };

          const normalizedSummary: CreditSummary[] = summary.map((item: any) => {
            const loaiHoatDong = item.LoaiHoatDong ?? item.activity_type ?? 'Khac';
            const tongTinChi = toNumber(
              item.TongTinChi ?? item.total_credits ?? item.totalCredits
            );
            const soHoatDong = toNumber(item.SoHoatDong ?? item.count);
            const tranToiDa = toOptionalNumber(item.TranToiDa ?? item.maxCredits);
            const conLai = toOptionalNumber(item.ConLai ?? item.remainingCredits);

            return {
              LoaiHoatDong: loaiHoatDong,
              TongTinChi: tongTinChi,
              SoHoatDong: soHoatDong,
              ...(tranToiDa !== undefined ? { TranToiDa: tranToiDa } : {}),
              ...(conLai !== undefined ? { ConLai: conLai } : {}),
            };
          });
          setCreditSummary(normalizedSummary);
        } else {
          setCreditSummary([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoadError('Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại sau.');
        setCycle(null);
        setRecentActivities([]);
        setCreditHistory([]);
        setNotifications([]);
        setCreditSummary([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusConfig = (status: RecentActivity['status']) => {
    const configs = {
      'DaDuyet': {
        label: 'Đã duyệt',
        color: 'bg-medical-green/20 text-medical-green border-medical-green/30',
        icon: CheckCircle
      },
      'ChoDuyet': {
        label: 'Chờ duyệt',
        color: 'bg-medical-amber/20 text-medical-amber border-medical-amber/30',
        icon: Clock
      },
      'TuChoi': {
        label: 'Từ chối',
        color: 'bg-medical-red/20 text-medical-red border-medical-red/30',
        icon: XCircle
      },
      'YeuCauBoSung': {
        label: 'Yêu cầu bổ sung',
        color: 'bg-blue-100/50 text-blue-700 border-blue-300',
        icon: AlertTriangle
      }
    };
    return configs[status] || configs['ChoDuyet'];
  };

  const priorityNotifications = notifications
    .filter(n => n.TrangThai === 'Moi' && (n.Loai === 'CanhBao' || n.Loai === 'KhanCap'))
    .slice(0, 5);
  
  // Use consolidated loading state
  const cycleLoading = loading;
  const loadingActivities = loading;
  const notificationsLoading = loading;
  const hasError = Boolean(loadError);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Hero Section - Personal Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Progress Card */}
          <div className="lg:col-span-2" aria-busy={cycleLoading || undefined}>
            {cycleLoading ? (
              <DashboardCardSkeleton className="h-full" />
            ) : hasError ? (
              <DashboardErrorCard message={loadError ?? 'Không thể tải dữ liệu tiến độ.'} />
            ) : (
              <ComplianceProgressCard cycle={cycle} />
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4" aria-busy={cycleLoading || undefined}>
            {cycleLoading ? (
              <>
                <DashboardKpiSkeleton />
                <DashboardKpiSkeleton />
              </>
            ) : hasError ? (
              <DashboardErrorCard message={loadError ?? 'Không thể tải dữ liệu thống kê.'} />
            ) : (
              <>
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100/50">
                      <Activity className="w-5 h-5 text-medical-blue" />
                    </div>
                    <h3 className="font-semibold text-gray-800">Hoạt động</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tổng số</span>
                      <span className="text-2xl font-bold text-medical-blue">
                        {creditHistory.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Đã duyệt</span>
                      <span className="text-lg font-semibold text-medical-green">
                        {creditHistory.filter(h => h.TrangThaiDuyet === 'DaDuyet').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Chờ duyệt</span>
                      <span className="text-lg font-semibold text-medical-amber">
                        {creditHistory.filter(h => h.TrangThaiDuyet === 'ChoDuyet').length}
                      </span>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6" aria-busy={notificationsLoading || undefined}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100/50">
                      <Bell className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800">Thông báo</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Chưa đọc</span>
                      <span className="text-2xl font-bold text-purple-600">
                        {notifications.filter(n => n.TrangThai === 'Moi').length}
                      </span>
                    </div>
                    <Link href="/notifications">
                      <Button variant="outline" size="sm" className="w-full">
                        Xem tất cả
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              </>
            )}
          </div>
        </div>

        {/* Activity Management Section */}
        <GlassCard className="p-6" aria-busy={loadingActivities || hasError || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100/50">
                <FileText className="w-5 h-5 text-medical-green" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Quản lý hoạt động</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/submissions/new">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Ghi nhận hoạt động mới</span>
                  <span className="sm:hidden">Thêm mới</span>
                </Button>
              </Link>
              <button
                onClick={() => toggleSection('activities')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors lg:hidden"
              >
                {expandedSections.activities ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {(expandedSections.activities || isDesktop) && (
            hasError ? (
              <DashboardErrorPanel message={loadError ?? 'Không thể tải danh sách hoạt động.'} />
            ) : (
              <div className="space-y-4">
                <ActivityTimeline
                  activities={recentActivities}
                  loading={loadingActivities}
                />

                {!loadingActivities && recentActivities.length > 5 && (
                  <div className="text-center pt-4">
                    <Link href="/submissions">
                      <Button variant="outline">
                        Xem tất cả hoạt động
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )
          )}
        </GlassCard>

        {/* Alerts & Notifications Panel */}
        <GlassCard className="p-6" aria-busy={notificationsLoading || hasError || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100/50">
                <AlertTriangle className="w-5 h-5 text-medical-red" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Cảnh báo & Thông báo</h2>
            </div>
            <button
              onClick={() => toggleSection('alerts')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors lg:hidden"
            >
              {expandedSections.alerts ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

          {(expandedSections.alerts || isDesktop) && (
            <div className="space-y-3">
              {hasError ? (
                <DashboardErrorPanel message={loadError ?? 'Không thể tải dữ liệu cảnh báo.'} />
              ) : notificationsLoading ? (
                <DashboardListSkeleton lines={3} />
              ) : priorityNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-medical-green" />
                  <p>Không có cảnh báo ưu tiên</p>
                </div>
              ) : (
                <>
                  {priorityNotifications.map((notification) => (
                    <div
                      key={notification.MaThongBao}
                      className="p-4 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            notification.Loai === 'KhanCap'
                              ? 'bg-red-100/50'
                              : 'bg-amber-100/50'
                          }`}
                        >
                          <AlertTriangle
                            className={`w-5 h-5 ${
                              notification.Loai === 'KhanCap'
                                ? 'text-medical-red'
                                : 'text-medical-amber'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-1">
                            {notification.Loai || 'Thông báo'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {notification.ThongDiep}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.TaoLuc).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <Link href="/notifications">
                      <Button variant="outline" size="sm">
                        Xem tất cả thông báo
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* Personal Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100/50">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Phân tích cá nhân</h2>
              </div>
              <button
                onClick={() => toggleSection('analytics')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors lg:hidden"
              >
                {expandedSections.analytics ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
            {(expandedSections.analytics || isDesktop) && (
              hasError ? (
                <DashboardErrorPanel message={loadError ?? 'Không thể tải dữ liệu phân tích.'} />
              ) : (
                <div aria-busy={cycleLoading || undefined}>
                  <CreditSummaryChart
                    creditSummary={creditSummary}
                    loading={cycleLoading && !hasError}
                  />
                </div>
              )
            )}
          </div>

          <div>
            {(expandedSections.analytics || isDesktop) && (
              hasError ? (
                <DashboardErrorPanel message={loadError ?? 'Không thể tải lịch sử tín chỉ.'} />
              ) : (
                <div className="lg:mt-12" aria-busy={cycleLoading || undefined}>
                  <CreditHistoryTable
                    creditHistory={creditHistory.slice(0, 5)}
                    loading={cycleLoading && !hasError}
                  />
                </div>
              )
            )}
          </div>
        </div>
    </div>
  );
}
