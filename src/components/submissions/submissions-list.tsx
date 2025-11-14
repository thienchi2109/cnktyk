'use client';

import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Filter,
  Search,
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
  Trash2,
  ExternalLink,
  FileSearch,
  DownloadCloud,
  EllipsisVertical
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/glass-select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { LoadingNotice } from '@/components/ui/loading-notice';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSubmissions, useBulkApproveSubmissions, useBulkDeleteSubmissions } from '@/hooks/use-submissions';
import { useDeleteSubmissionMutation } from '@/hooks/use-submission';
import { useEvidenceFile } from '@/hooks/use-evidence-file';

interface Submission {
  MaGhiNhan: string;
  TenHoatDong: string;
  NgayGhiNhan: string;
  TrangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  CreationMethod: 'individual' | 'bulk' | 'api_import' | 'migration' | 'system';
  NgayDuyet: string | null;
  NguoiDuyet: string | null;
  GhiChuDuyet: string | null;
  FileMinhChungUrl: string | null;
  // Migration 003 fields
  HinhThucCapNhatKienThucYKhoa: string | null;
  ChiTietVaiTro: string | null;
  DonViToChuc: string | null;
  NgayBatDau: string | null;
  NgayKetThuc: string | null;
  SoTiet: number | null;
  SoGioTinChiQuyDoi: number | null;
  BangChungSoGiayChungNhan: string | null;
  practitioner: {
    HoVaTen: string;
    SoCCHN: string | null;
    ChucDanh: string | null;
  };
  activityCatalog: {
    TenDanhMuc: string;
    LoaiHoatDong: string;
  } | null;
  unit: {
    TenDonVi: string;
  } | null;
  creatorAccount: {
    MaTaiKhoan: string;
    TenDangNhap: string;
    QuyenHan: string;
  } | null;
}

interface SubmissionsListProps {
  userRole: string;
  onCreateSubmission?: () => void;
  onViewSubmission?: (submissionId: string) => void;
  refreshKey?: number;
}

const statusLabels = {
  ChoDuyet: 'Chờ duyệt',
  DaDuyet: 'Đã duyệt',
  TuChoi: 'Từ chối',
};

