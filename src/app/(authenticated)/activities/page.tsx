'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ActivitiesList } from '@/components/activities/activities-list';
import { ActivityForm } from '@/components/activities/activity-form';
import { GlassModal } from '@/components/ui/glass-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface Activity {
  MaDanhMuc: string;
  TenDanhMuc: string;
  LoaiHoatDong: 'KhoaHoc' | 'HoiThao' | 'NghienCuu' | 'BaoCao';
  DonViTinh: 'gio' | 'tiet' | 'tin_chi';
  TyLeQuyDoi: number;
  GioToiThieu: number | null;
  GioToiDa: number | null;
  YeuCauMinhChung: boolean;
  HieuLucTu: string | null;
  HieuLucDen: string | null;
}

type ActivityFormData = {
  TenDanhMuc: string;
  LoaiHoatDong: 'KhoaHoc' | 'HoiThao' | 'NghienCuu' | 'BaoCao';
  DonViTinh: 'gio' | 'tiet' | 'tin_chi';
  TyLeQuyDoi: number;
  GioToiThieu: number | null;
  GioToiDa: number | null;
  YeuCauMinhChung: boolean;
  HieuLucTu?: string;
  HieuLucDen?: string;
};

export default function ActivitiesPage() {
  const { data: session, status } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Authentication check
  if (status === 'unauthenticated' || !session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            Bạn cần đăng nhập để truy cập trang này.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const userRole = session.user.role;

  // Handle create activity
  const handleCreateClick = () => {
    setSelectedActivity(null);
    setShowCreateModal(true);
    setError(null);
  };

  // Handle edit activity
  const handleEditClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowCreateModal(true);
    setError(null);
  };

  // Handle form submission
  const handleCreateActivity = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Convert date strings to Date objects or null
      const processedData = {
        ...data,
        HieuLucTu: data.HieuLucTu ? new Date(data.HieuLucTu) : null,
        HieuLucDen: data.HieuLucDen ? new Date(data.HieuLucDen) : null,
      };

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Không thể tạo hoạt động');
      }

      setShowCreateModal(false);
      // Refresh the list by reloading the page or triggering a refetch
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update activity
  const handleUpdateActivity = async (data: ActivityFormData) => {
    if (!selectedActivity) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Convert date strings to Date objects or null
      const processedData = {
        ...data,
        HieuLucTu: data.HieuLucTu ? new Date(data.HieuLucTu) : null,
        HieuLucDen: data.HieuLucDen ? new Date(data.HieuLucDen) : null,
      };

      const response = await fetch(`/api/activities/${selectedActivity.MaDanhMuc}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Không thể cập nhật hoạt động');
      }

      setShowCreateModal(false);
      setSelectedActivity(null);
      // Refresh the list
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Không thể xóa hoạt động');
      }

      // Refresh the list
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowCreateModal(false);
    setSelectedActivity(null);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <ActivitiesList
          userRole={userRole}
          onCreateActivity={handleCreateClick}
          onEditActivity={handleEditClick}
          onDeleteActivity={handleDeleteActivity}
        />

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <GlassModal
            isOpen={showCreateModal}
            onClose={handleModalClose}
            title={selectedActivity ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động mới'}
            size="lg"
          >
            <ActivityForm
              activity={selectedActivity}
              mode={selectedActivity ? 'edit' : 'create'}
              onSubmit={selectedActivity ? handleUpdateActivity : handleCreateActivity}
              onCancel={handleModalClose}
              isLoading={isSubmitting}
            />
          </GlassModal>
        )}
      </div>
  );
}