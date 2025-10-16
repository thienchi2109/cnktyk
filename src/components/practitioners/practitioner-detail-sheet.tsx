'use client';

/**
 * Practitioner Detail Sheet Component
 * Displays detailed information about a practitioner in a slide-out panel
 */

import { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Award, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Edit,
  X
} from 'lucide-react';
import { PractitionerForm } from './practitioner-form';

interface PractitionerDetailSheetProps {
  practitionerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
  onUpdate?: () => void;
}

export function PractitionerDetailSheet({
  practitionerId,
  open,
  onOpenChange,
  canEdit = false,
  units = [],
  onUpdate
}: PractitionerDetailSheetProps) {
  const [practitioner, setPractitioner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open && practitionerId) {
      fetchPractitionerDetails();
      setIsEditing(false); // Reset edit mode when opening
    }
  }, [open, practitionerId]);

  const fetchPractitionerDetails = async () => {
    if (!practitionerId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/practitioners/${practitionerId}`);
      if (response.ok) {
        const data = await response.json();
        setPractitioner(data);
      }
    } catch (error) {
      console.error('Error fetching practitioner details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DangLamViec':
        return <Badge className="bg-green-100 text-green-800">Đang làm việc</Badge>;
      case 'TamHoan':
        return <Badge className="bg-yellow-100 text-yellow-800">Tạm hoãn</Badge>;
      case 'DaNghi':
        return <Badge className="bg-red-100 text-red-800">Đã nghỉ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getComplianceBadge = (complianceStatus: any) => {
    if (!complianceStatus) return null;

    const { compliancePercentage, status } = complianceStatus;
    
    switch (status) {
      case 'compliant':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đạt chuẩn ({compliancePercentage.toFixed(0)}%)
          </Badge>
        );
      case 'at_risk':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Rủi ro ({compliancePercentage.toFixed(0)}%)
          </Badge>
        );
      case 'non_compliant':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Chưa đạt ({compliancePercentage.toFixed(0)}%)
          </Badge>
        );
      default:
        return <Badge variant="outline">{compliancePercentage.toFixed(0)}%</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Chỉnh sửa người hành nghề' : 'Chi tiết người hành nghề'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Cập nhật thông tin người hành nghề' : 'Thông tin chi tiết và trạng thái tuân thủ'}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isEditing && practitioner ? (
          <div className="mt-6">
            <PractitionerForm
              initialData={practitioner}
              units={units}
              mode="edit"
              variant="sheet"
              onSuccess={() => {
                setIsEditing(false);
                fetchPractitionerDetails();
                if (onUpdate) onUpdate();
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : practitioner ? (
          <div className="mt-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Thông tin cơ bản
              </h3>
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600">Họ và tên</label>
                  <p className="text-base font-semibold">{practitioner.HoVaTen}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Chức danh</label>
                  <p className="text-base">{practitioner.ChucDanh || 'Không xác định'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Trạng thái</label>
                  <div className="mt-1">{getStatusBadge(practitioner.TrangThaiLamViec)}</div>
                </div>
              </div>
            </div>

            {/* License Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5" />
                Thông tin chứng chỉ
              </h3>
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600">Số CCHN</label>
                  <p className="text-base font-mono">{practitioner.SoCCHN || 'Chưa có'}</p>
                </div>
                {practitioner.NgayCapCCHN && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ngày cấp</label>
                    <p className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(practitioner.NgayCapCCHN).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building className="w-5 h-5" />
                Thông tin liên hệ
              </h3>
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                {practitioner.Email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-base flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {practitioner.Email}
                    </p>
                  </div>
                )}
                {practitioner.DienThoai && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Số điện thoại</label>
                    <p className="text-base flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {practitioner.DienThoai}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Compliance Status */}
            {practitioner.complianceStatus && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Trạng thái tuân thủ
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Mức độ tuân thủ</span>
                    {getComplianceBadge(practitioner.complianceStatus)}
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Tín chỉ đạt được</span>
                      <span className="font-bold">
                        {practitioner.complianceStatus.totalCredits} / {practitioner.complianceStatus.requiredCredits}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          practitioner.complianceStatus.compliancePercentage >= 90
                            ? 'bg-green-500'
                            : practitioner.complianceStatus.compliancePercentage >= 70
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min(practitioner.complianceStatus.compliancePercentage, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-500">
            Không tìm thấy thông tin người hành nghề
          </div>
        )}

        {/* Floating Edit Button - Bottom Right */}
        {canEdit && !isEditing && practitioner && (
          <Button
            className="fixed bottom-6 right-6 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            size="lg"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-5 h-5 mr-2" />
            Chỉnh sửa
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
