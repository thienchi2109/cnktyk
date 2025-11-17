/**
 * BasicInfoSection Component
 *
 * Displays practitioner's basic information including name, job title,
 * department, and work status. Supports compact and full layout variants.
 *
 * @example
 * ```tsx
 * <BasicInfoSection
 *   practitioner={data}
 *   variant="compact"
 *   showEdit={canEdit}
 *   onEdit={() => setEditMode(true)}
 * />
 * ```
 */

import { User, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PractitionerDetailData, SectionVariant } from './types';

export interface BasicInfoSectionProps {
  practitioner: PractitionerDetailData;
  variant?: SectionVariant;
  showEdit?: boolean;
  onEdit?: () => void;
}

/**
 * Get work status badge component with appropriate styling
 */
function getStatusBadge(status: 'DangLamViec' | 'TamHoan' | 'DaNghi') {
  switch (status) {
    case 'DangLamViec':
      return <Badge className="bg-green-100 text-green-800">Đang làm việc</Badge>;
    case 'TamHoan':
      return <Badge className="bg-yellow-100 text-yellow-800">Tạm hoãn</Badge>;
    case 'DaNghi':
      return <Badge className="bg-red-100 text-red-800">Đã nghỉ</Badge>;
  }
}

/**
 * Combine job title and department for display
 */
function getCombinedTitle(chucDanh?: string | null, khoaPhong?: string | null): string {
  const parts = [];
  if (chucDanh) parts.push(chucDanh);
  if (khoaPhong) parts.push(khoaPhong);
  return parts.length > 0 ? parts.join(' - ') : 'Chưa xác định';
}

export function BasicInfoSection({
  practitioner,
  variant = 'full',
  showEdit = false,
  onEdit,
}: BasicInfoSectionProps) {
  const textSize = variant === 'compact' ? 'text-sm' : 'text-base';
  const buttonSize = variant === 'compact' ? 'sm' : 'default';
  const contentPadding = variant === 'compact' ? 'p-4' : 'p-6';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
        </div>
        {showEdit && onEdit && (
          <Button onClick={onEdit} size={buttonSize} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
        )}
      </CardHeader>

      <CardContent className={`${contentPadding} grid grid-cols-1 md:grid-cols-2 gap-4`}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Họ và tên</label>
          <p className={`font-semibold ${textSize === 'text-sm' ? 'text-base' : 'text-lg'}`}>
            {practitioner.HoVaTen}
          </p>
        </div>

        {practitioner.MaNhanVienNoiBo && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Mã nhân viên nội bộ</label>
            <p className={textSize}>{practitioner.MaNhanVienNoiBo}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Chức danh</label>
          <p className={textSize}>
            {getCombinedTitle(practitioner.ChucDanh, practitioner.KhoaPhong)}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Trạng thái làm việc</label>
          <div className="mt-1">
            {getStatusBadge(practitioner.TrangThaiLamViec)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
