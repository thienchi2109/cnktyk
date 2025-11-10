'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useActivitiesCatalog,
  ActivityCatalogItem,
  ActivityPermissions,
  ActivitiesCatalogStatusFilter,
  ActivitiesCatalogTypeFilter,
  getActivityLifecycleStatus,
} from '@/hooks/use-activities';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityDetailSheet } from './activity-detail-sheet';
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
  UserPlus
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
  const limitParam = parseInt(searchParams.get('limit') ?? '50', 10);
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchTerm(searchParam);
  }, [searchParam]);

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
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50,
  });
  const { data, isLoading, isError, error, isFetching } = activitiesQuery;
  const [selectedActivity, setSelectedActivity] = useState<ActivityCatalogItem | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);

  const permissions = data?.permissions ?? defaultPermissions;
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
  const totalGlobal = pagination?.totalGlobal ?? globalActivities.length;
  const totalUnit = pagination?.totalUnit ?? unitActivities.length;
  const totalAll = totalGlobal + totalUnit;
  const hasFilters =
    (searchParam?.trim().length ?? 0) > 0 || typeFilter !== 'all' || statusFilter !== 'all';

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
          <h1 className="text-2xl font-bold text-gray-900">Danh mục hoạt động</h1>
          <p className="text-gray-600 mt-1">Quản lý các loại hoạt động đào tạo liên tục</p>
        </div>
        
        {(permissions.canCreateGlobal || permissions.canCreateUnit) && onCreateActivity && (
          <GlassButton
            onClick={onCreateActivity}
            className="flex items-center gap-2 rounded-full shadow-lg hover:shadow-xl transition-shadow px-6"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Thêm hoạt động
          </GlassButton>
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
        <GlassCard className="!bg-white !backdrop-blur-none !border-slate-200 shadow-lg">
        {isLoading || isFetching ? (
          <div className="p-12">
            <LoadingNotice message="Đang tải danh mục hoạt động..." />
          </div>
        ) : displayedActivities.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có hoạt động nào</h3>
            <p className="text-gray-500">
              {hasFilters
                ? 'Không tìm thấy hoạt động phù hợp với bộ lọc'
                : 'Chưa có hoạt động nào được tạo'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hoạt động</TableHead>
                  <TableHead>Phạm vi</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Đơn vị tính</TableHead>
                  <TableHead>Tỷ lệ quy đổi</TableHead>
                  <TableHead>Giới hạn giờ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {(permissions.canEditGlobal || permissions.canEditUnit) && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedActivities.map((activity) => {
                  const TypeIcon = activityTypeIcons[activity.LoaiHoatDong];
                  
                  return (
                    <TableRow
                      key={activity.MaDanhMuc}
                      className="cursor-pointer hover:bg-gray-50/30"
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
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-medical-blue/10 flex items-center justify-center">
                              <TypeIcon className="h-5 w-5 text-medical-blue" />
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{activity.TenDanhMuc}</div>
                            {activity.YeuCauMinhChung && (
                              <div className="text-sm text-gray-500">Yêu cầu minh chứng</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getScopeBadge(activity, userRole)}
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">
                          {activityTypeLabels[activity.LoaiHoatDong]}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {unitLabels[activity.DonViTinh]}
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-medium">{activity.TyLeQuyDoi}x</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {activity.GioToiThieu !== null || activity.GioToiDa !== null ? (
                            <>
                              {activity.GioToiThieu !== null && `Tối thiểu: ${activity.GioToiThieu}h`}
                              {activity.GioToiThieu !== null && activity.GioToiDa !== null && <br />}
                              {activity.GioToiDa !== null && `Tối đa: ${activity.GioToiDa}h`}
                            </>
                          ) : (
                            <span className="text-gray-500">Không giới hạn</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(activity)}
                      </TableCell>
                      
                      {(permissions.canEditGlobal || permissions.canEditUnit) && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {['DonVi', 'SoYTe'].includes(userRole) && (
                              <Link
                                href={`/submissions/bulk?activityId=${activity.MaDanhMuc}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GlassButton
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600 hover:text-blue-600"
                                  title="Ghi nhận hàng loạt"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </GlassButton>
                              </Link>
                            )}
                            {canEditActivity(activity) && onEditActivity && (
                              <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onEditActivity(activity); }}
                                className="text-gray-600 hover:text-medical-blue"
                                title="Chỉnh sửa"
                              >
                                <Edit className="h-4 w-4" />
                              </GlassButton>
                            )}
                            {permissions.canAdoptToGlobal && activity.MaDonVi !== null && onAdoptToGlobal && (
                              <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onAdoptToGlobal(activity.MaDanhMuc); }}
                                className="text-gray-600 hover:text-green-600"
                                title="Chuyển thành hoạt động hệ thống"
                              >
                                <Upload className="h-4 w-4" />
                              </GlassButton>
                            )}
                            {canDeleteActivity(activity) && onDeleteActivity && (
                              <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onDeleteActivity(activity.MaDanhMuc); }}
                                className="text-gray-600 hover:text-red-600"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </GlassButton>
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
      </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Activity Detail Sheet */}
      <ActivityDetailSheet
        activity={selectedActivity as any}
        open={showActivityDetail}
        onOpenChange={setShowActivityDetail}
      />
    </div>
  );
}
