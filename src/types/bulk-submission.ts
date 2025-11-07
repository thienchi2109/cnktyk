export type CohortSelectionMode = 'all' | 'manual';

export interface BulkCohortFilters {
  search?: string;
  trangThai?: 'DangLamViec' | 'DaNghi' | 'TamHoan' | 'all';
  chucDanh?: string;
  khoaPhong?: string;
}

export interface BulkCohortSelection {
  mode: CohortSelectionMode;
  selectedIds: string[];
  excludedIds: string[];
  filters: BulkCohortFilters;
  totalFiltered: number;
}

export interface BulkSubmissionRequest {
  MaDanhMuc: string;
  cohort: BulkCohortSelection;
  NgayBatDau?: string;
  NgayKetThuc?: string;
  DonViToChuc?: string;
}

export interface BulkSubmissionResultError {
  practitionerId: string;
  error: string;
}

export interface BulkSubmissionResponse {
  success: boolean;
  created: number;
  skipped: number;
  failed: number;
  details: {
    submissionIds: string[];
    duplicates: string[];
    errors: BulkSubmissionResultError[];
  };
  message: string;
}

export interface PractitionerWithUnit {
  MaNhanVien: string;
  MaDonVi: string;
}

export interface CohortResolutionContext {
  role: 'DonVi' | 'SoYTe';
  unitId?: string | null;
  pageSize?: number;
}

export interface CohortResolutionResult {
  practitioners: PractitionerWithUnit[];
  normalizedSelection: BulkCohortSelection;
  errors: BulkSubmissionResultError[];
}

export function isManualCohortSelection(
  selection: BulkCohortSelection,
): selection is BulkCohortSelection & { mode: 'manual' } {
  return selection.mode === 'manual';
}

export function isAllCohortSelection(
  selection: BulkCohortSelection,
): selection is BulkCohortSelection & { mode: 'all' } {
  return selection.mode === 'all';
}
