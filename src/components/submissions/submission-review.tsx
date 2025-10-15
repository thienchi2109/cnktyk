'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  Download,
  ArrowLeft,
  AlertTriangle,
  Info
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

interface SubmissionDetails {
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
    Email: string | null;
    DienThoai: string | null;
  };
  activityCatalog?: {
    TenDanhMuc: string;
    LoaiHoatDong: string;
    TyLeQuyDoi: number;
    YeuCauMinhChung: boolean;
  };
}

interface SubmissionReviewProps {
  submissionId: string;
  userRole: string;
  onBack?: () => void;
  onReviewComplete?: () => void;
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

const activityTypeLabels = {
  KhoaHoc: 'Khóa học',
  HoiThao: 'Hội thảo',
  NghienCuu: 'Nghiên cứu',
  BaoCao: 'Báo cáo',
};

export function SubmissionReview({ 
  submissionId, 
  userRole, 
  onBack, 
  onReviewComplete 
}: SubmissionReviewProps) {
  const router = useRouter();
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_info' | null>(null);
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');

  // Fetch submission details
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/submissions/${submissionId}`);
        
        if (!response.ok) {
          throw new Error('Không thể tải thông tin hoạt động');
        }

        const data = await response.json();
        setSubmission(data.submission);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setIsLoading(false);
      }
    };

    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  const handleReviewSubmission = async (action: 'approve' | 'reject' | 'request_info') => {
    if (!submission) return;

    try {
      setIsProcessing(true);
      setError(null);

      const requestData: any = { action };
      
      if (action === 'approve' && comments) {
        requestData.comments = comments;
      } else if (action === 'reject' && reason) {
        requestData.reason = reason;
      } else if (action === 'request_info' && comments) {
        requestData.comments = comments;
      }

      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Không thể xử lý yêu cầu');
      }

      // Update local state
      setSubmission(result.submission);
      setReviewAction(null);
      setComments('');
      setReason('');

      // Notify parent component
      if (onReviewComplete) {
        onReviewComplete();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadEvidence = async () => {
    if (!submission?.FileMinhChungUrl) return;

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

  const canReview = () => {
    return ['DonVi', 'SoYTe'].includes(userRole) && 
           submission?.TrangThaiDuyet === 'ChoDuyet';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <GlassCard className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </GlassCard>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error || 'Không tìm thấy hoạt động'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <GlassButton
              variant="ghost"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </GlassButton>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết hoạt động</h1>
            <p className="text-gray-600 mt-1">Xem xét và phê duyệt hoạt động đào tạo liên tục</p>
          </div>
        </div>

        <Badge className={`${statusColors[submission.TrangThaiDuyet]} border text-sm px-3 py-1`}>
          {statusLabels[submission.TrangThaiDuyet]}
        </Badge>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Practitioner Information */}
      <GlassCard className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <User className="h-5 w-5 text-medical-blue" />
          <h3 className="text-lg font-semibold text-gray-900">Thông tin nhân viên</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Họ và tên</Label>
            <p className="text-gray-900 font-medium">{submission.practitioner.HoVaTen}</p>
          </div>
          
          {submission.practitioner.SoCCHN && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Số CCHN</Label>
              <p className="text-gray-900">{submission.practitioner.SoCCHN}</p>
            </div>
          )}
          
          {submission.practitioner.ChucDanh && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Chức danh</Label>
              <p className="text-gray-900">{submission.practitioner.ChucDanh}</p>
            </div>
          )}
          
          {submission.practitioner.Email && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Email</Label>
              <p className="text-gray-900">{submission.practitioner.Email}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Activity Information */}
      <GlassCard className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-medical-blue" />
          <h3 className="text-lg font-semibold text-gray-900">Thông tin hoạt động</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">Tên hoạt động</Label>
            <p className="text-gray-900 font-medium">{submission.TenHoatDong}</p>
            {submission.activityCatalog && (
              <Badge variant="outline" className="mt-1">
                {activityTypeLabels[submission.activityCatalog.LoaiHoatDong as keyof typeof activityTypeLabels]}
              </Badge>
            )}
          </div>

          {submission.HinhThucCapNhatKienThucYKhoa && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Hình thức cập nhật kiến thức</Label>
              <p className="text-gray-900">{submission.HinhThucCapNhatKienThucYKhoa}</p>
            </div>
          )}

          {submission.ChiTietVaiTro && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Chi tiết vai trò</Label>
              <p className="text-gray-900">{submission.ChiTietVaiTro}</p>
            </div>
          )}

          {submission.DonViToChuc && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Đơn vị tổ chức</Label>
              <p className="text-gray-900">{submission.DonViToChuc}</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-gray-700">Số giờ tín chỉ quy đổi</Label>
            <p className="text-medical-blue font-semibold text-lg">{submission.SoGioTinChiQuyDoi || 0} tín chỉ</p>
            {submission.activityCatalog && submission.SoTiet && (
              <p className="text-sm text-gray-500">
                {submission.SoTiet} tiết × {submission.activityCatalog.TyLeQuyDoi} = {submission.SoGioTinChiQuyDoi} tín chỉ
              </p>
            )}
          </div>

          {submission.NgayBatDau && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Ngày bắt đầu</Label>
              <p className="text-gray-900">{formatDate(submission.NgayBatDau)}</p>
            </div>
          )}

          {submission.NgayKetThuc && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Ngày kết thúc</Label>
              <p className="text-gray-900">{formatDate(submission.NgayKetThuc)}</p>
            </div>
          )}

          {submission.SoTiet && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Số tiết</Label>
              <p className="text-gray-900">{submission.SoTiet}</p>
            </div>
          )}

          {submission.BangChungSoGiayChungNhan && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Số giấy chứng nhận</Label>
              <p className="text-gray-900">{submission.BangChungSoGiayChungNhan}</p>
            </div>
          )}


        </div>
      </GlassCard>

      {/* Evidence Files */}
      {submission.FileMinhChungUrl && (
        <GlassCard className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-5 w-5 text-medical-blue" />
            <h3 className="text-lg font-semibold text-gray-900">Tệp minh chứng</h3>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-medical-blue" />
              <div>
                <p className="font-medium text-gray-900">Tệp minh chứng</p>
              </div>
            </div>
            
            <GlassButton
              onClick={handleDownloadEvidence}
              className="bg-medical-green hover:bg-medical-green/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Tải xuống
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Submission Timeline */}
      <GlassCard className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-medical-blue" />
          <h3 className="text-lg font-semibold text-gray-900">Lịch sử xử lý</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-medical-blue rounded-full"></div>
            <div>
              <p className="font-medium text-gray-900">Hoạt động được gửi</p>
              <p className="text-sm text-gray-500">{formatDate(submission.NgayGhiNhan)}</p>
            </div>
          </div>

          {submission.NgayDuyet && (
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                submission.TrangThaiDuyet === 'DaDuyet' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="font-medium text-gray-900">
                  {submission.TrangThaiDuyet === 'DaDuyet' ? 'Hoạt động được phê duyệt' : 'Hoạt động bị từ chối'}
                </p>
                <p className="text-sm text-gray-500">{formatDate(submission.NgayDuyet)}</p>
                {submission.GhiChuDuyet && (
                  <p className="text-sm text-gray-700 mt-1">{submission.GhiChuDuyet}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Review Actions */}
      {canReview() && (
        <GlassCard className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MessageSquare className="h-5 w-5 text-medical-blue" />
            <h3 className="text-lg font-semibold text-gray-900">Xem xét hoạt động</h3>
          </div>

          {!reviewAction ? (
            <div className="flex flex-wrap gap-3">
              <GlassButton
                onClick={() => setReviewAction('approve')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Phê duyệt
              </GlassButton>
              
              <GlassButton
                onClick={() => setReviewAction('reject')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Từ chối
              </GlassButton>
              
              <GlassButton
                onClick={() => setReviewAction('request_info')}
                variant="outline"
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                <Info className="h-4 w-4 mr-2" />
                Yêu cầu bổ sung
              </GlassButton>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewAction === 'approve' && (
                <div>
                  <Label htmlFor="comments">Nhận xét (tùy chọn)</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Nhận xét về hoạt động..."
                    rows={3}
                  />
                </div>
              )}

              {reviewAction === 'reject' && (
                <div>
                  <Label htmlFor="reason">Lý do từ chối *</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Vui lòng nêu rõ lý do từ chối..."
                    rows={3}
                    required
                  />
                </div>
              )}

              {reviewAction === 'request_info' && (
                <div>
                  <Label htmlFor="comments">Yêu cầu bổ sung thông tin *</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Vui lòng nêu rõ thông tin cần bổ sung..."
                    rows={3}
                    required
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <GlassButton
                  onClick={() => handleReviewSubmission(reviewAction)}
                  disabled={isProcessing || (reviewAction === 'reject' && !reason) || (reviewAction === 'request_info' && !comments)}
                  className={`${
                    reviewAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  {isProcessing ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : reviewAction === 'approve' ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {isProcessing ? 'Đang xử lý...' : 
                   reviewAction === 'approve' ? 'Xác nhận phê duyệt' :
                   reviewAction === 'reject' ? 'Xác nhận từ chối' :
                   'Xác nhận yêu cầu'}
                </GlassButton>
                
                <GlassButton
                  variant="ghost"
                  onClick={() => {
                    setReviewAction(null);
                    setComments('');
                    setReason('');
                  }}
                  disabled={isProcessing}
                >
                  Hủy
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}