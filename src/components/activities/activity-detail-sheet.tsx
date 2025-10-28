'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, FlaskConical, FileText, CheckCircle, XCircle, Clock, Calendar, Info } from 'lucide-react';
import { useMemo } from 'react';

export type ActivityDetail = {
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
};

interface ActivityDetailSheetProps {
  activity: ActivityDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function getActivityStatus(activity: ActivityDetail | null) {
  if (!activity) return { label: 'Không xác định', color: 'bg-gray-100 text-gray-800', icon: Info } as const;
  const now = new Date();
  const startDate = activity.HieuLucTu ? new Date(activity.HieuLucTu) : null;
  const endDate = activity.HieuLucDen ? new Date(activity.HieuLucDen) : null;
  if (startDate && startDate > now) return { label: 'Chưa hiệu lực', color: 'bg-yellow-100 text-yellow-800', icon: Clock } as const;
  if (endDate && endDate < now) return { label: 'Hết hiệu lực', color: 'bg-red-100 text-red-800', icon: XCircle } as const;
  return { label: 'Đang hiệu lực', color: 'bg-green-100 text-green-800', icon: CheckCircle } as const;
}

export function ActivityDetailSheet({ activity, open, onOpenChange }: ActivityDetailSheetProps) {
  const Status = useMemo(() => getActivityStatus(activity), [activity]);
  const TypeIcon = activity ? activityTypeIcons[activity.LoaiHoatDong] : Info;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>Chi tiết hoạt động</SheetTitle>
          <SheetDescription>Thông tin chi tiết danh mục hoạt động</SheetDescription>
        </SheetHeader>

        {!activity ? (
          <div className="mt-6 text-gray-500">Không có dữ liệu hoạt động</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-medical-blue/10 flex items-center justify-center">
                <TypeIcon className="h-5 w-5 text-medical-blue" />
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{activity.TenDanhMuc}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{activityTypeLabels[activity.LoaiHoatDong]}</Badge>
                  <Badge variant="outline">{unitLabels[activity.DonViTinh]}</Badge>
                  <Badge className={`${Status.color} border-0 flex items-center gap-1`}>
                    <Status.icon className="h-3 w-3" /> {Status.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Conversion & Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Tỷ lệ quy đổi</div>
                <div className="text-base font-semibold">{activity.TyLeQuyDoi}x</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Giới hạn giờ</div>
                <div className="text-base">
                  {activity.GioToiThieu !== null ? `Tối thiểu: ${activity.GioToiThieu}h` : '—'}
                  {activity.GioToiDa !== null ? `, Tối đa: ${activity.GioToiDa}h` : ''}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Yêu cầu minh chứng</div>
                <div className="text-base font-medium">{activity.YeuCauMinhChung ? 'Có' : 'Không'}</div>
              </div>
            </div>

            {/* Validity */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Hiệu lực</div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Bắt đầu: {activity.HieuLucTu ? new Date(activity.HieuLucTu).toLocaleDateString('vi-VN') : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Kết thúc: {activity.HieuLucDen ? new Date(activity.HieuLucDen).toLocaleDateString('vi-VN') : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
