'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Download
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';

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
  practitioner?: {
    HoVaTen: string;
    SoCCHN: string | null;
    ChucDanh: string | null;
  };
  activityCatalog?: {
    TenDanhMuc: string;
    LoaiHoatDong: string;
  };
}

interface SubmissionsListProps {
  userRole: string;
  onCreateSubmission?: () => void;
  onViewSubmission?: (submissionId: string) => void;
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
  onViewSubmission 
}: SubmissionsListProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Fetch submissions
  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/submissions?${params}`);
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách hoạt động');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page, statusFilter]);

  // Filter submissions based on search
  const filteredSubmissions = submissions.filter(submission => {
    const searchLower = searchTerm.toLowerCase();
    return (
      submission.TenHoatDong.toLowerCase().includes(searchLower) ||
      submission.practitioner?.HoVaTen.toLowerCase().includes(searchLower) ||
      submission.ChiTietVaiTro?.toLowerCase().includes(searchLower) ||
      submission.HinhThucCapNhatKienThucYKhoa?.toLowerCase().includes(searchLower) ||
      ''
    );
  });

  const handleViewSubmission = (submissionId: string) => {
    if (onViewSubmission) {
      onViewSubmission(submissionId);
    } else {
      router.push(`/submissions/${submissionId}`);
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
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {userRole === 'NguoiHanhNghe' ? 'Hoạt động của tôi' : 'Quản lý hoạt động'}
          </h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'NguoiHanhNghe' 
              ? 'Theo dõi các hoạt động đào tạo liên tục đã gửi'
              : 'Xem xét và phê duyệt các hoạt động đào tạo liên tục'
            }
          </p>
        </div>
        
        {canCreateSubmission() && onCreateSubmission && (
          <GlassButton
            onClick={onCreateSubmission}
            className="bg-medical-blue hover:bg-medical-blue/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ghi nhận hoạt động
          </GlassButton>
        )}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Tìm kiếm hoạt động, nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="ChoDuyet">Chờ duyệt</SelectItem>
                <SelectItem value="DaDuyet">Đã duyệt</SelectItem>
                <SelectItem value="TuChoi">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Submissions Table */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[300px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có hoạt động nào</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Không tìm thấy hoạt động phù hợp với bộ lọc'
                : 'Chưa có hoạt động nào được ghi nhận'
              }
            </p>
            {canCreateSubmission() && onCreateSubmission && (
              <GlassButton
                onClick={onCreateSubmission}
                className="mt-4 bg-medical-blue hover:bg-medical-blue/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ghi nhận hoạt động đầu tiên
              </GlassButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hoạt động</TableHead>
                  {userRole !== 'NguoiHanhNghe' && <TableHead>Nhân viên</TableHead>}
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Tín chỉ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày gửi</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.MaGhiNhan}>
                    <TableCell>
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
                    </TableCell>
                    
                    {userRole !== 'NguoiHanhNghe' && (
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {submission.practitioner?.HoVaTen}
                          </div>
                          {submission.practitioner?.ChucDanh && (
                            <div className="text-sm text-gray-500">
                              {submission.practitioner.ChucDanh}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell>
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
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-medium text-medical-blue">
                        {submission.SoGioTinChiQuyDoi || 0} tín chỉ
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(submission.TrangThaiDuyet)}
                      {submission.TrangThaiDuyet === 'TuChoi' && submission.GhiChuDuyet && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                          {submission.GhiChuDuyet}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {formatDate(submission.NgayGhiNhan)}
                      </div>
                      {submission.NgayDuyet && (
                        <div className="text-xs text-gray-400">
                          Duyệt: {formatDate(submission.NgayDuyet)}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSubmission(submission.MaGhiNhan)}
                          className="text-gray-600 hover:text-medical-blue"
                        >
                          <Eye className="h-4 w-4" />
                        </GlassButton>
                        
                        {submission.FileMinhChungUrl && (
                          <GlassButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadEvidence(submission)}
                            className="text-gray-600 hover:text-medical-green"
                          >
                            <Download className="h-4 w-4" />
                          </GlassButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}