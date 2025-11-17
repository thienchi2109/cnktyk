/**
 * ContactInfoSection Component
 *
 * Displays practitioner's contact information including email and phone number.
 * Makes contact information clickable (mailto/tel links). Handles missing data gracefully.
 *
 * @example
 * ```tsx
 * <ContactInfoSection
 *   practitioner={data}
 *   variant="compact"
 * />
 * ```
 */

import { Building, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PractitionerDetailData, SectionVariant } from './types';

export interface ContactInfoSectionProps {
  practitioner: PractitionerDetailData;
  variant?: SectionVariant;
}

export function ContactInfoSection({
  practitioner,
  variant = 'full',
}: ContactInfoSectionProps) {
  const textSize = variant === 'compact' ? 'text-sm' : 'text-base';
  const contentPadding = variant === 'compact' ? 'p-4' : 'p-6';

  const hasContactInfo = practitioner.Email || practitioner.DienThoai;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-4">
        <Building className="w-5 h-5 text-primary" />
        <CardTitle className="text-lg">Thông tin liên hệ</CardTitle>
      </CardHeader>

      <CardContent className={`${contentPadding} space-y-4`}>
        {!hasContactInfo ? (
          <p className="text-sm text-muted-foreground">Chưa cung cấp thông tin liên hệ</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {practitioner.Email && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className={`flex items-center gap-2 ${textSize}`}>
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`mailto:${practitioner.Email}`}
                    className="text-primary hover:underline"
                  >
                    {practitioner.Email}
                  </a>
                </p>
              </div>
            )}

            {practitioner.DienThoai && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Số điện thoại</label>
                <p className={`flex items-center gap-2 ${textSize}`}>
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`tel:${practitioner.DienThoai}`}
                    className="text-primary hover:underline"
                  >
                    {practitioner.DienThoai}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
