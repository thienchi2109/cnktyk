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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const textSize = variant === 'compact' ? 'text-sm' : 'text-base';
  const contentPadding = variant === 'compact' ? 'p-4' : 'p-6';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-4">
        <Award className="w-5 h-5 text-primary" />
        <CardTitle className="text-lg">Thông tin chứng chỉ</CardTitle>
      </CardHeader>

      <CardContent className={`${contentPadding} grid grid-cols-1 gap-4`}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Số CCHN</label>
          <p className={`font-mono ${textSize}`}>
            {practitioner.SoCCHN || 'Chưa có'}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Ngày cấp</label>
          <p className={`flex items-center gap-2 ${textSize}`}>
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {formatDate(practitioner.NgayCapCCHN)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
