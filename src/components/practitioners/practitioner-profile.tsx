'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Building, 
  Award, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Edit,
  ArrowLeft,
  FileText,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { PractitionerForm } from './practitioner-form';

interface ComplianceStatus {
  totalCredits: number;
  requiredCredits: number;
  compliancePercentage: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

interface Activity {
  MaGhiNhan: string;
  TenHoatDong: string;
  VaiTro?: string;
  ThoiGianBatDau?: string;
  ThoiGianKetThuc?: string;
  SoGio?: number;
  SoTinChiQuyDoi: number;
  TrangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  ThoiGianDuyet?: string;
  GhiChu?: string;
  CreatedAt: string;
}

interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN?: string;
  NgayCapCCHN?: string;
  MaDonVi: string;
  TrangThaiLamViec: 'DangLamViec' | 'DaNghi' | 'TamHoan';
  Email?: string;
  DienThoai?: string;
  ChucDanh?: string;
  complianceStatus: ComplianceStatus;
  recentActivities: Activity[];
}

interface PractitionerProfileProps {
  practitionerId: string;
  userRole: string;
  userUnitId?: string;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
}

export function PractitionerProfile({ practitionerId, userRole, userUnitId, units = [] }: PractitionerProfileProps) {
  const router = useRouter();
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);

  useEffect(() => {
    fetchPractitioner();
  }, [practitionerId]);

  const fetchPractitioner = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/practitioners/${practitionerId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Practitioner not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this practitioner');
        }
        throw new Error('Failed to fetch practitioner details');
      }

      const data = await response.json();
      setPractitioner(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600';
      case 'at_risk':
        return 'text-yellow-600';
      case 'non_compliant':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'at_risk':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'non_compliant':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityStatusBadge = (status: string) => {
    switch (status) {
      case 'DaDuyet':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đã duyệt</Badge>;
      case 'ChoDuyet':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Chờ duyệt</Badge>;
      case 'TuChoi':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canEdit = userRole === 'SoYTe' || 
    (userRole === 'DonVi' && practitioner?.MaDonVi === userUnitId) ||
    (userRole === 'NguoiHanhNghe' && practitionerId === 'current-user-id'); // This would need to be the actual user ID

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!practitioner) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        <Alert>
          <AlertDescription>Không tìm thấy người hành nghề.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{practitioner.HoVaTen}</h1>
            <p className="text-gray-600">{practitioner.ChucDanh || 'Người hành nghề y tế'}</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setShowEditSheet(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Họ và tên</label>
                    <p className="text-lg">{practitioner.HoVaTen}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Chức danh</label>
                    <p>{practitioner.ChucDanh || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trạng thái làm việc</label>
                    <div className="mt-1">
                      {getStatusBadge(practitioner.TrangThaiLamViec)}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Số CCHN</label>
                    <p>{practitioner.SoCCHN || 'Chưa cung cấp'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ngày cấp</label>
                    <p>{formatDate(practitioner.NgayCapCCHN)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Thông tin liên hệ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p>{practitioner.Email || 'Chưa cung cấp'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Số điện thoại</label>
                    <p>{practitioner.DienThoai || 'Chưa cung cấp'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Hoạt động gần đây
              </CardTitle>
              <CardDescription>
                Các hoạt động đào tạo liên tục gần đây
              </CardDescription>
            </CardHeader>
            <CardContent>
              {practitioner.recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Chưa có hoạt động nào.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hoạt động</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead>Giờ</TableHead>
                        <TableHead>Tín chỉ</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {practitioner.recentActivities.slice(0, 5).map((activity) => (
                        <TableRow key={activity.MaGhiNhan}>
                          <TableCell className="font-medium">
                            {activity.TenHoatDong}
                          </TableCell>
                          <TableCell>
                            {activity.VaiTro || 'Tham gia'}
                          </TableCell>
                          <TableCell>
                            {activity.SoGio || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {activity.SoTinChiQuyDoi}
                          </TableCell>
                          <TableCell>
                            {getActivityStatusBadge(activity.TrangThaiDuyet)}
                          </TableCell>
                          <TableCell>
                            {formatDate(activity.ThoiGianBatDau || activity.CreatedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Trạng thái tuân thủ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getComplianceIcon(practitioner.complianceStatus.status)}
                    <span className={`font-medium ${getComplianceStatusColor(practitioner.complianceStatus.status)}`}>
                      {practitioner.complianceStatus.compliancePercentage.toFixed(1)}% Hoàn thành
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={practitioner.complianceStatus.compliancePercentage} 
                  className="w-full"
                />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">Tín chỉ hiện có</label>
                    <p className="font-semibold text-lg">
                      {practitioner.complianceStatus.totalCredits}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">Tín chỉ yêu cầu</label>
                    <p className="font-semibold text-lg">
                      {practitioner.complianceStatus.requiredCredits}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600">
                    <strong>Còn thiếu:</strong> {' '}
                    {Math.max(0, practitioner.complianceStatus.requiredCredits - practitioner.complianceStatus.totalCredits)} tín chỉ
                  </div>
                </div>

                {practitioner.complianceStatus.status === 'non_compliant' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Mức tuân thủ dưới 70%. Cần thực hiện ngay.
                    </AlertDescription>
                  </Alert>
                )}

                {practitioner.complianceStatus.status === 'at_risk' && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Mức tuân thủ 70–89%. Nên ghi nhận thêm hoạt động.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Thống kê nhanh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng số hoạt động</span>
                  <span className="font-semibold">{practitioner.recentActivities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đã duyệt</span>
                  <span className="font-semibold text-green-600">
                    {practitioner.recentActivities.filter(a => a.TrangThaiDuyet === 'DaDuyet').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chờ duyệt</span>
                  <span className="font-semibold text-yellow-600">
                    {practitioner.recentActivities.filter(a => a.TrangThaiDuyet === 'ChoDuyet').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Từ chối</span>
                  <span className="font-semibold text-red-600">
                    {practitioner.recentActivities.filter(a => a.TrangThaiDuyet === 'TuChoi').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>Chỉnh sửa người hành nghề</SheetTitle>
            <SheetDescription>
              Cập nhật thông tin người hành nghề
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <PractitionerForm
              initialData={practitioner ? {
                MaNhanVien: practitioner.MaNhanVien,
                HoVaTen: practitioner.HoVaTen,
                SoCCHN: practitioner.SoCCHN || null,
                NgayCapCCHN: practitioner.NgayCapCCHN ? new Date(practitioner.NgayCapCCHN) : null,
                MaDonVi: practitioner.MaDonVi,
                TrangThaiLamViec: practitioner.TrangThaiLamViec,
                Email: practitioner.Email || null,
                DienThoai: practitioner.DienThoai || null,
                ChucDanh: practitioner.ChucDanh || null,
              } : undefined}
              units={units}
              mode="edit"
              variant="sheet"
              userRole={userRole}
              onSuccess={() => {
                setShowEditSheet(false);
                fetchPractitioner();
              }}
              onCancel={() => setShowEditSheet(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
