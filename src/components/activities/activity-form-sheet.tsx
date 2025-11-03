'use client';

/**
 * Activity Form Sheet Component
 * Displays activity creation/editing form in a slide-out panel
 */

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { AlertTriangle, Plus, Edit, X } from 'lucide-react';
import { ActivityForm } from './activity-form';

interface ActivityFormSheetProps {
  activityId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  userRole?: string;
  unitId?: string;
  permissions?: {
    canCreateGlobal: boolean;
    canCreateUnit: boolean;
    canEditGlobal: boolean;
    canEditUnit: boolean;
    canAdoptToGlobal: boolean;
  };
  onUpdate?: () => void;
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

export function ActivityFormSheet({
  activityId,
  open,
  onOpenChange,
  mode,
  userRole = 'DonVi',
  unitId,
  permissions = {
    canCreateGlobal: false,
    canCreateUnit: false,
    canEditGlobal: false,
    canEditUnit: false,
    canAdoptToGlobal: false,
  },
  onUpdate
}: ActivityFormSheetProps) {
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && activityId && mode === 'edit') {
      fetchActivityDetails();
    } else if (mode === 'create') {
      setActivity(null);
      setError(null);
    }
  }, [open, activityId, mode]);

  const fetchActivityDetails = async () => {
    if (!activityId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/activities/${activityId}`);
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể tải thông tin hoạt động');
      }
    } catch (error) {
      console.error('Error fetching activity details:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Convert date strings to Date objects or null
      const processedData = {
        ...data,
        HieuLucTu: data.HieuLucTu ? new Date(data.HieuLucTu) : null,
        HieuLucDen: data.HieuLucDen ? new Date(data.HieuLucDen) : null,
      };

      const url = mode === 'create'
        ? '/api/activities'
        : `/api/activities/${activityId}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Không thể ${mode === 'create' ? 'tạo' : 'cập nhật'} hoạt động`);
      }

      // Call update callback
      if (onUpdate) {
        onUpdate();
      }

      // Close sheet
      onOpenChange(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <Plus className="h-5 w-5" />
                Thêm hoạt động mới
              </>
            ) : (
              <>
                <Edit className="h-5 w-5" />
                Chỉnh sửa hoạt động
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Tạo hoạt động mới cho danh mục'
              : 'Cập nhật thông tin hoạt động'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              <LoadingNotice message="Đang tải thông tin hoạt động..." align="left" size="sm" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          ) : (
            <ActivityForm
              variant="sheet"
              activity={activity}
              mode={mode}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
              userRole={userRole}
              unitId={unitId}
              permissions={permissions}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}