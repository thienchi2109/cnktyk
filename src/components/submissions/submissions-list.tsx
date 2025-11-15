'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  EllipsisVertical,
  ChevronDown,
  User,
  FolderPlus
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { LoadingNotice } from '@/components/ui/loading-notice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubmissions, useBulkApproveSubmissions, useBulkDeleteSubmissions } from '@/hooks/use-submissions';
import { useDebounce } from '@/hooks/use-debounce';
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

const PAGE_SIZE = 10;

export function SubmissionsList({ 
  userRole, 
  onCreateSubmission, 
  onViewSubmission,
  refreshKey,
}: SubmissionsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
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
  const [unitOptions, setUnitOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [unitOptionsLoading, setUnitOptionsLoading] = useState(false);
  const [unitOptionsError, setUnitOptionsError] = useState<string | null>(null);
  const [unitSearchInput, setUnitSearchInput] = useState('');

  const debouncedSearchInput = useDebounce(searchInput, 400);
  const effectiveUnitFilter = userRole === 'SoYTe' && unitFilter !== 'all' ? unitFilter : undefined;

  const { data, isLoading, error } = useSubmissions({
    page,
    limit: PAGE_SIZE,
    status: statusFilter,
    search: searchTerm,
    refreshKey,
    unitId: effectiveUnitFilter,
  });

  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm, effectiveUnitFilter]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const activityName = params.get('activityName') ?? '';
    setSearchTerm((prev) => (prev === activityName ? prev : activityName));
    setSearchInput((prev) => (prev === activityName ? prev : activityName));
    if (userRole === 'SoYTe') {
      const paramUnitId = params.get('unitId') ?? 'all';
      setUnitFilter((prev) => (prev === paramUnitId ? prev : paramUnitId));
    }
  }, [searchParamsString, userRole]);

  useEffect(() => {
    if (userRole !== 'SoYTe') return;
    let cancelled = false;
    setUnitOptionsLoading(true);
    setUnitOptionsError(null);

    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/units');
        if (!response.ok) {
          throw new Error('Không thể tải danh sách đơn vị');
        }
        const payload = await response.json();
        if (cancelled) return;
        const units = Array.isArray(payload?.units)
          ? payload.units.map((unit: any) => ({
              id: unit.MaDonVi,
              name: unit.TenDonVi,
            }))
          : [];
        setUnitOptions(units);
      } catch (unitError) {
        console.error('Failed to load units for submissions filter:', unitError);
        if (!cancelled) {
          setUnitOptionsError(
            unitError instanceof Error ? unitError.message : 'Không thể tải danh sách đơn vị',
          );
        }
      } finally {
        if (!cancelled) {
          setUnitOptionsLoading(false);
        }
      }
    };

    void fetchUnits();

    return () => {
      cancelled = true;
    };
  }, [userRole]);

  const syncSearchQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParamsString);
      if (value) {
        params.set('activityName', value);
      } else {
        params.delete('activityName');
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    if (debouncedSearchInput === searchTerm) {
      return;
    }
    setSearchTerm(debouncedSearchInput);
    syncSearchQuery(debouncedSearchInput);
  }, [debouncedSearchInput, searchTerm, syncSearchQuery]);

  // Clear selection when data changes or page/filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [page, statusFilter, searchTerm, effectiveUnitFilter, data?.data]);

  const filteredSubmissions = ((data?.data as Submission[]) ?? []);
  const safePage = Math.max(1, page);
  const safeTotal = Math.max(total, 0);
  const startRow = safeTotal === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endRow = safeTotal === 0 ? 0 : Math.min(startRow + filteredSubmissions.length - 1, safeTotal);
  const summaryText = safeTotal === 0
    ? 'Không có hoạt động phù hợp với bộ lọc hiện tại.'
    : `Hiển thị ${startRow.toLocaleString('vi-VN')} - ${endRow.toLocaleString('vi-VN')} trên tổng ${safeTotal.toLocaleString('vi-VN')} hoạt động.`;
  const pendingIdsOnPage = reviewerRole
    ? filteredSubmissions.filter((s) => s.TrangThaiDuyet === 'ChoDuyet').map((s) => s.MaGhiNhan)
    : [];
  const allPendingSelected = pendingIdsOnPage.length > 0 && pendingIdsOnPage.every((id) => selectedIds.includes(id));

  const handleSearchTermChange = (value: string) => {
    setSearchInput(value);
  };

  const handleUnitFilterChange = (value: string) => {
    setUnitFilter(value);
    const params = new URLSearchParams(searchParamsString);
    if (value === 'all') {
      params.delete('unitId');
    } else {
      params.set('unitId', value);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const filterGridCols = userRole === 'SoYTe' ? 'md:grid-cols-3' : 'md:grid-cols-2';
  const debouncedUnitSearch = useDebounce(unitSearchInput, 250);

  const filteredUnitOptions = useMemo(() => {
    if (!debouncedUnitSearch.trim()) return unitOptions;
    const term = debouncedUnitSearch.trim().toLowerCase();
    return unitOptions.filter((unit) => unit.name.toLowerCase().includes(term));
  }, [unitOptions, debouncedUnitSearch]);

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
    event: MouseEvent<HTMLElement>,
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
    event: MouseEvent<HTMLElement>,
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
              {/* Bulk approve button - only visible when items are selected */}
              {selectedIds.length > 0 && (
                <>
                  <Button
                    onClick={handleBulkApprove}
                    disabled={bulkApprove.isPending}
                    variant="medical"
                    className="gap-2"
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
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    disabled={bulkDelete.isPending}
                    variant="destructive"
                    className="gap-2"
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
                  </Button>
                </>
              )}

              {/* Add to catalog button */}
              <Button
                asChild
                variant="outline-accent"
                className="gap-2"
                size="lg"
              >
                <Link href="/activities?action=create">
                  <FolderPlus className="h-5 w-5" />
                  Thêm hoạt động mới vào danh mục
                </Link>
              </Button>

              {/* Dropdown menu for submission actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="medical" className="gap-2" size="lg">
                    <Plus className="h-5 w-5" />
                    Ghi nhận hoạt động
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={onCreateSubmission} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Ghi nhận cho cá nhân</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/submissions/bulk">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Ghi nhận cho hàng loạt</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {!reviewerRole && canCreateSubmission() && onCreateSubmission && (
            <>
              {/* Add to catalog button for non-reviewers */}
              <Button
                asChild
                variant="outline-accent"
                className="gap-2"
                size="lg"
              >
                <Link href="/activities?action=create">
                  <FolderPlus className="h-5 w-5" />
                  Thêm hoạt động mới vào danh mục
                </Link>
              </Button>

              {/* Simple button for non-reviewers */}
              <Button
                onClick={onCreateSubmission}
                variant="medical"
                className="gap-2"
                size="lg"
              >
                <Plus className="h-5 w-5" />
                Ghi nhận hoạt động
              </Button>
            </>
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
        <div className={cn('grid grid-cols-1 gap-4', filterGridCols)}>
          {/* Search */}
          <div>
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Nhập tên hoạt động, người hành nghề..."
                value={searchInput}
                onChange={(e) => handleSearchTermChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
              Trạng thái
            </Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger
                id="status-filter"
                className="mt-1 w-full border border-gray-200 bg-white text-gray-900 focus:ring-medical-blue/30"
              >
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
                <SelectContent className="bg-white text-gray-900 border border-gray-200 shadow-xl [&_[data-radix-select-viewport]]:bg-white">
                <SelectItem
                  value="all"
                  className="whitespace-normal break-words text-left leading-snug text-gray-900 data-[highlighted]:bg-medical-blue/10 data-[state=checked]:text-medical-blue h-auto py-2"
                >
                  Tất cả trạng thái
                </SelectItem>
                <SelectItem
                  value="ChoDuyet"
                  className="whitespace-normal break-words text-left leading-snug text-gray-900 data-[highlighted]:bg-medical-blue/10 data-[state=checked]:text-medical-blue h-auto py-2"
                >
                  Chờ duyệt
                </SelectItem>
                <SelectItem
                  value="DaDuyet"
                  className="whitespace-normal break-words text-left leading-snug text-gray-900 data-[highlighted]:bg-medical-blue/10 data-[state=checked]:text-medical-blue h-auto py-2"
                >
                  Đã duyệt
                </SelectItem>
                <SelectItem
                  value="TuChoi"
                  className="whitespace-normal break-words text-left leading-snug text-gray-900 data-[highlighted]:bg-medical-blue/10 data-[state=checked]:text-medical-blue h-auto py-2"
                >
                  Từ chối
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userRole === 'SoYTe' && (
            <div>
              <Label htmlFor="unit-filter" className="text-sm font-medium text-gray-700">
                Đơn vị
              </Label>
              <Select
                value={unitFilter}
                onValueChange={handleUnitFilterChange}
                disabled={unitOptionsLoading}
              >
                <SelectTrigger
                  className="mt-1 w-full border border-gray-200 bg-white text-gray-900 focus:ring-medical-blue/30"
                >
                  <SelectValue placeholder="Tất cả đơn vị" />
                </SelectTrigger>
                <SelectContent className="w-[420px] bg-white text-gray-900 border border-gray-200 shadow-xl [&_[data-radix-select-viewport]]:bg-white">
                  <div className="p-2 border-b border-gray-100 bg-white">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Tìm kiếm đơn vị..."
                        value={unitSearchInput}
                        onChange={(event) => setUnitSearchInput(event.target.value)}
                        className="pl-9 pr-3 h-9 bg-white text-gray-900 border border-gray-200 focus:ring-medical-blue/30"
                        autoFocus
                        onKeyDown={(event) => event.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto bg-white">
                    <SelectItem
                      value="all"
                      className="whitespace-normal break-words text-left leading-snug text-gray-900 data-[highlighted]:bg-medical-blue/10 data-[state=checked]:text-medical-blue h-auto py-2"
                    >
                      Tất cả đơn vị
                    </SelectItem>
                    {filteredUnitOptions.map((unit) => (
                      <SelectItem
                        key={unit.id}
                        value={unit.id}
                        className="whitespace-normal break-words text-left leading-snug text-gray-900 data-[highlighted]:bg-medical-blue/10 data-[state=checked]:text-medical-blue h-auto py-2"
                      >
                        {unit.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              {unitOptionsError && (
                <p className="text-xs text-red-600 mt-1">{unitOptionsError}</p>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Submissions Table */}
      <TooltipProvider delayDuration={150}>
        <GlassCard className="p-0 border border-white/25 shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12">
              <LoadingNotice message="Đang tải danh sách hoạt động..." />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-gray-100/60 w-fit mx-auto">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Không tìm thấy hoạt động</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Thử điều chỉnh bộ lọc hoặc thêm hoạt động mới'
                  : 'Chưa có hoạt động nào được ghi nhận'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table role="grid" className="min-w-full text-sm text-gray-700">
                  <TableHeader className="bg-slate-50/95 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wide text-slate-600 [&_tr]:sticky [&_tr]:top-0 [&_tr]:z-10">
                    <TableRow className="border-b border-slate-200/70">
                      {reviewerRole && (
                        <TableHead className="w-12 text-center">
                          <input
                            type="checkbox"
                            aria-label="Chọn tất cả hoạt động chờ duyệt"
                            checked={allPendingSelected}
                            onChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="text-left min-w-[280px]">Hoạt động</TableHead>
                      {userRole !== 'NguoiHanhNghe' && (
                        <TableHead className="text-left w-[220px]">Người hành nghề</TableHead>
                      )}
                      <TableHead className="text-left w-[140px]">Thời gian</TableHead>
                      <TableHead className="text-left w-[120px]">Tín chỉ</TableHead>
                      <TableHead className="text-left w-[160px]">Trạng thái</TableHead>
                      <TableHead className="text-left w-[160px]">Ngày gửi</TableHead>
                      <TableHead className="text-right w-[160px]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission, index) => {
                      const isActiveEvidenceRow = activeEvidenceSubmissionId === submission.MaGhiNhan;
                      const isViewingEvidence = isActiveEvidenceRow && evidenceFile.activeAction === 'view';
                      const isDownloadingEvidence = isActiveEvidenceRow && evidenceFile.activeAction === 'download';
                      const isSelectable = submission.TrangThaiDuyet === 'ChoDuyet';
                      const isSelected = selectedIds.includes(submission.MaGhiNhan);

                      return (
                        <TableRow
                          key={submission.MaGhiNhan}
                          className={cn(
                            'cursor-pointer border-b border-slate-100/70 bg-white/40 transition-colors hover:bg-medical-blue/5 focus-within:bg-medical-blue/10',
                            index % 2 === 1 && 'bg-white/25'
                          )}
                          tabIndex={0}
                          role="button"
                          aria-label={`Xem chi tiết hoạt động ${submission.TenHoatDong}`}
                          onClick={() => handleViewSubmission(submission.MaGhiNhan)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleViewSubmission(submission.MaGhiNhan);
                            }
                          }}
                        >
                          {reviewerRole && (
                            <TableCell className="text-center align-middle">
                              {isSelectable ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(submission.MaGhiNhan)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Chọn hoạt động"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </TableCell>
                          )}

                          <TableCell className="align-middle min-w-[280px] max-w-[420px]">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-start gap-2">
                                <p
                                  className="font-semibold text-gray-900 leading-tight break-words whitespace-normal"
                                  title={submission.TenHoatDong}
                                >
                                  {submission.TenHoatDong}
                                </p>
                                {submission.activityCatalog && (
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {activityTypeLabels[submission.activityCatalog.LoaiHoatDong as keyof typeof activityTypeLabels]}
                                  </Badge>
                                )}
                                {submission.CreationMethod === 'bulk' && (
                                  <Badge
                                    variant="outline"
                                    className="border-medical-blue/40 bg-medical-blue/10 text-medical-blue flex items-center gap-1 text-[11px]"
                                  >
                                    <Users className="h-3 w-3" aria-hidden="true" />
                                    Tạo hàng loạt
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                {submission.HinhThucCapNhatKienThucYKhoa && (
                                  <span>Hình thức: {submission.HinhThucCapNhatKienThucYKhoa}</span>
                                )}
                                {submission.ChiTietVaiTro && <span>• Vai trò: {submission.ChiTietVaiTro}</span>}
                                {submission.creatorAccount?.TenDangNhap && submission.CreationMethod === 'bulk' && (
                                  <span>Bởi {submission.creatorAccount.TenDangNhap}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {userRole !== 'NguoiHanhNghe' && (
                            <TableCell className="align-middle min-w-[200px] max-w-[260px]">
                              <div className="space-y-1 whitespace-normal break-words">
                                <p className="font-medium text-gray-900 leading-tight" title={submission.practitioner.HoVaTen}>
                                  {submission.practitioner.HoVaTen}
                                </p>
                                {submission.practitioner.ChucDanh && (
                                  <p className="text-sm text-gray-500 leading-snug" title={submission.practitioner.ChucDanh}>
                                    {submission.practitioner.ChucDanh}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          )}

                          <TableCell className="align-middle text-sm text-gray-700">
                            {submission.SoTiet && <div>{submission.SoTiet} tiết</div>}
                            {submission.NgayBatDau && (
                              <div className="text-gray-500">{formatDate(submission.NgayBatDau)}</div>
                            )}
                          </TableCell>

                          <TableCell className="align-middle font-semibold text-medical-blue">
                            {submission.SoGioTinChiQuyDoi || 0} tín chỉ
                          </TableCell>

                          <TableCell className="align-middle">
                            <div className="space-y-1">
                              {getStatusBadge(submission.TrangThaiDuyet)}
                              {submission.TrangThaiDuyet === 'TuChoi' && submission.GhiChuDuyet && (
                                <p className="text-xs text-red-600 truncate" title={submission.GhiChuDuyet}>
                                  {submission.GhiChuDuyet}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="align-middle text-sm text-gray-600">
                            <div>{formatDate(submission.NgayGhiNhan)}</div>
                            {submission.NgayDuyet && (
                              <div className="text-xs text-gray-400">
                                Duyệt: {formatDate(submission.NgayDuyet)}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Xem chi tiết"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewSubmission(submission.MaGhiNhan);
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Xem chi tiết</TooltipContent>
                              </Tooltip>

                              {submission.FileMinhChungUrl && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Xem minh chứng"
                                        onClick={(event) => handleViewEvidence(event, submission)}
                                        disabled={evidenceFile.isLoading && isActiveEvidenceRow}
                                      >
                                        {isViewingEvidence ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <FileSearch className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Xem minh chứng</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Tải minh chứng"
                                        onClick={(event) => handleDownloadEvidence(event, submission)}
                                        disabled={evidenceFile.isLoading && isActiveEvidenceRow}
                                      >
                                        {isDownloadingEvidence ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <DownloadCloud className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Tải xuống</TooltipContent>
                                  </Tooltip>
                                </>
                              )}

                              {canDelete(submission) && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Xóa hoạt động"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(submission.MaGhiNhan);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Xóa</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-6 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-600" aria-live="polite">
                  {summaryText}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="text-sm text-gray-500 text-center sm:text-left">
                    Trang {page} / {totalPages}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Trang trước</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Trang sau</span>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </GlassCard>
      </TooltipProvider>

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
              variant="outline-accent"
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
