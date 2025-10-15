/**
 * Activity Type Definitions for Frontend
 * 
 * Maps to GhiNhanHoatDong table with extended fields from Migration 003
 */

// Approval status type
export type TrangThaiDuyet = 'ChoDuyet' | 'DaDuyet' | 'TuChoi';

// Core Activity interface
export interface Activity {
  MaGhiNhan: string;
  MaNhanVien: string;
  MaDanhMuc: string | null;
  TenHoatDong: string;
  VaiTro: string | null;
  ThoiGianBatDau: Date | null;
  ThoiGianKetThuc: Date | null;
  SoGio: number | null;
  SoTinChiQuyDoi: number;
  FileMinhChungUrl: string | null;
  FileMinhChungETag: string | null;
  FileMinhChungSha256: string | null;
  FileMinhChungSize: number | null;
  NguoiNhap: string;
  TrangThaiDuyet: TrangThaiDuyet;
  ThoiGianDuyet: Date | null;
  GhiChu: string | null;
  // Extended fields (Migration 003)
  HinhThucCapNhatKienThucYKhoa: string | null;
  ChiTietVaiTro: string | null;
  DonViToChuc: string | null;
  NgayBatDau: Date | null;
  NgayKetThuc: Date | null;
  SoTiet: number | null;
  SoGioTinChiQuyDoi: number | null;
  BangChungSoGiayChungNhan: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

// For creating new activities
export interface CreateActivity {
  MaNhanVien: string;
  MaDanhMuc?: string | null;
  TenHoatDong: string;
  VaiTro?: string | null;
  ThoiGianBatDau?: Date | null;
  ThoiGianKetThuc?: Date | null;
  SoGio?: number | null;
  SoTinChiQuyDoi: number;
  FileMinhChungUrl?: string | null;
  NguoiNhap: string;
  TrangThaiDuyet?: TrangThaiDuyet;
  GhiChu?: string | null;
  // Extended fields
  HinhThucCapNhatKienThucYKhoa?: string | null;
  ChiTietVaiTro?: string | null;
  DonViToChuc?: string | null;
  NgayBatDau?: Date | null;
  NgayKetThuc?: Date | null;
  SoTiet?: number | null;
  BangChungSoGiayChungNhan?: string | null;
}

// For updating activities
export interface UpdateActivity extends Partial<CreateActivity> {
  MaGhiNhan: string;
}

// For Excel import (Vietnamese column names)
export interface ImportActivity {
  MaNhanVien: string; // Column A: FK to Practitioners table
  TenHoatDong: string; // Column B: Activity name/course name
  HinhThucCapNhatKienThucYKhoa?: string; // Column C: Form of medical knowledge update
  ChiTietVaiTro?: string; // Column D: Detailed role
  DonViToChuc?: string; // Column E: Organizing unit
  NgayBatDau?: string; // Column F: Start date (DD/MM/YYYY)
  NgayKetThuc?: string; // Column G: End date (DD/MM/YYYY)
  SoTiet?: string; // Column H: Number of sessions (if applicable)
  SoTinChiQuyDoi?: string; // Column I: Converted credit hours (maps to existing SoTinChiQuyDoi)
  BangChungSoGiayChungNhan?: string; // Column J: Evidence/Certificate number
}

// For display with computed fields
export interface ActivityDisplay extends Activity {
  // Computed fields
  TenNhanVien?: string;
  TenDanhMuc?: string;
  TenNguoiNhap?: string;
  TrangThaiText?: string;
  TrangThaiColor?: string;
  SoNgayHoatDong?: number | null; // Duration in days
}

// Minimal data for lists
export interface ActivityListItem {
  MaGhiNhan: string;
  TenHoatDong: string;
  HinhThucCapNhatKienThucYKhoa: string | null;
  NgayBatDau: Date | null;
  NgayKetThuc: Date | null;
  TrangThaiDuyet: TrangThaiDuyet;
  CreatedAt: Date;
}

// Filter options
export interface ActivityFilter {
  MaNhanVien?: string;
  MaDanhMuc?: string;
  TrangThaiDuyet?: TrangThaiDuyet;
  HinhThucCapNhatKienThucYKhoa?: string;
  DonViToChuc?: string;
  NgayBatDauFrom?: Date;
  NgayBatDauTo?: Date;
  NgayKetThucFrom?: Date;
  NgayKetThucTo?: Date;
  search?: string;
}

// Sort options
export interface ActivitySort {
  field: keyof Activity;
  direction: 'asc' | 'desc';
}

// Helper functions

/**
 * Calculate duration in days between start and end dates
 */
export function calculateDuration(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format Vietnamese date (DD/MM/YYYY)
 */
export function formatVietnameseDate(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse Vietnamese date (DD/MM/YYYY) to Date object
 */
export function parseVietnameseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Get approval status display text
 */
export function getStatusDisplay(status: TrangThaiDuyet): string {
  const statusMap: Record<TrangThaiDuyet, string> = {
    ChoDuyet: 'Chờ duyệt',
    DaDuyet: 'Đã duyệt',
    TuChoi: 'Từ chối',
  };
  return statusMap[status] || status;
}

/**
 * Get approval status color classes
 */
export function getStatusColor(status: TrangThaiDuyet): string {
  const colorMap: Record<TrangThaiDuyet, string> = {
    ChoDuyet: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    DaDuyet: 'bg-green-100 text-green-800 border-green-300',
    TuChoi: 'bg-red-100 text-red-800 border-red-300',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Validate activity dates
 */
export function validateActivityDates(
  ngayBatDau: Date | null,
  ngayKetThuc: Date | null
): { valid: boolean; error?: string } {
  if (!ngayBatDau || !ngayKetThuc) {
    return { valid: true }; // Optional dates
  }

  if (ngayKetThuc < ngayBatDau) {
    return {
      valid: false,
      error: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    };
  }

  return { valid: true };
}

/**
 * Validate credit hours
 */
export function validateCredits(credits: number | null): { valid: boolean; error?: string } {
  if (credits === null || credits === undefined) {
    return { valid: false, error: 'Số giờ tín chỉ là bắt buộc' };
  }

  if (credits < 0) {
    return { valid: false, error: 'Số giờ tín chỉ phải lớn hơn hoặc bằng 0' };
  }

  if (credits > 999.99) {
    return { valid: false, error: 'Số giờ tín chỉ không được vượt quá 999.99' };
  }

  return { valid: true };
}

/**
 * Check if activity is editable (only pending activities can be edited)
 */
export function isActivityEditable(status: TrangThaiDuyet): boolean {
  return status === 'ChoDuyet';
}

/**
 * Check if activity can be approved/rejected
 */
export function isActivityApprovable(status: TrangThaiDuyet): boolean {
  return status === 'ChoDuyet';
}
