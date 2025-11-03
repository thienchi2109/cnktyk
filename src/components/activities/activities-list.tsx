'use client';

import { useState, useEffect } from 'react';
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
  Upload
} from 'lucide-react';

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
  MaDonVi: string | null;
  DaXoaMem?: boolean;
}

interface Permissions {
  canCreateGlobal: boolean;
  canCreateUnit: boolean;
  canEditGlobal: boolean;
  canEditUnit: boolean;
  canAdoptToGlobal: boolean;
  canRestoreSoftDeleted: boolean;
}

interface ActivitiesListProps {
  userRole: string;
  unitId?: string;
  onCreateActivity?: () => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activityId: string) => void;
  onAdoptToGlobal?: (activityId: string) => Promise<void>;
  onRestoreActivity?: (activityId: string) => Promise<void>;
}

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
const getScopeBadge = (activity: Activity, userRole: string) => {
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

// Get activity status based on validity period
const getActivityStatus = (activity: Activity) => {
  const now = new Date();
  const startDate = activity.HieuLucTu ? new Date(activity.HieuLucTu) : null;
  const endDate = activity.HieuLucDen ? new Date(activity.HieuLucDen) : null;

  if (startDate && startDate > now) {
    return { status: 'pending', label: 'Chưa hiệu lực', color: 'bg-yellow-100 text-yellow-800' };
  }
  
  if (endDate && endDate < now) {
    return { status: 'expired', label: 'Hết hiệu lực', color: 'bg-red-100 text-red-800' };
  }
  
  return { status: 'active', label: 'Đang hiệu lực', color: 'bg-green-100 text-green-800' };
};

const getStatusBadge = (activity: Activity) => {
  const { status, label, color } = getActivityStatus(activity);
  const Icon = status === 'active' ? CheckCircle : status === 'expired' ? XCircle : Clock;
  
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
  onRestoreActivity 
}: ActivitiesListProps) {
  const [globalActivities, setGlobalActivities] = useState<Activity[]>([]);
  const [unitActivities, setUnitActivities] = useState<Activity[]>([]);
  const [permissions, setPermissions] = useState<Permissions>({
    canCreateGlobal: false,
    canCreateUnit: false,
    canEditGlobal: false,
    canEditUnit: false,
    canAdoptToGlobal: false,
    canRestoreSoftDeleted: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);

  // Fetch activities with scoped API
  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        scope: 'all',
        limit: '100',
      });

      const response = await fetch(`/api/activities?${params}`);
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách hoạt động');
      }

      const data = await response.json();
      setGlobalActivities(data.global || []);
      setUnitActivities(data.unit || []);
      setPermissions(data.permissions || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Get activities based on active tab
  const getDisplayActivities = () => {
    if (activeTab === 'global') return globalActivities;
    if (activeTab === 'unit') return unitActivities;
    return [...globalActivities, ...unitActivities]; // all
  };

  // Filter activities based on search, type, and status
  const filterActivities = (activities: Activity[]) => {
    return activities.filter(activity => {
      const matchesSearch = activity.TenDanhMuc.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || activity.LoaiHoatDong === typeFilter;
      
      if (statusFilter === 'all') {
        return matchesSearch && matchesType;
      }
      
      const { status } = getActivityStatus(activity);
      return matchesSearch && matchesType && status === statusFilter;
    });
  };

  const filteredActivities = filterActivities(getDisplayActivities());

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  // Check if user can edit this specific activity
  const canEditActivity = (activity: Activity) => {
    if (activity.MaDonVi === null) {
      return permissions.canEditGlobal;
    }
    return permissions.canEditUnit;
  };

  // Check if user can delete this specific activity
  const canDeleteActivity = (activity: Activity) => {
    if (activity.MaDonVi === null) {
      return permissions.canEditGlobal;
    }
    return permissions.canEditUnit;
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-700">
          {error}
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
            className="bg-medical-blue hover:bg-medical-blue/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm hoạt động
          </GlassButton>
        )}
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">
              Tất cả ({globalActivities.length + unitActivities.length})
            </TabsTrigger>
            <TabsTrigger value="global">
              <Globe className="h-4 w-4 mr-2" />
              Hệ thống ({globalActivities.length})
            </TabsTrigger>
            <TabsTrigger value="unit">
              <Building2 className="h-4 w-4 mr-2" />
              Đơn vị ({unitActivities.length})
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
        <TabsContent value={activeTab} className="mt-0">
        <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingNotice message="Đang tải danh mục hoạt động..." />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có hoạt động nào</h3>
            <p className="text-gray-500">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
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
                {filteredActivities.map((activity) => {
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
