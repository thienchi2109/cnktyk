/**
 * Barrel export for practitioner detail section components
 *
 * Allows clean imports:
 * import { BasicInfoSection, LicenseInfoSection } from '@/components/practitioners/practitioner-detail-sections';
 */

export { BasicInfoSection } from './basic-info-section';
export type { BasicInfoSectionProps } from './basic-info-section';

export { LicenseInfoSection } from './license-info-section';
export type { LicenseInfoSectionProps } from './license-info-section';

export { ContactInfoSection } from './contact-info-section';
export type { ContactInfoSectionProps } from './contact-info-section';

export { ComplianceStatusSection } from './compliance-status-section';
export type { ComplianceStatusSectionProps } from './compliance-status-section';

export { SubmissionsSection } from './submissions-section';
export type { SubmissionsSectionProps } from './submissions-section';

// Export shared types
export type {
  SectionVariant,
  PractitionerDetailData,
  ComplianceStatusData,
  BaseSectionProps,
} from './types';
