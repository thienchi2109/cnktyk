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
  const spacing = variant === 'compact' ? 'space-y-2' : 'space-y-4';
  const textSize = variant === 'compact' ? 'text-sm' : 'text-base';
  const buttonSize = variant === 'compact' ? 'sm' : 'default';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          Thông tin cơ bản
        </h3>
        {showEdit && onEdit && (
          <Button onClick={onEdit} size={buttonSize} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg ${spacing}`}>
        <div>
          <label className="text-sm font-medium text-gray-600">Họ và tên</label>
          <p className={`font-semibold ${textSize === 'text-sm' ? 'text-base' : 'text-lg'}`}>
            {practitioner.HoVaTen}
          </p>
        </div>

        {practitioner.MaNhanVienNoiBo && (
          <div>
            <label className="text-sm font-medium text-gray-600">Mã nhân viên nội bộ</label>
            <p className={textSize}>{practitioner.MaNhanVienNoiBo}</p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-600">Chức danh</label>
          <p className={textSize}>
            {getCombinedTitle(practitioner.ChucDanh, practitioner.KhoaPhong)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Trạng thái làm việc</label>
          <div className="mt-1">
            {getStatusBadge(practitioner.TrangThaiLamViec)}
          </div>
        </div>
      </div>
    </div>
  );
}