const statusColors = {
  ChoDuyet: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DaDuyet: 'bg-green-100 text-green-800 border-green-200',
  TuChoi: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons = {
  ChoDuyet: Clock,
  DaDuyet: CheckCircle,
  TuChoi: XCircle,
};

const activityTypeLabels = {
  KhoaHoc: 'Khóa học',
  HoiThao: 'Hội thảo',
  NghienCuu: 'Nghiên cứu',
  BaoCao: 'Báo cáo',
};

export function SubmissionsList({ 
  userRole, 
  onCreateSubmission, 
  onViewSubmission,
  refreshKey,
}: SubmissionsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeEvidenceSubmissionId, setActiveEvidenceSubmissionId] = useState<string | null>(null);

  const reviewerRole = ['DonVi', 'SoYTe'].includes(userRole);
  const bulkApprove = useBulkApproveSubmissions();
  const bulkDelete = useBulkDeleteSubmissions();
  const deleteMutation = useDeleteSubmissionMutation();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const evidenceFile = useEvidenceFile();

  const { data, isLoading, error } = useSubmissions({
    page,
    limit: 10,
    status: statusFilter,
    search: searchTerm,
    refreshKey,
  });

  const totalPages = (data && data.pagination ? data.pagination.totalPages : 1);
  const total = (data && data.pagination ? data.pagination.total : 0);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    const activityName = searchParams.get('activityName');
    const resolved = activityName ?? '';
    if (resolved !== searchTerm) {
      setSearchTerm(resolved);
    }
  }, [searchParams, searchTerm]);

  // Clear selection when data changes or page/filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [page, statusFilter, searchTerm, data?.data]);

  const filteredSubmissions = ((data?.data as Submission[]) ?? []);

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('activityName', value);
    } else {
      params.delete('activityName');
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const handleViewSubmission = (submissionId: string) => {
    if (onViewSubmission) {
      onViewSubmission(submissionId);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const pageIds = filteredSubmissions
      .filter(s => s.TrangThaiDuyet === 'ChoDuyet')
      .map(s => s.MaGhiNhan);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter(id => !pageIds.includes(id)) : Array.from(new Set([...selectedIds, ...pageIds])));
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Phê duyệt ${selectedIds.length} hoạt động đã chọn?`)) return;
    try {
      const res = await bulkApprove.mutateAsync({ ids: selectedIds });
      setSelectedIds([]);
      setFeedback({ type: 'success', message: `Đã phê duyệt ${res.processedCount} hoạt động${res.skippedIds?.length ? `, bỏ qua ${res.skippedIds.length}` : ''}.` });
      // Refresh header badge and page data
      router.refresh();
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'Thao tác thất bại' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} hoạt động đã chọn?\n\nChỉ các hoạt động đang chờ duyệt sẽ được xóa. Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await bulkDelete.mutateAsync({ ids: selectedIds });
      setSelectedIds([]);
      const message = res.skipped > 0
        ? `Đã xóa ${res.deleted} hoạt động (bỏ qua ${res.skipped}${res.failed > 0 ? `, lỗi ${res.failed}` : ''}).`
        : `Đã xóa ${res.deleted} hoạt động.`;
      setFeedback({ type: 'success', message });
      // Refresh header badge and page data
      router.refresh();
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'Thao tác thất bại' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const canDelete = (submission: Submission) => {
    return reviewerRole && submission.TrangThaiDuyet === 'ChoDuyet';
  };

  const handleIndividualDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteConfirmId });
      setDeleteConfirmId(null);
      setFeedback({ type: 'success', message: 'Đã xóa hoạt động thành công' });
      router.refresh();
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'Không thể xóa hoạt động' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const getSubmissionFileName = (url: string): string => {
    try {
      const sanitized = url.split('?')[0] || '';
      const segments = sanitized.split('/');
      return decodeURIComponent(segments.pop() || 'evidence');
    } catch {
      return 'evidence';
    }
  };

  const handleViewEvidence = async (
    event: MouseEvent<HTMLButtonElement>,
    submission: Submission
  ) => {
    event.stopPropagation();
    if (!submission.FileMinhChungUrl) return;

    setActiveEvidenceSubmissionId(submission.MaGhiNhan);
    try {
      await evidenceFile.viewFile(submission.FileMinhChungUrl);
    } finally {
      setActiveEvidenceSubmissionId(null);
    }
  };

  const handleDownloadEvidence = async (
    event: MouseEvent<HTMLButtonElement>,
    submission: Submission
  ) => {
    event.stopPropagation();
    if (!submission.FileMinhChungUrl) return;

    setActiveEvidenceSubmissionId(submission.MaGhiNhan);
    try {
      await evidenceFile.downloadFile(
        submission.FileMinhChungUrl,
        getSubmissionFileName(submission.FileMinhChungUrl)
      );
    } finally {
      setActiveEvidenceSubmissionId(null);
    }
  };

  const getStatusBadge = (status: Submission['TrangThaiDuyet']) => {
    const Icon = statusIcons[status];
    return (
      <Badge className={`${statusColors[status]} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {statusLabels[status]}
      </Badge>
    );
  };

  const canCreateSubmission = () => {
    return ['NguoiHanhNghe', 'DonVi'].includes(userRole);
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          {error instanceof Error ? error.message : 'Có lỗi xảy ra'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-medical-blue/10">
              <FileText className="h-6 w-6 text-medical-blue" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 page-title">
              {userRole === 'NguoiHanhNghe' ? 'Hoạt động của tôi' : 'Quản lý hoạt động'}
            </h1>
          </div>
          <p className="text-gray-600">
            {userRole === 'NguoiHanhNghe' 
              ? `Theo dõi các hoạt động đào tạo liên tục • ${total} bản ghi`
              : `Xem xét và phê duyệt các hoạt động đào tạo liên tục • ${total} bản ghi`}
          </p>
        </div>
        
        {reviewerRole || canCreateSubmission() ? (
        <div className="flex gap-3">
          {reviewerRole && (
            <>
              <Link href="/submissions/bulk">
                <GlassButton
                  variant="secondary"
                  className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-shadow px-6"
                  size="lg"
                >
                  <Users className="h-5 w-5" />
                  Gán hoạt động cho nhóm
                </GlassButton>
              </Link>
              {/* Bulk approve button - only visible when items are selected */}
              {selectedIds.length > 0 && (
                <>
                  <GlassButton
                    onClick={handleBulkApprove}
                    disabled={bulkApprove.isPending}
                    variant="success"
                    className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-shadow px-6"
                    size="lg"
                  >
                    {bulkApprove.isPending ? (
                      <>
                        <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Phê duyệt hàng loạt ({selectedIds.length})
                      </>
                    )}
                  </GlassButton>
                  <GlassButton
                    onClick={handleBulkDelete}
                    disabled={bulkDelete.isPending}
                    className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-shadow px-6 bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    {bulkDelete.isPending ? (
                      <>
                        <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-5 w-5" />
                        Xóa hàng loạt ({selectedIds.length})
                      </>
                    )}
                  </GlassButton>
                </>
              )}
            </>
          )}
          {canCreateSubmission() && onCreateSubmission && (
            <GlassButton
              onClick={onCreateSubmission}
              className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-shadow px-6"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Ghi nhận hoạt động
            </GlassButton>
          )}
        </div>
      ) : null}
      </div>

      {feedback && (
        <Alert className={feedback.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {feedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-medical-blue" />
          <h3 className="font-semibold text-gray-900">Bộ Lọc & Tìm Kiếm</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Nhập tên hoạt động, người hành nghề..."
                value={searchTerm}
                onChange={(e) => handleSearchTermChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Trạng thái</Label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="ChoDuyet">Chờ duyệt</option>
              <option value="DaDuyet">Đã duyệt</option>
              <option value="TuChoi">Từ chối</option>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Submissions Table */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingNotice message="Đang tải danh sách hoạt động..." />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 rounded-full bg-gray-100/50 w-fit mx-auto mb-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy hoạt động</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Thử điều chỉnh bộ lọc hoặc thêm hoạt động mới'
                : 'Chưa có hoạt động nào được ghi nhận'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-200/50">
                  <tr>
                    {reviewerRole && (
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label="Chọn tất cả"
                          checked={filteredSubmissions.filter(s=>s.TrangThaiDuyet==='ChoDuyet').every(s=>selectedIds.includes(s.MaGhiNhan)) && filteredSubmissions.some(s=>s.TrangThaiDuyet==='ChoDuyet')}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">Hoạt động</th>
                    {userRole !== 'NguoiHanhNghe' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[220px] max-w-[220px]">Người hành nghề</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tín chỉ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày gửi</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
{filteredSubmissions.map((submission) => {
                    const isActiveEvidenceRow = activeEvidenceSubmissionId === submission.MaGhiNhan;
                    const isViewingEvidence = isActiveEvidenceRow && evidenceFile.activeAction === 'view';
                    const isDownloadingEvidence = isActiveEvidenceRow && evidenceFile.activeAction === 'download';

                    return (
                    <tr
                      key={submission.MaGhiNhan}
                      className="hover:bg-gray-50/30 transition-colors cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết hoạt động ${submission.TenHoatDong}`}
                      onClick={() => handleViewSubmission(submission.MaGhiNhan)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleViewSubmission(submission.MaGhiNhan); }}
                    >
                      {reviewerRole && (
                        <td className="px-3 py-4">
                          {submission.TrangThaiDuyet === 'ChoDuyet' ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(submission.MaGhiNhan)}
                              onChange={() => toggleSelect(submission.MaGhiNhan)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Chọn hoạt động"
                            />
                          ) : null}
                        </td>
                      )}
                      <td className="px-6 py-4 min-w-[250px]">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {submission.TenHoatDong}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                            {submission.HinhThucCapNhatKienThucYKhoa && (
                              <span>Hình thức: {submission.HinhThucCapNhatKienThucYKhoa}</span>
                            )}
                            {submission.ChiTietVaiTro && (
                              <span>• Vai trò: {submission.ChiTietVaiTro}</span>
                            )}
                            {submission.activityCatalog && (
                              <Badge variant="outline" className="text-xs">
                                {activityTypeLabels[submission.activityCatalog.LoaiHoatDong as keyof typeof activityTypeLabels]}
                              </Badge>
                            )}
                          </div>
                          {submission.CreationMethod === 'bulk' && (
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-medical-blue" aria-label={`Được tạo hàng loạt bởi ${submission.creatorAccount?.TenDangNhap ?? 'quản trị viên'}`}>
                              <Badge
                                variant="outline"
                                className="border-medical-blue/40 bg-medical-blue/10 text-medical-blue flex items-center gap-1"
                              >
                                <Users className="h-3 w-3" aria-hidden="true" />
                                Tạo hàng loạt
                              </Badge>
                              <span className="text-gray-500">
                                Bởi {submission.creatorAccount?.TenDangNhap ?? 'quản trị viên'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {userRole !== 'NguoiHanhNghe' && (
                        <td className="px-6 py-4 max-w-[220px]">
                          <div className="space-y-1">
                            <div
                              className="font-medium text-gray-900 truncate"
                              title={submission.practitioner.HoVaTen}
                            >
                              {submission.practitioner.HoVaTen}
                            </div>
                            {submission.practitioner.ChucDanh && (
                              <div
                                className="text-sm text-gray-500 truncate"
                                title={submission.practitioner.ChucDanh}
                              >
                                {submission.practitioner.ChucDanh}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {submission.SoTiet && (
                            <div>{submission.SoTiet} tiết</div>
                          )}
                          {submission.NgayBatDau && (
                            <div className="text-gray-500">
                              {formatDate(submission.NgayBatDau)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-medical-blue">
                          {submission.SoGioTinChiQuyDoi || 0} tín chỉ
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(submission.TrangThaiDuyet)}
                        {submission.TrangThaiDuyet === 'TuChoi' && submission.GhiChuDuyet && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                            {submission.GhiChuDuyet}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(submission.NgayGhiNhan)}
                        </div>
                        {submission.NgayDuyet && (
                          <div className="text-xs text-gray-400">
                            Duyệt: {formatDate(submission.NgayDuyet)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <GlassButton
                              size="sm"
                              variant="secondary"
                              aria-label="Thao tác"
                              title="Thao tác"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EllipsisVertical className="h-4 w-4" />
                            </GlassButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSubmission(submission.MaGhiNhan);
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Xem chi tiết
                            </DropdownMenuItem>

                            {submission.FileMinhChungUrl && (
                              <>
                                <DropdownMenuItem
                                  onClick={(event) => handleViewEvidence(event, submission)}
                                  disabled={evidenceFile.isLoading && isActiveEvidenceRow}
                                >
                                  {isViewingEvidence ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <FileSearch className="h-4 w-4 mr-2" />
                                  )}
                                  Xem minh chứng
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(event) => handleDownloadEvidence(event, submission)}
                                  disabled={evidenceFile.isLoading && isActiveEvidenceRow}
                                >
                                  {isDownloadingEvidence ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <DownloadCloud className="h-4 w-4 mr-2" />
                                  )}
                                  Tải xuống minh chứng
                                </DropdownMenuItem>
                              </>
                            )}

                            {canDelete(submission) && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(submission.MaGhiNhan);
                                }}
                                destructive
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>

                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200/50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Trang {page} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* Individual Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hoạt động</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-700 mb-2">
              Bạn có chắc chắn muốn xóa hoạt động này?
            </p>
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Hành động này không thể hoàn tác.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleIndividualDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang xóa...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Xác nhận xóa</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
