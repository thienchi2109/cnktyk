'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ActivitiesList } from '@/components/activities/activities-list';
import { ActivityFormSheet } from '@/components/activities/activity-form-sheet';
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
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState({
    canCreateGlobal: false,
    canCreateUnit: false,
    canEditGlobal: false,
    canEditUnit: false,
    canAdoptToGlobal: false,
  });

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
    setShowCreateSheet(true);
    setError(null);
  };

  // Handle edit activity
  const handleEditClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowCreateSheet(true);
    setError(null);
  };

  
  // Handle delete activity (soft delete)
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hoạt động này? Hoạt động sẽ được đánh dấu xóa mềm và có thể khôi phục sau.')) {
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

      // Refresh would be handled by state management in future implementation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  // Handle adopt to global (SoYTe only)
  const handleAdoptToGlobal = async (activityId: string) => {
    if (!confirm('Chuyển hoạt động này thành hoạt động hệ thống? Tất cả đơn vị sẽ có thể sử dụng hoạt động này.')) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ MaDonVi: null }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Không thể chuyển hoạt động');
      }

      // Refresh would be handled by state management in future implementation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  // Handle restore soft-deleted activity
  const handleRestoreActivity = async (activityId: string) => {
    if (!confirm('Khôi phục hoạt động đã xóa?')) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Không thể khôi phục hoạt động');
      }

      // Refresh would be handled by state management in future implementation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  // Handle sheet close
  const handleSheetClose = () => {
    setShowCreateSheet(false);
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
          unitId={session.user.unitId}
          onCreateActivity={handleCreateClick}
          onEditActivity={handleEditClick}
          onDeleteActivity={handleDeleteActivity}
          onAdoptToGlobal={handleAdoptToGlobal}
          onRestoreActivity={handleRestoreActivity}
          onPermissionsLoaded={setPermissions}
        />

        {/* Create/Edit Sheet */}
        <ActivityFormSheet
          activityId={selectedActivity?.MaDanhMuc}
          open={showCreateSheet}
          onOpenChange={setShowCreateSheet}
          mode={selectedActivity ? 'edit' : 'create'}
          userRole={userRole}
          unitId={session.user.unitId}
          permissions={permissions}
          onUpdate={() => {
            // Refresh would be handled by state management in future implementation
            window.location.reload();
          }}
        />
      </div>
  );
}