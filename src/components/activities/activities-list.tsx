'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useActivitiesCatalog,
  ActivityCatalogItem,
  ActivityPermissions,
  ActivitiesCatalogStatusFilter,
  ActivitiesCatalogTypeFilter,
  getActivityLifecycleStatus,
  DEFAULT_ACTIVITIES_PAGE_SIZE,
} from '@/hooks/use-activities';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityDetailSheet } from './activity-detail-sheet';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  BookOpen,
  Users,
  FlaskConical,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Globe,
  Building2,
  ArchiveRestore,
  Upload,
  UserPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ActivitiesListProps {
  userRole: string;
  unitId?: string;
  onCreateActivity?: () => void;
  onEditActivity?: (activity: ActivityCatalogItem) => void;
  onDeleteActivity?: (activityId: string) => void;
  onAdoptToGlobal?: (activityId: string) => Promise<void>;
  onRestoreActivity?: (activityId: string) => Promise<void>;
  onPermissionsLoaded?: (permissions: ActivityPermissions) => void;
}

const defaultPermissions: ActivityPermissions = {
  canCreateGlobal: false,
  canCreateUnit: false,
  canEditGlobal: false,
  canEditUnit: false,
  canAdoptToGlobal: false,
  canRestoreSoftDeleted: false,
};

const activityTypeIcons = {
  KhoaHoc: BookOpen,
  HoiThao: Users,
  NghienCuu: FlaskConical,
  BaoCao: FileText,
};

const activityTypeLabels = {
  KhoaHoc: 'Khóa học',
  HoiThao: 'Hội thảo',
  NghienCuu: 'Nghiên cứu',
  BaoCao: 'Báo cáo',
};

const unitLabels = {
  gio: 'Giờ',
  tiet: 'Tiết',
  tin_chi: 'Tín chỉ',
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// Get scope badge for activity
const getScopeBadge = (activity: ActivityCatalogItem, userRole: string) => {
  if (activity.MaDonVi === null) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-0">
        <Globe className="h-3 w-3 mr-1" />
        Hệ thống
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-purple-100 text-purple-800 border-0">
      <Building2 className="h-3 w-3 mr-1" />
      Đơn vị
    </Badge>
  );
};

