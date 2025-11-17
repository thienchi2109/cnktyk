/**
 * LicenseInfoSection Component
 *
 * Displays practitioner's professional license information including
 * certificate number (CCHN) and issue date. Handles missing data gracefully.
 *
 * @example
 * ```tsx
 * <LicenseInfoSection
 *   practitioner={data}
 *   variant="full"
 * />
 * ```
 */

import { Award, Calendar } from 'lucide-react';
import type { PractitionerDetailData, SectionVariant } from './types';

export interface LicenseInfoSectionProps {
  practitioner: PractitionerDetailData;
  variant?: SectionVariant;
}

/**
 * Format date for display
 */
function formatDate(date?: string | Date | null): string {
  if (!date) return 'Chưa có';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Chưa có';
  }
}

export function LicenseInfoSection({
  practitioner,
  variant = 'full',
}: LicenseInfoSectionProps) {
  const spacing = variant === 'compact' ? 'space-y-2' : 'space-y-4';
  const textSize = variant === 'compact' ? 'text-sm' : 'text-base';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Award className="w-5 h-5" />
        Thông tin chứng chỉ
      </h3>

      <div className={`grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg ${spacing}`}>
        <div>
          <label className="text-sm font-medium text-gray-600">Số CCHN</label>
          <p className={`font-mono ${textSize}`}>
            {practitioner.SoCCHN || 'Chưa có'}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Ngày cấp</label>
          <p className={`flex items-center gap-2 ${textSize}`}>
            <Calendar className="w-4 h-4 text-gray-400" />
            {formatDate(practitioner.NgayCapCCHN)}
          </p>
        </div>
      </div>
    </div>
  );
}
