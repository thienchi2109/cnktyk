/**
 * Shared TypeScript interfaces for practitioner detail section components
 */

/**
 * Section layout variant type
 * - compact: Space-efficient layout for sheet view
 * - full: Spacious layout for standalone page
 */
export type SectionVariant = 'compact' | 'full';

/**
 * Complete practitioner detail data structure
 */
export interface PractitionerDetailData {
  MaNhanVien: string;
  HoVaTen: string;
  ChucDanh?: string | null;
  KhoaPhong?: string | null;
  TrangThaiLamViec: 'DangLamViec' | 'TamHoan' | 'DaNghi';
  SoCCHN?: string | null;
  NgayCapCCHN?: string | Date | null;
  Email?: string | null;
  DienThoai?: string | null;
  MaNhanVienNoiBo?: string | null;
  MaDonVi: string;
}

/**
 * Compliance status data structure
 */
export interface ComplianceStatusData {
  totalCredits: number;
  requiredCredits: number;
  compliancePercentage: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

/**
 * Base props interface for all section components
 */
export interface BaseSectionProps {
  variant?: SectionVariant;
}
