'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  User,
  Calendar,
  Filter,
  Search,
  Plus,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/glass-select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';
import { useSubmissions } from '@/hooks/use-submissions';

interface Submission {
  MaGhiNhan: string;
  TenHoatDong: string;
  NgayGhiNhan: string;
  TrangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useSubmissions({
    page,
    limit: 10,
    status: statusFilter,
    search: searchTerm,
  });

  const totalPages = (data && data.pagination ? data.pagination.totalPages : 1);
  const total = (data && data.pagination ? data.pagination.total : 0);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm]);

  const filteredSubmissions = ((data?.data as Submission[]) ?? []);

  const handleViewSubmission = (submissionId: string) => {
    if (onViewSubmission) {
      onViewSubmission(submissionId);
    }
  };

  const handleDownloadEvidence = async (submission: Submission) => {
    if (!submission.FileMinhChungUrl) return;

    try {
      const response = await fetch(`${submission.FileMinhChungUrl}?action=signed-url`);
      const data = await response.json();
      
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to download evidence:', error);
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
            <h1 className="text-3xl font-bold text-gray-900">
              {userRole === 'NguoiHanhNghe' ? 'Hoạt động của tôi' : 'Quản lý hoạt động'}
            </h1>
          </div>
          <p className="text-gray-600">
            {userRole === 'NguoiHanhNghe' 
              ? `Theo dõi các hoạt động đào tạo liên tục • ${total} bản ghi`
              : `Xem xét và phê duyệt các hoạt động đào tạo liên tục • ${total} bản ghi`
            }
          </p>
        </div>
        
        {canCreateSubmission() && onCreateSubmission && (
          <GlassButton
            onClick={onCreateSubmission}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ghi nhận hoạt động
          </GlassButton>
        )}
      </div>

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
                onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-medical-blue mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Đang tải danh sách hoạt động...</p>
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
                : 'Chưa có hoạt động nào được ghi nhận'
              }
            </p>
            {canCreateSubmission() && onCreateSubmission && (
              <GlassButton
                onClick={onCreateSubmission}
                className="mt-4 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ghi nhận hoạt động đầu tiên
              </GlassButton>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-200/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                    {userRole !== 'NguoiHanhNghe' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người hành nghề</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tín chỉ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày gửi</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.MaGhiNhan} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {submission.TenHoatDong}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
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
                        </div>
                      </td>
                      
                      {userRole !== 'NguoiHanhNghe' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">
                              {submission.practitioner.HoVaTen}
                            </div>
                            {submission.practitioner.ChucDanh && (
                              <div className="text-sm text-gray-500">
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
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <GlassButton
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewSubmission(submission.MaGhiNhan)}
                          >
                            <Eye className="h-4 w-4" />
                          </GlassButton>
                          
                          {submission.FileMinhChungUrl && (
                            <GlassButton
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDownloadEvidence(submission)}
                            >
                              <Download className="h-4 w-4" />
                            </GlassButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
