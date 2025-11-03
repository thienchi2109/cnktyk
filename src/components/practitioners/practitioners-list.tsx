'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePractitioners, practitionersQueryKey, fetchPractitionersApi } from '@/hooks/use-practitioners';
import { Search, Filter, Plus, Eye, Edit, Trash2, AlertTriangle, CheckCircle, Clock, Upload, UserCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/glass-select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PractitionerForm } from './practitioner-form';
import { PractitionerDetailSheet } from './practitioner-detail-sheet';
import { BulkImportSheet } from './bulk-import-sheet';

interface ComplianceStatus {
  totalCredits: number;
  requiredCredits: number;
  compliancePercentage: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

interface Practitioner {
  MaNhanVien: string;
  MaNhanVienNoiBo?: string | null;
  HoVaTen: string;
  SoCCHN?: string;
  NgayCapCCHN?: string;
  MaDonVi: string;
  TrangThaiLamViec: 'DangLamViec' | 'DaNghi' | 'TamHoan';
  Email?: string;
  DienThoai?: string;
  ChucDanh?: string;
  complianceStatus: ComplianceStatus;
}

interface Unit {
  MaDonVi: string;
  TenDonVi: string;
}

interface PractitionersListProps {
  userRole: string;
  userUnitId?: string;
  units?: Unit[];
}

export function PractitionersList({ userRole, userUnitId, units = [] }: PractitionersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showBulkImportSheet, setShowBulkImportSheet] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = usePractitioners({
    page,
    limit: pageSize,
    searchTerm,
    statusFilter,
    unitFilter,
    complianceFilter,
  });

  const practitioners: Practitioner[] = data?.data || [];
  const totalPages: number = data?.pagination?.totalPages || 1;
  const totalItems: number = data?.pagination?.total || 0;

  // Calculate summary text similar to DoH dashboard
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const startRow = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endRow = totalItems === 0 ? 0 : Math.min(startRow + practitioners.length - 1, Math.max(totalItems, 0));

  const summaryText =
    totalItems === 0
      ? 'Không có người hành nghề nào phù hợp với bộ lọc hiện tại.'
      : `Hiển thị ${startRow} - ${endRow} trên tổng ${totalItems} người hành nghề.`;

  // Prefetch next page for smoother navigation
  useEffect(() => {
    if (page < totalPages) {
      const nextOpts = {
        page: page + 1,
        limit: pageSize,
        searchTerm,
        statusFilter,
        unitFilter,
        complianceFilter,
      };
      queryClient.prefetchQuery({
        queryKey: practitionersQueryKey(nextOpts),
        queryFn: () => fetchPractitionersApi(nextOpts),
      });
    }
  }, [page, totalPages, searchTerm, statusFilter, unitFilter, complianceFilter, queryClient]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleUnitFilter = (value: string) => {
    setUnitFilter(value);
    setPage(1);
  };

  const handleComplianceFilter = (value: string) => {
    setComplianceFilter(value);
    setPage(1); // Reset to first page when filter changes
  };

  const handlePageSizeChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    setPageSize(parsed);
    setPage(1); // Reset to first page when page size changes
  };

