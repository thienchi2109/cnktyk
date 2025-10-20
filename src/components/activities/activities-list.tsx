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
  XCircle
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
}

interface ActivitiesListProps {
  userRole: string;
  onCreateActivity?: () => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activityId: string) => void;
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

// Check if user can manage activities (admin only)
const canManageActivities = (userRole: string) => {
  return userRole === 'SoYTe';
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

export function ActivitiesList({ userRole, onCreateActivity, onEditActivity, onDeleteActivity }: ActivitiesListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Fetch activities
  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/activities?${params}`);
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách hoạt động');
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page, typeFilter]);

  // Filter activities based on search and status
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.TenDanhMuc.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') {
      return matchesSearch;
    }
    
    const { status } = getActivityStatus(activity);
    return matchesSearch && status === statusFilter;
  });

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
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
        
        {canManageActivities(userRole) && onCreateActivity && (
          <GlassButton
            onClick={onCreateActivity}
            className="bg-medical-blue hover:bg-medical-blue/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm hoạt động
          </GlassButton>
        )}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
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
                  <TableHead>Loại</TableHead>
                  <TableHead>Đơn vị tính</TableHead>
                  <TableHead>Tỷ lệ quy đổi</TableHead>
                  <TableHead>Giới hạn giờ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {canManageActivities(userRole) && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => {
                  const TypeIcon = activityTypeIcons[activity.LoaiHoatDong];
                  
                  return (
                    <TableRow key={activity.MaDanhMuc}>
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
                      
                      {canManageActivities(userRole) && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {onEditActivity && (
                              <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditActivity(activity)}
                                className="text-gray-600 hover:text-medical-blue"
                              >
                                <Edit className="h-4 w-4" />
                              </GlassButton>
                            )}
                            {onDeleteActivity && (
                              <GlassButton
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteActivity(activity.MaDanhMuc)}
                                className="text-gray-600 hover:text-red-600"
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
    </div>
  );
}