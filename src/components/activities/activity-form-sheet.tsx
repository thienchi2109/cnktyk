'use client';

/**
 * Activity Form Sheet Component
 * Displays activity creation/editing form in a slide-out panel
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { AlertTriangle, Plus, Edit } from 'lucide-react';
import { ActivityForm } from './activity-form';
import {
  activitiesCatalogBaseKey,
  upsertActivityCatalogEntry,
  removeActivityCatalogEntry,
  ActivityCatalogItem,
  ActivityPermissions,
  ActivitiesCatalogResponse,
  NormalizedActivitiesCatalogFilters,
  activityMatchesFilters,
} from '@/hooks/use-activities';

interface ActivityFormSheetProps {
  activityId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  userRole?: string;
  unitId?: string;
  permissions?: ActivityPermissions;
  onUpdate?: (result: { type: 'create' | 'update'; activity: ActivityCatalogItem }) => void;
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
  MaDonVi?: string | null;
  adoptToGlobal?: boolean;
};

interface ActivityMutationVariables {
  payload: Record<string, unknown>;
  optimistic: ActivityCatalogItem;
  mode: 'create' | 'edit';
  activityId?: string | null;
}

type CatalogSnapshot = Array<[
  readonly unknown[],
  ActivitiesCatalogResponse | undefined
]>;

interface ActivityMutationContext {
  previousCatalog?: CatalogSnapshot;
  tempId?: string;
}

const detailQueryKey = (activityId?: string | null) =>
  ['activities', 'detail', activityId ?? 'new'] as const;

async function fetchActivityDetail(activityId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/activities/${activityId}`, { signal });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Không thể tải thông tin hoạt động');
  }
  return response.json() as Promise<ActivityCatalogItem>;
}

function prepareSubmission(options: {
  formValues: ActivityFormData;
  mode: 'create' | 'edit';
  activity: ActivityCatalogItem | null;
  activityId?: string | null;
  userRole: string;
  unitId?: string;
}): { payload: Record<string, unknown>; optimistic: ActivityCatalogItem } {
  const { formValues, mode, activity, activityId, userRole, unitId } = options;

  const shouldAdoptToGlobal =
    mode === 'edit' &&
    userRole === 'SoYTe' &&
    formValues.adoptToGlobal &&
    activity?.MaDonVi !== null;

  let resolvedUnitId: string | null = null;
  if (mode === 'create') {
    if (userRole === 'DonVi') {
      resolvedUnitId = unitId ?? null;
    } else {
      const raw = formValues.MaDonVi;
      resolvedUnitId = raw === '' ? null : raw ?? null;
    }
  } else {
    if (shouldAdoptToGlobal) {
      resolvedUnitId = null;
    } else {
      resolvedUnitId = activity?.MaDonVi ?? null;
    }
  }

  const payload: Record<string, unknown> = {
    TenDanhMuc: formValues.TenDanhMuc,
    LoaiHoatDong: formValues.LoaiHoatDong,
    DonViTinh: formValues.DonViTinh,
    TyLeQuyDoi: formValues.TyLeQuyDoi,
    GioToiThieu: formValues.GioToiThieu,
    GioToiDa: formValues.GioToiDa,
    YeuCauMinhChung: formValues.YeuCauMinhChung,
    HieuLucTu: formValues.HieuLucTu ? new Date(formValues.HieuLucTu) : null,
    HieuLucDen: formValues.HieuLucDen ? new Date(formValues.HieuLucDen) : null,
  };

  if (mode === 'create') {
    payload.MaDonVi = resolvedUnitId;
  } else if (shouldAdoptToGlobal) {
    payload.MaDonVi = null;
  }

  const optimisticId =
    mode === 'create'
      ? `temp-${Date.now()}`
      : activity?.MaDanhMuc ?? activityId ?? `temp-${Date.now()}`;

  const optimistic: ActivityCatalogItem = {
    MaDanhMuc: optimisticId,
    TenDanhMuc: formValues.TenDanhMuc,
    LoaiHoatDong: formValues.LoaiHoatDong,
    DonViTinh: formValues.DonViTinh,
    TyLeQuyDoi: formValues.TyLeQuyDoi,
    GioToiThieu: formValues.GioToiThieu,
    GioToiDa: formValues.GioToiDa,
    YeuCauMinhChung: formValues.YeuCauMinhChung,
    HieuLucTu: formValues.HieuLucTu && formValues.HieuLucTu.length > 0 ? formValues.HieuLucTu : null,
    HieuLucDen: formValues.HieuLucDen && formValues.HieuLucDen.length > 0 ? formValues.HieuLucDen : null,
    MaDonVi: resolvedUnitId,
    DaXoaMem: activity?.DaXoaMem ?? false,
  };

  return { payload, optimistic };
}

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
    canRestoreSoftDeleted: false,
  },
  onUpdate,
}: ActivityFormSheetProps) {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const catalogKey = activitiesCatalogBaseKey;

  const takeCatalogSnapshot = () =>
    queryClient.getQueriesData<ActivitiesCatalogResponse>({ queryKey: catalogKey });

  const restoreCatalogSnapshot = (snapshot?: CatalogSnapshot) => {
    snapshot?.forEach(([key, data]) => {
      queryClient.setQueryData(key, data);
    });
  };

  const resolveFiltersFromKey = (key: readonly unknown[]): NormalizedActivitiesCatalogFilters | null => {
    const candidate = key[key.length - 1];
    if (candidate && typeof candidate === 'object' && 'scope' in candidate) {
      return candidate as NormalizedActivitiesCatalogFilters;
    }
    return null;
  };

  useEffect(() => {
    if (!open) {
      setMutationError(null);
    }
  }, [open]);

  const shouldFetchDetail = open && mode === 'edit' && Boolean(activityId);

  const activityDetailQuery = useQuery<ActivityCatalogItem>({
    queryKey: detailQueryKey(activityId),
    queryFn: ({ signal }) => fetchActivityDetail(activityId as string, signal),
    enabled: shouldFetchDetail,
    staleTime: 60 * 1000,
  });

  const activity = mode === 'edit' ? activityDetailQuery.data ?? null : null;
  const detailError =
    activityDetailQuery.error instanceof Error
      ? activityDetailQuery.error.message
      : null;
  const displayError = mutationError ?? detailError;

  const mutation = useMutation<ActivityCatalogItem, Error, ActivityMutationVariables, ActivityMutationContext>({
    mutationFn: async ({ payload, mode: submitMode, activityId: submitId }) => {
      const url = submitMode === 'create' ? '/api/activities' : `/api/activities/${submitId}`;
      const method = submitMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Không thể ${submitMode === 'create' ? 'tạo' : 'cập nhật'} hoạt động`
        );
      }

      const result = await response.json();
      return result as ActivityCatalogItem;
    },
    onMutate: async (variables) => {
      setMutationError(null);
      await queryClient.cancelQueries({ queryKey: catalogKey });

      const previousCatalog = takeCatalogSnapshot();
      previousCatalog.forEach(([key, current]) => {
        if (!current) {
          return;
        }
        const filters = resolveFiltersFromKey(key);
        const shouldInclude = !filters || activityMatchesFilters(variables.optimistic, filters);

        const withoutEntry = removeActivityCatalogEntry(current, variables.optimistic.MaDanhMuc) ?? current;
        const nextCatalog = shouldInclude
          ? upsertActivityCatalogEntry(withoutEntry, variables.optimistic)
          : withoutEntry;

        if (nextCatalog) {
          queryClient.setQueryData(key, nextCatalog);
        }
      });

      const tempId =
        variables.mode === 'create' ? variables.optimistic.MaDanhMuc : undefined;

      return { previousCatalog, tempId };
    },
    onError: (error, _variables, context) => {
      restoreCatalogSnapshot(context?.previousCatalog);
      setMutationError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    },
    onSuccess: (result, variables, context) => {
      const snapshot = takeCatalogSnapshot();
      snapshot.forEach(([key, current]) => {
        if (!current) {
          return;
        }

        const filters = resolveFiltersFromKey(key);
        const shouldInclude = !filters || activityMatchesFilters(result, filters);

        let nextCatalog: ActivitiesCatalogResponse | undefined = current;

        if (context?.tempId) {
          nextCatalog = removeActivityCatalogEntry(nextCatalog, context.tempId);
        }

        const withoutCurrent = removeActivityCatalogEntry(nextCatalog, result.MaDanhMuc) ?? nextCatalog;
        const updated = shouldInclude ? upsertActivityCatalogEntry(withoutCurrent, result) : withoutCurrent;

        if (updated) {
          queryClient.setQueryData(key, updated);
        }
      });

      onUpdate?.({
        type: variables.mode === 'create' ? 'create' : 'update',
        activity: result,
      });

      onOpenChange(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: catalogKey });
    },
  });

  const handleSubmit = async (formValues: ActivityFormData) => {
    const { payload, optimistic } = prepareSubmission({
      formValues,
      mode,
      activity,
      activityId,
      userRole,
      unitId,
    });

    try {
      await mutation.mutateAsync({
        payload,
        optimistic,
        mode,
        activityId,
      });
    } catch (error) {
      throw error;
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isDetailLoading = activityDetailQuery.isLoading && mode === 'edit';
  const formKey = mode === 'create' ? 'create' : activityId ?? 'edit';

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
              : 'Cập nhật thông tin hoạt động'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isDetailLoading ? (
            <div className="space-y-4">
              <LoadingNotice
                message="Đang tải thông tin hoạt động..."
                align="left"
                size="sm"
              />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : displayError ? (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {displayError}
              </AlertDescription>
            </Alert>
          ) : (
            <ActivityForm
              key={formKey}
              variant="sheet"
              activity={activity}
              mode={mode}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={mutation.isPending}
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
