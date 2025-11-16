'use client';

/**
 * Practitioner Detail Sheet Component
 * Displays detailed information about a practitioner in a slide-out panel
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { LoadingNotice } from '@/components/ui/loading-notice';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { practitionerRecentSubmissionsQueryKey } from '@/hooks/use-practitioner-recent-submissions';
import { practitionerSubmissionsSummaryQueryKey } from '@/hooks/use-practitioner-submissions-summary';
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
  ArrowRight
} from 'lucide-react';
import { PractitionerForm } from './practitioner-form';
import { SubmissionsSummaryCard } from './submissions-summary-card';
import { RecentSubmissionsTable } from './recent-submissions-table';
import { SubmissionReview } from '@/components/submissions/submission-review';

interface PractitionerDetailSheetProps {
  practitionerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
  onUpdate?: () => void;
  userRole: 'SoYTe' | 'DonVi' | 'NguoiHanhNghe' | 'Auditor' | string;
}

export function PractitionerDetailSheet({
  practitionerId,
  open,
  onOpenChange,
  canEdit = false,
  units = [],
  onUpdate,
  userRole
}: PractitionerDetailSheetProps) {
  const [practitioner, setPractitioner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const queryClient = useQueryClient();

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

  const handleDeactivate = async () => {
    if (!practitionerId) return;
    const ok = window.confirm('Xác nhận vô hiệu hóa người hành nghề này?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/practitioners/${practitionerId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Xóa (vô hiệu) thất bại');
      }
      // Invalidate list cache
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      if (onUpdate) onUpdate();
      onOpenChange(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể vô hiệu hóa');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Chỉnh sửa người hành nghề' : 'Chi tiết người hành nghề'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Cập nhật thông tin người hành nghề' : 'Thông tin chi tiết và trạng thái tuân thủ'}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <LoadingNotice message="Đang tải thông tin người hành nghề..." align="left" size="sm" />
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
              userRole={userRole}
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Thông tin cơ bản
                </h3>
                {canEdit && !isEditing && (
                  <Button 
                    variant="default" 
                    size="lg" 
                    onClick={() => setIsEditing(true)}
                    className="gap-2 bg-gradient-to-r from-medical-blue to-blue-600 hover:from-medical-blue/90 hover:to-blue-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold ring-2 ring-medical-blue/20 hover:ring-medical-blue/40"
                  >
                    <Edit className="w-5 h-5" />
                    Chỉnh sửa
                  </Button>
                )}
              </div>
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

            {/* Activity Submissions */}
            {practitionerId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Hoạt động đã ghi nhận
                </h3>

                {/* Summary Card */}
                <SubmissionsSummaryCard practitionerId={practitionerId} />

                {/* Recent Submissions Table */}
                <RecentSubmissionsTable
                  practitionerId={practitionerId}
                  onSelectSubmission={(submissionId) => {
                    setSelectedSubmissionId(submissionId);
                    setShowSubmissionDialog(true);
                  }}
                />

                {/* View All Button */}
                <Button
                  variant="medical-secondary"
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => {
                    window.location.href = `/submissions?practitionerId=${practitionerId}`;
                  }}
                >
                  Xem tất cả hoạt động
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-500">
            Không tìm thấy thông tin người hành nghề
          </div>
        )}

        <Dialog
          open={showSubmissionDialog}
          onOpenChange={(open) => {
            setShowSubmissionDialog(open);
            if (!open) {
              setSelectedSubmissionId(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết hoạt động</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {selectedSubmissionId && (
                <SubmissionReview
                  submissionId={selectedSubmissionId}
                  userRole={userRole}
                  showHeading={false}
                  onBack={() => setShowSubmissionDialog(false)}
                  onReviewComplete={() => {
                    if (practitionerId) {
                      queryClient.invalidateQueries({ queryKey: practitionerRecentSubmissionsQueryKey(practitionerId) });
                      queryClient.invalidateQueries({ queryKey: practitionerSubmissionsSummaryQueryKey(practitionerId) });
                    }
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

      </SheetContent>
    </Sheet>
  );
}