const getStatusBadge = (activity: ActivityCatalogItem) => {
  const status = getActivityLifecycleStatus(activity);
  let label = 'Đang hiệu lực';
  let color = 'bg-green-100 text-green-800';
  let Icon = CheckCircle;

  if (status === 'pending') {
    label = 'Chưa hiệu lực';
    color = 'bg-yellow-100 text-yellow-800';
    Icon = Clock;
  } else if (status === 'expired') {
    label = 'Hết hiệu lực';
    color = 'bg-red-100 text-red-800';
    Icon = XCircle;
  }
  
  return (
    <Badge className={`${color} border-0`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
};

export function ActivitiesList({ 
  userRole, 
  unitId,
  onCreateActivity, 
  onEditActivity, 
  onDeleteActivity,
  onAdoptToGlobal,
  onRestoreActivity,
  onPermissionsLoaded 
}: ActivitiesListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const scopeParam = (searchParams.get('scope') as 'all' | 'global' | 'unit') ?? 'all';
  const rawType = (searchParams.get('type') as ActivitiesCatalogTypeFilter | null) ?? 'all';
  const rawStatus = (searchParams.get('status') as ActivitiesCatalogStatusFilter | null) ?? 'all';
  const searchParam = searchParams.get('search') ?? '';
  const limitParam = Number.parseInt(searchParams.get('limit') ?? DEFAULT_ACTIVITIES_PAGE_SIZE.toString(), 10);
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const normalizedLimitParam = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_ACTIVITIES_PAGE_SIZE;
  const normalizedPageParam = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [pageInput, setPageInput] = useState(normalizedPageParam.toString());
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchTerm(searchParam);
  }, [searchParam]);

  useEffect(() => {
    setPageInput(normalizedPageParam.toString());
  }, [normalizedPageParam]);

  const updateQueryParams = useCallback(
    (
      changes: Partial<Record<'scope' | 'search' | 'type' | 'status' | 'page' | 'limit', string | null>>,
      options: { resetPage?: boolean } = {}
    ) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(changes).forEach(([key, value]) => {
        if (value === null) {
          next.delete(key);
          return;
        }

        if (key === 'search') {
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            next.delete('search');
          } else {
            next.set('search', trimmed);
          }
          return;
        }

        if (key === 'type' || key === 'status') {
          if (value === 'all') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          return;
        }

        if (key === 'scope') {
          if (value === 'all') {
            next.delete('scope');
          } else {
            next.set('scope', value);
          }
          return;
        }

        next.set(key, value);
      });

      const shouldResetPage = options.resetPage ?? true;
      if (shouldResetPage && !('page' in changes)) {
        next.delete('page');
      }

      const queryString = next.toString();
      const target = queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (searchTerm === searchParam) {
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      updateQueryParams({ search: searchTerm }, { resetPage: true });
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm, searchParam, updateQueryParams]);

  const activeScope = scopeParam;
  const typeFilter = rawType ?? 'all';
  const statusFilter = rawStatus ?? 'all';

  const activitiesQuery = useActivitiesCatalog({
    scope: activeScope,
    search: searchParam,
    type: typeFilter,
    status: statusFilter,
    page: normalizedPageParam,
    limit: normalizedLimitParam,
  });
  const { data, isLoading, isError, error, isFetching } = activitiesQuery;
  const [selectedActivity, setSelectedActivity] = useState<ActivityCatalogItem | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);

  const permissions = data?.permissions ?? defaultPermissions;
  const canBulkRecord = ['DonVi', 'SoYTe'].includes(userRole);
  const showActionsColumn =
    permissions.canEditGlobal ||
    permissions.canEditUnit ||
    permissions.canAdoptToGlobal ||
    permissions.canRestoreSoftDeleted ||
    canBulkRecord;
  const globalActivities = data?.global ?? [];
  const unitActivities = data?.unit ?? [];

  const displayedActivities = useMemo(() => {
    if (activeScope === 'global') {
      return globalActivities;
    }
    if (activeScope === 'unit') {
      return unitActivities;
    }
    return [...globalActivities, ...unitActivities];
  }, [activeScope, globalActivities, unitActivities]);

  const pagination = data?.pagination;
  const currentPage = pagination?.page ?? normalizedPageParam;
  const currentLimit = pagination?.limit ?? normalizedLimitParam;
  const totalGlobal = pagination?.totalGlobal ?? globalActivities.length;
  const totalUnit = pagination?.totalUnit ?? unitActivities.length;
  const totalAll = totalGlobal + totalUnit;
  const hasFilters =
    (searchParam?.trim().length ?? 0) > 0 || typeFilter !== 'all' || statusFilter !== 'all';

  const totalItemsForScope = useMemo(() => {
    if (activeScope === 'global') {
      return totalGlobal;
    }
    if (activeScope === 'unit') {
      return totalUnit;
    }
    return totalAll;
  }, [activeScope, totalAll, totalGlobal, totalUnit]);

  const totalPagesForScope = useMemo(() => {
    const fallback = totalItemsForScope > 0 ? Math.max(1, Math.ceil(totalItemsForScope / currentLimit)) : 1;
    if (!pagination) {
      return fallback;
    }
    if (activeScope === 'global') {
      return pagination.totalPages.global || fallback;
    }
    if (activeScope === 'unit') {
      return pagination.totalPages.unit || fallback;
    }
    const combined = Math.max(
      pagination.totalPages.global ?? 0,
      pagination.totalPages.unit ?? 0,
      fallback
    );
    return combined === 0 ? 1 : combined;
  }, [activeScope, currentLimit, pagination, totalItemsForScope]);

  const lastAvailablePage = Math.max(totalPagesForScope, 1);
  const isOutOfRangePage = totalItemsForScope > 0 && currentPage > lastAvailablePage;
  const firstRowIndex = totalItemsForScope === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const lastRowIndex = totalItemsForScope === 0
    ? 0
    : Math.min(firstRowIndex + displayedActivities.length - 1, totalItemsForScope);

  useEffect(() => {
    if (data?.permissions && onPermissionsLoaded) {
      onPermissionsLoaded(data.permissions);
    }
  }, [data?.permissions, onPermissionsLoaded]);

  const handleScopeChange = (value: string) => {
    updateQueryParams({ scope: value }, { resetPage: true });
  };

  const handleTypeFilter = (value: string) => {
    updateQueryParams({ type: value }, { resetPage: true });
  };

  const handleStatusFilter = (value: string) => {
    updateQueryParams({ status: value }, { resetPage: true });
  };

  const handlePageChange = (nextPage: number) => {
    const safeTarget = Math.max(1, Math.min(nextPage, lastAvailablePage));
    updateQueryParams({ page: safeTarget.toString() }, { resetPage: false });
  };

  const handlePageSizeChange = (value: string) => {
    const numeric = Number.parseInt(value, 10);
    const safeLimit = PAGE_SIZE_OPTIONS.includes(numeric) ? numeric : normalizedLimitParam;
    updateQueryParams({ limit: safeLimit.toString(), page: '1' }, { resetPage: false });
  };

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(currentPage.toString());
      return;
    }
    handlePageChange(parsed);
  };

  // Check if user can edit this specific activity
  const canEditActivity = (activity: ActivityCatalogItem) => {
    if (activity.MaDonVi === null) {
      return permissions.canEditGlobal;
    }
    return permissions.canEditUnit;
  };

  // Check if user can delete this specific activity
  const canDeleteActivity = (activity: ActivityCatalogItem) => {
    if (activity.MaDonVi === null) {
      return permissions.canEditGlobal;
    }
    return permissions.canEditUnit;
  };

  if (isError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-700">
          {error instanceof Error ? error.message : 'Có lỗi xảy ra'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 page-title">Danh mục hoạt động</h1>
          <p className="text-gray-600 mt-1">Quản lý các loại hoạt động đào tạo liên tục</p>
        </div>
        
        {(permissions.canCreateGlobal || permissions.canCreateUnit) && onCreateActivity && (
          <Button
            onClick={onCreateActivity}
            className="gap-2"
            size="lg"
            variant="medical"
          >
            <Plus className="h-5 w-5" />
            Thêm hoạt động
          </Button>
        )}
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeScope} onValueChange={handleScopeChange} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">
              Tất cả ({totalAll})
            </TabsTrigger>
            <TabsTrigger value="global">
              <Globe className="h-4 w-4 mr-2" />
              Hệ thống ({totalGlobal})
            </TabsTrigger>
            <TabsTrigger value="unit">
              <Building2 className="h-4 w-4 mr-2" />
              Đơn vị ({totalUnit})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Filters */}
        <GlassCard className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm hoạt động..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="sm:w-48">
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Loại hoạt động" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="KhoaHoc">Khóa học</SelectItem>
                  <SelectItem value="HoiThao">Hội thảo</SelectItem>
                  <SelectItem value="NghienCuu">Nghiên cứu</SelectItem>
                  <SelectItem value="BaoCao">Báo cáo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Đang hiệu lực</SelectItem>
                  <SelectItem value="pending">Chưa hiệu lực</SelectItem>
                  <SelectItem value="expired">Hết hiệu lực</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCard>

        {/* Activities Table */}
        <TabsContent value={activeScope} className="mt-0">
          <TooltipProvider delayDuration={150}>
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/90 shadow-xl">
              {isLoading || isFetching ? (
                <div className="p-12">
                  <LoadingNotice message="Đang tải danh mục hoạt động..." />
                </div>
              ) : displayedActivities.length === 0 ? (
                isOutOfRangePage ? (
                  <div className="p-8 text-center space-y-3">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Trang {currentPage} vượt quá tổng {lastAvailablePage} trang hiện có
                    </h3>
                    <p className="text-gray-500">
                      Bộ lọc hiện tại chỉ có {lastAvailablePage} trang dữ liệu. Hãy quay lại trang hợp lệ để xem các hoạt động.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        onClick={() => handlePageChange(lastAvailablePage)}
                        disabled={lastAvailablePage === 0}
                        className="px-6"
                      >
                        Về trang {lastAvailablePage}
                      </Button>
                      <Button variant="secondary" onClick={() => handlePageChange(1)} className="px-6">
                        Về trang đầu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center space-y-3">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="text-lg font-semibold text-gray-900">Không có hoạt động nào</h3>
                    <p className="text-gray-500">
                      {hasFilters ? 'Không tìm thấy hoạt động phù hợp với bộ lọc' : 'Chưa có hoạt động nào được tạo'}
                    </p>
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <Table role="grid" className="min-w-full text-sm text-gray-700">
                    <TableHeader className="bg-gray-200/90 backdrop-blur-md sticky top-0 z-10 border-b-2 border-gray-300/50 shadow-sm">
                      <TableRow>
                        <TableHead className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">Hoạt động</TableHead>
                        <TableHead className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">Phạm vi</TableHead>
                        <TableHead className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">Loại</TableHead>
                        <TableHead className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">Đơn vị tính</TableHead>
                        <TableHead className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">Tỷ lệ quy đổi</TableHead>
                        <TableHead className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">Trạng thái</TableHead>
                        {showActionsColumn && (
                          <TableHead className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-700 w-[160px]">Thao tác</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedActivities.map((activity, index) => {
                        const TypeIcon = activityTypeIcons[activity.LoaiHoatDong];
                        const isSoftDeleted = Boolean(activity.DaXoaMem);

                        return (
                          <TableRow
                            key={activity.MaDanhMuc}
                            className={cn(
                              'cursor-pointer border-b border-slate-100/70 bg-white/40 transition-colors hover:bg-medical-blue/5 focus-within:bg-medical-blue/10',
                              index % 2 === 1 && 'bg-white/20',
                              isSoftDeleted && 'opacity-70'
                            )}
                            tabIndex={0}
                            role="button"
                            aria-label={`Xem chi tiết ${activity.TenDanhMuc}`}
                            onClick={() => {
                              setSelectedActivity(activity);
                              setShowActivityDetail(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setSelectedActivity(activity);
                                setShowActivityDetail(true);
                              }
                            }}
                          >
                            <TableCell className="align-middle">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <div className="h-11 w-11 rounded-full bg-medical-blue/10 flex items-center justify-center">
                                    <TypeIcon className="h-5 w-5 text-medical-blue" />
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-gray-900 truncate max-w-[320px]" title={activity.TenDanhMuc}>
                                      {activity.TenDanhMuc}
                                    </p>
                                    {activity.YeuCauMinhChung && (
                                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                        Minh chứng
                                      </Badge>
                                    )}
                                    {isSoftDeleted && (
                                      <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-600">
                                        Đã xóa mềm
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {activity.MaDonVi === null ? 'Hoạt động hệ thống' : 'Hoạt động của đơn vị'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              {getScopeBadge(activity, userRole)}
                            </TableCell>

                            <TableCell className="align-middle">
                              <Badge variant="outline">{activityTypeLabels[activity.LoaiHoatDong]}</Badge>
                            </TableCell>

                            <TableCell className="align-middle text-gray-700">
                              {unitLabels[activity.DonViTinh]}
                            </TableCell>

                            <TableCell className="align-middle font-semibold text-gray-900">
                              {activity.TyLeQuyDoi}x
                            </TableCell>

                            <TableCell className="align-middle">{getStatusBadge(activity)}</TableCell>

                            {showActionsColumn && (
                              <TableCell className="align-middle text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {canBulkRecord && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label="Ghi nhận hàng loạt"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/submissions/bulk?activityId=${activity.MaDanhMuc}`);
                                          }}
                                        >
                                          <UserPlus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Ghi nhận hàng loạt</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {permissions.canAdoptToGlobal && activity.MaDonVi !== null && onAdoptToGlobal && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label="Chuyển lên hệ thống"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onAdoptToGlobal(activity.MaDanhMuc);
                                          }}
                                        >
                                          <Upload className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Chuyển thành hoạt động hệ thống</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {permissions.canRestoreSoftDeleted && isSoftDeleted && onRestoreActivity && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label="Khôi phục hoạt động"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRestoreActivity(activity.MaDanhMuc);
                                          }}
                                        >
                                          <ArchiveRestore className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Khôi phục hoạt động</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canEditActivity(activity) && onEditActivity && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label="Chỉnh sửa hoạt động"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditActivity(activity);
                                          }}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Chỉnh sửa</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canDeleteActivity(activity) && onDeleteActivity && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label="Xóa hoạt động"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteActivity(activity.MaDanhMuc);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Xóa</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TooltipProvider>
        </TabsContent>
      </Tabs>

      {!isLoading && (
        <GlassCard className="p-0 border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3">
            <div className="text-sm text-gray-600">
              {totalItemsForScope === 0 ? (
                'Không có hoạt động để hiển thị'
              ) : (
                <span>
                  Hiển thị {firstRowIndex.toLocaleString('vi-VN')} - {lastRowIndex.toLocaleString('vi-VN')} trên tổng{' '}
                  {totalItemsForScope.toLocaleString('vi-VN')} hoạt động
                </span>
              )}
              {isFetching && (
                <span className="ml-2 text-xs text-blue-600 animate-pulse">Đang tải trang...</span>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Hiển thị</span>
                <Select value={currentLimit.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Kích thước" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} / trang
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Input
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={commitPageInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitPageInput();
                      }
                    }}
                    className="w-16 text-center"
                    inputMode="numeric"
                    aria-label="Trang hiện tại"
                  />
                  <span className="text-sm text-gray-500">/ {lastAvailablePage}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= lastAvailablePage}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Activity Detail Sheet */}
      <ActivityDetailSheet
        activity={selectedActivity as any}
        open={showActivityDetail}
        onOpenChange={setShowActivityDetail}
      />
    </div>
  );
}
