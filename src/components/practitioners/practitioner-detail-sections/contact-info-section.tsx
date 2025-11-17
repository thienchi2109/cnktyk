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
import type { PractitionerDetailData, SectionVariant } from './types';

export interface ContactInfoSectionProps {
  practitioner: PractitionerDetailData;
  variant?: SectionVariant;
}

export function ContactInfoSection({
  practitioner,
  variant = 'full',
}: ContactInfoSectionProps) {
  const spacing = variant === 'compact' ? 'space-y-2' : 'space-y-4';
  const textSize = variant === 'compact' ? 'text-sm' : 'text-base';

  const hasContactInfo = practitioner.Email || practitioner.DienThoai;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Building className="w-5 h-5" />
        Thông tin liên hệ
      </h3>

      <div className={`grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg ${spacing}`}>
        {!hasContactInfo ? (
          <p className="text-gray-500 text-sm">Chưa cung cấp thông tin liên hệ</p>
        ) : (
          <>
            {practitioner.Email && (
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className={`flex items-center gap-2 ${textSize}`}>
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a
                    href={`mailto:${practitioner.Email}`}
                    className="text-medical-blue hover:underline"
                  >
                    {practitioner.Email}
                  </a>
                </p>
              </div>
            )}

            {practitioner.DienThoai && (
              <div>
                <label className="text-sm font-medium text-gray-600">Số điện thoại</label>
                <p className={`flex items-center gap-2 ${textSize}`}>
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${practitioner.DienThoai}`}
                    className="text-medical-blue hover:underline"
                  >
                    {practitioner.DienThoai}
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
