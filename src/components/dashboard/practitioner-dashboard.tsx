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
import { useCreditCycle } from '@/hooks/use-credit-cycle';
import { useNotifications } from '@/hooks/use-notifications';
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
import { GlassButton } from '@/components/ui/glass-button';

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
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    activities: true,
    alerts: true,
    analytics: true
  });

  const { cycle, creditSummary, creditHistory, loading: cycleLoading } = useCreditCycle(
    practitionerId,
    true
  );
  
  const { notifications, loading: notificationsLoading } = useNotifications();

  // Fetch practitioner ID from user account
  useEffect(() => {
    const fetchPractitionerId = async () => {
      try {
        const response = await fetch(`/api/practitioners?userId=${userId}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
          setPractitionerId(result.data[0].MaNhanVien);
        }
      } catch (error) {
        console.error('Error fetching practitioner:', error);
      }
    };

    fetchPractitionerId();
  }, [userId]);

  // Fetch recent activities
  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!practitionerId) return;

      try {
        setLoadingActivities(true);
        const response = await fetch(`/api/submissions?practitionerId=${practitionerId}&limit=10`);
        const result = await response.json();

        if (result.success) {
          setRecentActivities(result.data.map((item: any) => ({
            id: item.MaGhiNhan,
            title: item.TenHoatDong,
            type: item.LoaiHoatDong || 'Khác',
            credits: item.SoTinChi,
            status: item.TrangThaiDuyet,
            date: item.NgayGhiNhan,
            reviewerComment: item.NhanXetNguoiDuyet
          })));
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchRecentActivities();
  }, [practitionerId]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* Hero Section - Personal Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Progress Card */}
          <div className="lg:col-span-2">
            <ComplianceProgressCard cycle={cycle} loading={cycleLoading} />
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
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

            <GlassCard className="p-6">
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
                  <GlassButton variant="outline" size="sm" className="w-full">
                    Xem tất cả
                  </GlassButton>
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Activity Management Section */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100/50">
                <FileText className="w-5 h-5 text-medical-green" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Quản lý hoạt động</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/submissions/new">
                <GlassButton className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Ghi nhận hoạt động mới</span>
                  <span className="sm:hidden">Thêm mới</span>
                </GlassButton>
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
            <div className="space-y-4">
              <ActivityTimeline 
                activities={recentActivities} 
                loading={loadingActivities} 
              />

              {recentActivities.length > 5 && (
                <div className="text-center pt-4">
                  <Link href="/submissions">
                    <GlassButton variant="outline">
                      Xem tất cả hoạt động
                    </GlassButton>
                  </Link>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Alerts & Notifications Panel */}
        <GlassCard className="p-6">
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
              {notificationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white/20 rounded-lg animate-pulse" />
                  ))}
                </div>
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
                        <div className={`p-2 rounded-lg ${
                          notification.Loai === 'KhanCap' 
                            ? 'bg-red-100/50' 
                            : 'bg-amber-100/50'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${
                            notification.Loai === 'KhanCap'
                              ? 'text-medical-red'
                              : 'text-medical-amber'
                          }`} />
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
                      <GlassButton variant="outline" size="sm">
                        Xem tất cả thông báo
                      </GlassButton>
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
              <CreditSummaryChart creditSummary={creditSummary} loading={cycleLoading} />
            )}
          </div>

          <div>
            {(expandedSections.analytics || isDesktop) && (
              <div className="lg:mt-12">
                <CreditHistoryTable 
                  creditHistory={creditHistory.slice(0, 5)} 
                  loading={cycleLoading} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
