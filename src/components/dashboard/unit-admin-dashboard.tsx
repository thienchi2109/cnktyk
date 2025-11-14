/**
 * Unit Administrator Dashboard Component
 * Comprehensive dashboard with glassmorphism design for unit administrators
 * Features: Unit overview, practitioner management, approval workflow, analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { useIsDesktop } from '@/hooks/use-media-query';
import { useDebounce } from '@/hooks/use-debounce';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PractitionerForm } from '@/components/practitioners/practitioner-form';
import {
  DashboardCardSkeleton,
  DashboardKpiSkeleton,
  DashboardListSkeleton,
  DashboardErrorCard,
  DashboardErrorPanel,
} from '@/components/dashboard/dashboard-skeletons';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  AlertTriangle,
  FileText,
  Building,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Plus,
  BarChart3,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface UnitAdminDashboardProps {
  userId: string;
  unitId: string;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
}

interface UnitMetrics {
  totalPractitioners: number;
  activePractitioners: number;
  complianceRate: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  atRiskPractitioners: number;
}

interface PractitionerSummary {
  id: string;
  name: string;
  licenseId: string;
  position: string;
  compliancePercent: number;
  status: 'DangLamViec' | 'DaNghi' | 'TamHoan';
  lastActivityDate?: string;
  creditsEarned: number;
  creditsRequired: number;
}

interface PendingApproval {
  id: string;
  practitionerId: string;
  practitionerName: string;
  activityTitle: string;
  activityType: string;
  credits: number;
  submittedDate: string;
  evidenceUrl?: string;
  daysWaiting: number;
}

export function UnitAdminDashboard({ userId, unitId, units = [] }: UnitAdminDashboardProps) {
  const isDesktop = useIsDesktop();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [metrics, setMetrics] = useState<UnitMetrics>({
    totalPractitioners: 0,
    activePractitioners: 0,
    complianceRate: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    atRiskPractitioners: 0
  });
  const [practitioners, setPractitioners] = useState<PractitionerSummary[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [practitionersLoading, setPractitionersLoading] = useState(true);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [practitionersError, setPractitionersError] = useState<string | null>(null);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search for 300ms
  const [filterStatus, setFilterStatus] = useState<'all' | 'at-risk' | 'compliant'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPractitioners, setTotalPractitioners] = useState(0);
  const itemsPerPage = 10;
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    practitioners: true,
    approvals: true,
    analytics: true
  });

  // Fetch unit metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);
        setMetricsError(null);
        const response = await fetch(`/api/units/${unitId}/metrics`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load unit metrics');
        }

        setMetrics(result.data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setMetricsError('Không thể tải số liệu tổng quan đơn vị. Vui lòng thử lại.');
        setMetrics({
          totalPractitioners: 0,
          activePractitioners: 0,
          complianceRate: 0,
          pendingApprovals: 0,
          approvedThisMonth: 0,
          rejectedThisMonth: 0,
          atRiskPractitioners: 0,
        });
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, [unitId]);

  // Fetch practitioners with pagination and filtering
  useEffect(() => {
    const fetchPractitioners = async () => {
      try {
        setPractitionersLoading(true);
        setPractitionersError(null);

        const params = new URLSearchParams({
          unitId,
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        if (debouncedSearchTerm.trim()) {
          params.append('search', debouncedSearchTerm.trim());
        }

        if (filterStatus === 'at-risk') {
          params.append('complianceStatus', 'at_risk');
        } else if (filterStatus === 'compliant') {
          params.append('complianceStatus', 'compliant');
        }

        const response = await fetch(`/api/practitioners?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load practitioners');
        }

        const list = Array.isArray(result.data) ? result.data : [];
        setPractitioners(list.map((p: any) => ({
          id: p.MaNhanVien,
          name: p.HoVaTen,
          licenseId: p.SoCCHN || 'N/A',
          position: p.ChucDanh || 'Không xác định',
          compliancePercent: p.complianceStatus?.compliancePercent || 0,
          status: p.TrangThaiLamViec,
          lastActivityDate: p.lastActivityDate,
          creditsEarned: p.complianceStatus?.creditsEarned || 0,
          creditsRequired: p.complianceStatus?.creditsRequired || 120,
        })));

        if (result.pagination) {
          setTotalPages(result.pagination.totalPages || 1);
          setTotalPractitioners(result.pagination.total || 0);
        } else {
          setTotalPages(1);
          setTotalPractitioners(list.length);
        }
      } catch (error) {
        console.error('Error fetching practitioners:', error);
        setPractitionersError('Không thể tải danh sách người hành nghề. Vui lòng thử lại.');
        setPractitioners([]);
        setTotalPages(1);
        setTotalPractitioners(0);
      } finally {
        setPractitionersLoading(false);
      }
    };

    fetchPractitioners();
  }, [unitId, refreshKey, currentPage, debouncedSearchTerm, filterStatus]);

  // Fetch pending approvals
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        setApprovalsLoading(true);
        setApprovalsError(null);
        const response = await fetch(`/api/submissions?unitId=${unitId}&status=ChoDuyet&limit=20`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load pending approvals');
        }

        if (result.data && Array.isArray(result.data)) {
          setPendingApprovals(result.data.map((item: any) => {
            const submittedDate = new Date(item.NgayGhiNhan);
            const daysWaiting = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
            
            return {
              id: item.MaGhiNhan,
              practitionerId: item.MaNhanVien,
              practitionerName: item.practitioner?.HoVaTen || 'N/A',
              activityTitle: item.TenHoatDong,
              activityType: item.activityCatalog?.LoaiHoatDong || 'Khác',
              credits: item.SoGioTinChiQuyDoi || 0,
              submittedDate: item.NgayGhiNhan,
              evidenceUrl: item.FileMinhChungUrl,
              daysWaiting
            };
          }));
        } else {
          setPendingApprovals([]);
        }
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
        setApprovalsError('Không thể tải danh sách hoạt động chờ duyệt. Vui lòng thử lại.');
        setPendingApprovals([]);
      } finally {
        setApprovalsLoading(false);
      }
    };

    fetchPendingApprovals();
  }, [unitId]);

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

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle filter change
  const handleFilterChange = (value: 'all' | 'at-risk' | 'compliant') => {
    setFilterStatus(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Unit Overview Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-medical-blue/10 backdrop-blur-sm">
                <Building className="w-8 h-8 text-medical-blue" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 page-title">
                  Bảng điều khiển đơn vị
                </h1>
                <p className="text-gray-600">Quản lý và giám sát người hành nghề</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton variant="outline" size="sm" className="hidden md:flex items-center gap-2">
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </GlassButton>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            aria-busy={metricsLoading || undefined}
          >
            {metricsLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
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
                      <Users className="w-5 h-5 text-medical-blue" />
                    </div>
                    <span className="text-sm text-gray-600">Tổng số</span>
                  </div>
                  <p className="text-3xl font-bold text-medical-blue">{metrics.totalPractitioners}</p>
                  <p className="text-xs text-gray-500 mt-1">Người hành nghề</p>
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

        {/* Approval Workflow Center */}
        <GlassCard className="p-6" aria-busy={approvalsLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100/50">
                <Clock className="w-5 h-5 text-medical-amber" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Trung tâm phê duyệt</h2>
              {!approvalsLoading && !approvalsError && pendingApprovals.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-medical-amber/20 text-medical-amber text-sm font-semibold">
                  {pendingApprovals.length} chờ xử lý
                </span>
              )}
            </div>
            <button
              onClick={() => toggleSection('approvals')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors lg:hidden"
            >
              {expandedSections.approvals ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

          {(expandedSections.approvals || isDesktop) && (
            <div className="space-y-3">
              {approvalsError ? (
                <DashboardErrorPanel message={approvalsError} />
              ) : approvalsLoading ? (
                <DashboardListSkeleton lines={4} />
              ) : pendingApprovals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-3 text-medical-green" />
                  <p className="text-lg font-semibold">Không có hoạt động chờ duyệt</p>
                  <p className="text-sm mt-1">Tất cả hoạt động đã được xử lý</p>
                </div>
              ) : (
                <>
                  {pendingApprovals.slice(0, 5).map((approval) => (
                    <div
                      key={approval.id}
                      className="p-4 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-800">{approval.activityTitle}</h4>
                            {approval.daysWaiting > 7 && (
                              <span className="px-2 py-0.5 rounded-full bg-red-100/50 text-red-700 text-xs font-medium">
                                {approval.daysWaiting} ngày
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {approval.practitionerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              {approval.activityType}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-medical-blue">
                              {approval.credits} tín chỉ
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(approval.submittedDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/submissions/${approval.id}`}>
                            <GlassButton size="sm" variant="outline">
                              Xem chi tiết
                            </GlassButton>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {pendingApprovals.length > 5 && (
                    <div className="text-center pt-4">
                      <Link href="/submissions?status=ChoDuyet">
                        <GlassButton variant="outline">
                          Xem tất cả ({pendingApprovals.length})
                        </GlassButton>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* Practitioner Management Grid */}
        <GlassCard className="p-6" aria-busy={practitionersLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100/50">
                <Users className="w-5 h-5 text-medical-blue" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Quản lý người hành nghề</h2>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <SheetTrigger asChild suppressHydrationWarning>
                  <Button className="hidden md:flex items-center gap-2 rounded-full shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="w-4 h-4" />
                    Thêm mới
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" side="right">
                  <SheetHeader>
                    <SheetTitle>Đăng ký người hành nghề mới</SheetTitle>
                    <SheetDescription>Thêm người hành nghề y tế mới vào hệ thống</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <PractitionerForm
                      unitId={unitId}
                      units={units}
                      userRole="DonVi"
                      onSuccess={() => { setShowCreateDialog(false); setRefreshKey((k) => k + 1); }}
                      onCancel={() => setShowCreateDialog(false)}
                      mode="create"
                      variant="sheet"
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <button
                onClick={() => toggleSection('practitioners')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors lg:hidden"
              >
                {expandedSections.practitioners ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {(expandedSections.practitioners || isDesktop) && (
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc số CCHN..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/30 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue/50"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative inline-block">
                    <select
                      value={filterStatus}
                      onChange={(e) => handleFilterChange(e.target.value as any)}
                      className="appearance-none px-4 py-2 pr-10 bg-white/30 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue/50 cursor-pointer hover:bg-white/40 transition-colors"
                    >
                      <option value="all">Tất cả</option>
                      <option value="at-risk">Rủi ro cao</option>
                      <option value="compliant">Đạt chuẩn</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Practitioners Table/Grid */}
              {practitionersError ? (
                <DashboardErrorPanel message={practitionersError} />
              ) : practitionersLoading ? (
                <DashboardListSkeleton lines={5} />
              ) : practitioners.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-semibold">Không tìm thấy người hành nghề</p>
                  <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {practitioners.map((practitioner) => (
                    <div
                      key={practitioner.id}
                      className="p-4 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-800">{practitioner.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getComplianceBgColor(practitioner.compliancePercent)}`}>
                              {practitioner.compliancePercent}%
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span>CCHN: {practitioner.licenseId}</span>
                            <span>•</span>
                            <span>{practitioner.position}</span>
                            <span>•</span>
                            <span className="font-semibold">
                              {practitioner.creditsEarned}/{practitioner.creditsRequired} tín chỉ
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/practitioners/${practitioner.id}`}>
                            <GlassButton size="sm" variant="outline">
                              Chi tiết
                            </GlassButton>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-white/20">
                      <div className="text-sm text-gray-600">
                        Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalPractitioners)} / {totalPractitioners}
                      </div>
                      <div className="flex gap-2">
                        <GlassButton
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Trước
                        </GlassButton>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Show first page, last page, current page, and adjacent pages
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === pageNum
                                    ? 'bg-medical-blue text-white'
                                    : 'bg-white/30 hover:bg-white/40 text-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <GlassButton
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sau
                        </GlassButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Unit Analytics */}
        <GlassCard className="p-6" aria-busy={metricsLoading || undefined}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100/50">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Phân tích đơn vị</h2>
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
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              aria-busy={metricsLoading || undefined}
            >
              {metricsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <DashboardCardSkeleton key={index} lines={2} />
                ))
              ) : metricsError ? (
                <DashboardErrorPanel
                  message={metricsError}
                  className="col-span-full"
                />
              ) : (
                <>
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-medical-green" />
                      <span className="text-sm font-semibold text-gray-700">Đã duyệt tháng này</span>
                    </div>
                    <p className="text-3xl font-bold text-medical-green">{metrics.approvedThisMonth}</p>
                    <p className="text-xs text-gray-500 mt-1">Hoạt động</p>
                  </div>

                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-5 h-5 text-medical-red" />
                      <span className="text-sm font-semibold text-gray-700">Từ chối tháng này</span>
                    </div>
                    <p className="text-3xl font-bold text-medical-red">{metrics.rejectedThisMonth}</p>
                    <p className="text-xs text-gray-500 mt-1">Hoạt động</p>
                  </div>

                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-medical-blue" />
                      <span className="text-sm font-semibold text-gray-700">Đang hoạt động</span>
                    </div>
                    <p className="text-3xl font-bold text-medical-blue">{metrics.activePractitioners}</p>
                    <p className="text-xs text-gray-500 mt-1">Người hành nghề</p>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>

    </div>
  );
}