  const handlePageChange = (next: number) => {
    if (totalPages > 0 && (next < 1 || next > totalPages)) {
      return;
    }
    if (next < 1) {
      return;
    }
    setPage(next);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DangLamViec':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đang làm việc</Badge>;
      case 'TamHoan':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Tạm hoãn</Badge>;
      case 'DaNghi':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Đã nghỉ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getComplianceBadge = (complianceStatus: ComplianceStatus) => {
    const { compliancePercentage, status } = complianceStatus;
    
    switch (status) {
      case 'compliant':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {compliancePercentage.toFixed(0)}%
          </Badge>
        );
      case 'at_risk':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            {compliancePercentage.toFixed(0)}%
          </Badge>
        );
      case 'non_compliant':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {compliancePercentage.toFixed(0)}%
          </Badge>
        );
      default:
        return <Badge variant="outline">{compliancePercentage.toFixed(0)}%</Badge>;
    }
  };

  // Phase 1: No client-side filtering needed - all filtering done on server
  const filteredPractitioners = practitioners;

  const canCreatePractitioner = ['SoYTe', 'DonVi'].includes(userRole);
  const canEditPractitioner = ['SoYTe', 'DonVi'].includes(userRole);

  if (isLoading && practitioners.length === 0) {
    return (
      <div className="space-y-6">
      <GlassCard className="p-12">
          <LoadingNotice message="Đang tải danh sách người hành nghề..." />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-medical-blue/10">
              <UserCircle className="h-6 w-6 text-medical-blue" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Người Hành Nghề</h1>
          </div>
          <p className="text-gray-600">
            Quản lý người hành nghề y tế và trạng thái tuân thủ • {filteredPractitioners.length} người
          </p>
        </div>
        
        {canCreatePractitioner && (
          <div className="flex gap-3">
            {/* Bulk Import Button - DonVi only */}
            {userRole === 'DonVi' && (
              <GlassButton
                onClick={() => setShowBulkImportSheet(true)}
                variant="secondary"
                className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-shadow px-6"
                size="lg"
              >
                <Upload className="h-5 w-5" />
                Nhập Hàng Loạt
              </GlassButton>
            )}
            
            {/* Add Single Practitioner */}
            <GlassButton
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-shadow px-6"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Thêm Người Hành Nghề
            </GlassButton>
          </div>
        )}
      </div>

      {/* Create Sheet */}
      <Sheet open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>Đăng ký người hành nghề mới</SheetTitle>
            <SheetDescription>
              Thêm người hành nghề y tế mới vào hệ thống
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <PractitionerForm
              unitId={userRole === 'DonVi' ? userUnitId : undefined}
              units={userRole === 'SoYTe' ? units : units.filter(u => u.MaDonVi === userUnitId)}
              userRole={userRole}
              onSuccess={() => {
                setShowCreateDialog(false);
                queryClient.invalidateQueries({ queryKey: ['practitioners'] });
              }}
              onCancel={() => setShowCreateDialog(false)}
              mode="create"
              variant="sheet"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Filters */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-medical-blue" />
          <h3 className="font-semibold text-gray-900">Bộ Lọc & Tìm Kiếm</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Nhập tên người hành nghề..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Trạng thái làm việc</Label>
            <div className="mt-1">
              <Select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="DangLamViec">Đang làm việc</option>
                <option value="TamHoan">Tạm hoãn</option>
                <option value="DaNghi">Đã nghỉ</option>
              </Select>
            </div>
          </div>

          {userRole === 'SoYTe' && units.length > 0 && (
            <div>
              <Label htmlFor="unit-filter" className="text-sm font-medium text-gray-700">Đơn vị</Label>
              <div className="mt-1">
                <Select
                  value={unitFilter}
                  onChange={(e) => handleUnitFilter(e.target.value)}
                >
                  <option value="all">Tất cả đơn vị</option>
                  {units.map((unit) => (
                    <option key={unit.MaDonVi} value={unit.MaDonVi}>
                      {unit.TenDonVi}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="compliance-filter" className="text-sm font-medium text-gray-700">Tuân thủ</Label>
            <div className="mt-1">
              <Select
                value={complianceFilter}
                onChange={(e) => handleComplianceFilter(e.target.value)}
              >
                <option value="all">Tất cả mức độ</option>
                <option value="compliant">Đạt chuẩn (≥90%)</option>
                <option value="at_risk">Rủi ro (70-89%)</option>
                <option value="non_compliant">Chưa đạt (&lt;70%)</option>
              </Select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Error Alert */}
      {isError && (
        <Alert className="mb-6 border-medical-red/20 bg-medical-red/5">
          <AlertTriangle className="h-4 w-4 text-medical-red" />
          <AlertDescription className="text-medical-red">
            {(error as Error)?.message || 'Đã xảy ra lỗi khi tải dữ liệu'}
          </AlertDescription>
        </Alert>
      )}

      {/* Practitioners Table */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-medical-blue mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Đang tải danh sách người hành nghề...</p>
          </div>
        ) : filteredPractitioners.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="p-4 rounded-full bg-gray-100/50 w-fit mx-auto mb-4">
              <UserCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Không tìm thấy người hành nghề</h3>
            <p className="text-gray-500">Điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem dữ liệu khác.</p>
            <GlassButton variant="outline" onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setUnitFilter('all');
              setComplianceFilter('all');
              setPage(1);
            }}>
              Đặt lại bộ lọc
            </GlassButton>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200/90 backdrop-blur-md sticky top-0 z-10 border-b-2 border-gray-300/50 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Họ và Tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Chức Danh
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Số CCHN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Trạng Thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Tuân Thủ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Tín Chỉ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Liên Hệ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao Tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {filteredPractitioners.map((practitioner) => (
                    <tr
                      key={practitioner.MaNhanVien}
                      className="hover:bg-gray-50/30 transition-colors cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết ${practitioner.HoVaTen}`}
                      onClick={() => {
                        setSelectedPractitionerId(practitioner.MaNhanVien);
                        setShowDetailSheet(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSelectedPractitionerId(practitioner.MaNhanVien);
                          setShowDetailSheet(true);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {practitioner.HoVaTen}
                        </div>
                        {practitioner.MaNhanVienNoiBo && (
                          <div className="text-sm text-gray-500">Mã NV nội bộ: {practitioner.MaNhanVienNoiBo}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {practitioner.ChucDanh || 'Chưa xác định'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {practitioner.SoCCHN || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(practitioner.TrangThaiLamViec)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getComplianceBadge(practitioner.complianceStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {practitioner.complianceStatus.totalCredits} / {practitioner.complianceStatus.requiredCredits}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {practitioner.Email && (
                            <div className="text-gray-900">{practitioner.Email}</div>
                          )}
                          {practitioner.DienThoai && (
                            <div className="text-gray-500">{practitioner.DienThoai}</div>
                          )}
                          {!practitioner.Email && !practitioner.DienThoai && (
                            <span className="text-gray-400">Không có</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <GlassButton
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPractitionerId(practitioner.MaNhanVien);
                              setShowDetailSheet(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </GlassButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200/50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600" aria-live="polite">
                {summaryText}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Hiển thị</span>
                  <select
                    value={pageSize}
                    onChange={(event) => handlePageSizeChange(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white/70 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/50"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}/trang
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2">
                  <GlassButton
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || totalPages === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </GlassButton>
                  <span className="text-sm text-gray-600">
                    Trang {totalPages === 0 ? 0 : page} / {totalPages}
                  </span>
                  <GlassButton
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={totalPages === 0 || page >= totalPages}
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>
            </div>
          </>
        )}
      </GlassCard>

      {/* Practitioner Detail Sheet */}
      <PractitionerDetailSheet
        practitionerId={selectedPractitionerId}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        canEdit={canEditPractitioner}
        units={units}
        userRole={userRole}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['practitioners'] })}
      />

      {/* Bulk Import Sheet */}
      <BulkImportSheet
        open={showBulkImportSheet}
        onOpenChange={setShowBulkImportSheet}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['practitioners'] })}
      />
    </div>
  );
}
