'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ActivitiesList } from '@/components/activities/activities-list';
import { ActivityFormSheet } from '@/components/activities/activity-form-sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  activitiesCatalogQueryKey,
  ActivityCatalogItem,
  ActivityPermissions,
  ActivitiesCatalogResponse,
  removeActivityCatalogEntry,
  upsertActivityCatalogEntry,
} from '@/hooks/use-activities';

type FeedbackState =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null;

const defaultPermissions: ActivityPermissions = {
  canCreateGlobal: false,
  canCreateUnit: false,
  canEditGlobal: false,
  canEditUnit: false,
  canAdoptToGlobal: false,
  canRestoreSoftDeleted: false,
};

export default function ActivitiesPage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityCatalogItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [permissions, setPermissions] = useState<ActivityPermissions>(defaultPermissions);

  const catalogKey = activitiesCatalogQueryKey();

  const deleteMutation = useMutation<ActivityCatalogItem, Error, string, { previousCatalog?: ActivitiesCatalogResponse }>({
    mutationFn: async (activityId: string) => {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể xóa hoạt động');
      }

      const data = await response.json();
      if (!data?.activity) {
        throw new Error('Không nhận được phản hồi hoạt động sau khi xóa');
      }
      return data.activity as ActivityCatalogItem;
    },
    onMutate: async (activityId) => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: catalogKey });

      const previousCatalog = queryClient.getQueryData<ActivitiesCatalogResponse>(catalogKey);
      if (previousCatalog) {
        const nextCatalog = removeActivityCatalogEntry(previousCatalog, activityId);
        if (nextCatalog) {
          queryClient.setQueryData(catalogKey, nextCatalog);
        }
      }

      return { previousCatalog };
    },
    onError: (error, _activityId, context) => {
      if (context?.previousCatalog) {
        queryClient.setQueryData(catalogKey, context.previousCatalog);
      }
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Có lỗi xảy ra trong quá trình xóa hoạt động',
      });
    },
    onSuccess: (activity) => {
      setFeedback({
        type: 'success',
        message: `Đã xóa hoạt động "${activity.TenDanhMuc}".`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: catalogKey });
    },
  });

  const adoptMutation = useMutation<ActivityCatalogItem, Error, string, { previousCatalog?: ActivitiesCatalogResponse }>({
    mutationFn: async (activityId: string) => {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ MaDonVi: null }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể chuyển hoạt động thành hoạt động hệ thống');
      }

      const data = await response.json();
      return data as ActivityCatalogItem;
    },
    onMutate: async (activityId) => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: catalogKey });

      const previousCatalog = queryClient.getQueryData<ActivitiesCatalogResponse>(catalogKey);
      if (previousCatalog) {
        const existing =
          previousCatalog.unit.find((item) => item.MaDanhMuc === activityId) ||
          previousCatalog.global.find((item) => item.MaDanhMuc === activityId);

        if (existing) {
          const optimistic: ActivityCatalogItem = {
            ...existing,
            MaDonVi: null,
          };

          const removed = removeActivityCatalogEntry(previousCatalog, activityId);
          const nextCatalog = upsertActivityCatalogEntry(removed, optimistic);
          if (nextCatalog) {
            queryClient.setQueryData(catalogKey, nextCatalog);
          }
        }
      }

      return { previousCatalog };
    },
    onError: (error, _activityId, context) => {
      if (context?.previousCatalog) {
        queryClient.setQueryData(catalogKey, context.previousCatalog);
      }
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi chuyển hoạt động',
      });
    },
    onSuccess: (activity) => {
      queryClient.setQueryData(catalogKey, (current) =>
        upsertActivityCatalogEntry(current as ActivitiesCatalogResponse | undefined, activity) ??
        current
      );

      setFeedback({
        type: 'success',
        message: `Đã chuyển hoạt động "${activity.TenDanhMuc}" thành hoạt động hệ thống.`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: catalogKey });
    },
  });

  const restoreMutation = useMutation<ActivityCatalogItem, Error, string, { previousCatalog?: ActivitiesCatalogResponse }>({
    mutationFn: async (activityId: string) => {
      const response = await fetch(`/api/activities/${activityId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể khôi phục hoạt động');
      }

      const data = await response.json();
      if (!data?.activity) {
        throw new Error('Không nhận được dữ liệu hoạt động sau khi khôi phục');
      }
      return data.activity as ActivityCatalogItem;
    },
    onMutate: async () => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: catalogKey });
      const previousCatalog = queryClient.getQueryData<ActivitiesCatalogResponse>(catalogKey);
      return { previousCatalog };
    },
    onError: (error, _activityId, context) => {
      if (context?.previousCatalog) {
        queryClient.setQueryData(catalogKey, context.previousCatalog);
      }
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi khôi phục hoạt động',
      });
    },
    onSuccess: (activity) => {
      queryClient.setQueryData(catalogKey, (current) =>
        upsertActivityCatalogEntry(current as ActivitiesCatalogResponse | undefined, activity) ??
        current
      );

      setFeedback({
        type: 'success',
        message: `Đã khôi phục hoạt động "${activity.TenDanhMuc}".`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: catalogKey });
    },
  });

  const isMutating =
    deleteMutation.isPending || adoptMutation.isPending || restoreMutation.isPending;

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

  const handleCreateClick = () => {
    setSelectedActivity(null);
    setShowCreateSheet(true);
  };

  const handleEditClick = (activity: ActivityCatalogItem) => {
    setSelectedActivity(activity);
    setShowCreateSheet(true);
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (deleteMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa hoạt động này? Hoạt động sẽ được đánh dấu xóa mềm và có thể khôi phục sau.'
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(activityId);
    } catch {
      // Mutation onError already sets feedback
    }
  };

  const handleAdoptToGlobal = async (activityId: string) => {
    if (adoptMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(
      'Chuyển hoạt động này thành hoạt động hệ thống? Tất cả đơn vị sẽ có thể sử dụng hoạt động này.'
    );
    if (!confirmed) {
      return;
    }

    try {
      await adoptMutation.mutateAsync(activityId);
    } catch {
      // handled in mutation
    }
  };

  const handleRestoreActivity = async (activityId: string) => {
    if (restoreMutation.isPending) {
      return;
    }

    const confirmed = window.confirm('Khôi phục hoạt động đã xóa?');
    if (!confirmed) {
      return;
    }

    try {
      await restoreMutation.mutateAsync(activityId);
    } catch {
      // handled in mutation
    }
  };

  const handleSheetToggle = (openState: boolean) => {
    setShowCreateSheet(openState);
    if (!openState) {
      setSelectedActivity(null);
    }
  };

  const handleSheetUpdate = (result: { type: 'create' | 'update'; activity: ActivityCatalogItem }) => {
    const message =
      result.type === 'create'
        ? `Đã tạo hoạt động "${result.activity.TenDanhMuc}".`
        : `Đã cập nhật hoạt động "${result.activity.TenDanhMuc}".`;
    setFeedback({ type: 'success', message });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {isMutating && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-700">
            Đang xử lý thao tác, vui lòng đợi...
          </AlertDescription>
        </Alert>
      )}

      {feedback && (
        <Alert
          className={
            feedback.type === 'success'
              ? 'mb-6 border-green-200 bg-green-50'
              : 'mb-6 border-red-200 bg-red-50'
          }
        >
          <AlertDescription
            className={feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}
          >
            {feedback.message}
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

      <ActivityFormSheet
        activityId={selectedActivity?.MaDanhMuc}
        open={showCreateSheet}
        onOpenChange={handleSheetToggle}
        mode={selectedActivity ? 'edit' : 'create'}
        userRole={userRole}
        unitId={session.user.unitId}
        permissions={permissions}
        onUpdate={handleSheetUpdate}
      />
    </div>
  );
}
