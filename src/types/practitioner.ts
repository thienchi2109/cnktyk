/**
 * Practitioner (NhanVien) Type Definitions
 * 
 * These types match the database schema and are used throughout
 * the frontend application for type safety.
 */

export type GioiTinh = 'Nam' | 'Nữ' | 'Khác';
export type TrangThaiLamViec = 'DangLamViec' | 'DaNghi' | 'TamHoan';

/**
 * Complete practitioner record from database
 */
export interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  NgayCapCCHN: Date | null;
  MaDonVi: string;
  TrangThaiLamViec: TrangThaiLamViec;
  Email: string | null;
  DienThoai: string | null;
  ChucDanh: string | null;
  // Extended fields
  MaNhanVienNoiBo: string | null;
  NgaySinh: Date | null;
  GioiTinh: GioiTinh | null;
  KhoaPhong: string | null;
  NoiCapCCHN: string | null;
  PhamViChuyenMon: string | null;
}

/**
 * Practitioner data for creation (without auto-generated fields)
 */
export interface CreatePractitioner {
  HoVaTen: string;
  SoCCHN?: string | null;
  NgayCapCCHN?: Date | null;
  MaDonVi: string;
  TrangThaiLamViec?: TrangThaiLamViec;
  Email?: string | null;
  DienThoai?: string | null;
  ChucDanh?: string | null;
  // Extended fields
  MaNhanVienNoiBo?: string | null;
  NgaySinh?: Date | null;
  GioiTinh?: GioiTinh | null;
  KhoaPhong?: string | null;
  NoiCapCCHN?: string | null;
  PhamViChuyenMon?: string | null;
}

/**
 * Practitioner data for updates (all fields optional)
 */
export interface UpdatePractitioner {
  HoVaTen?: string;
  SoCCHN?: string | null;
  NgayCapCCHN?: Date | null;
  MaDonVi?: string;
  TrangThaiLamViec?: TrangThaiLamViec;
  Email?: string | null;
  DienThoai?: string | null;
  ChucDanh?: string | null;
  // Extended fields
  MaNhanVienNoiBo?: string | null;
  NgaySinh?: Date | null;
  GioiTinh?: GioiTinh | null;
  KhoaPhong?: string | null;
  NoiCapCCHN?: string | null;
  PhamViChuyenMon?: string | null;
}

/**
 * Practitioner data from Excel import
 */
export interface ImportPractitioner {
  MaNhanVienNoiBo?: string;
  HoVaTen: string;
  NgaySinh?: string; // DD/MM/YYYY format
  GioiTinh?: GioiTinh;
  KhoaPhong?: string;
  ChucVu?: string; // Maps to ChucDanh
  SoCCHN: string;
  NgayCap: string; // DD/MM/YYYY format
  NoiCap?: string;
  PhamViChuyenMon?: string;
}

/**
 * Practitioner display data with computed fields
 */
export interface PractitionerDisplay extends Practitioner {
  // Computed fields
  Tuoi?: number | null; // Age calculated from NgaySinh
  TenDonVi?: string; // Unit name (from join)
  TongTinChi?: number; // Total credits (from join)
  TienDoHoanThanh?: number; // Completion percentage
}

/**
 * Practitioner list item (minimal data for tables/lists)
 */
export interface PractitionerListItem {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  ChucDanh: string | null;
  KhoaPhong: string | null;
  TrangThaiLamViec: TrangThaiLamViec;
  Email: string | null;
  DienThoai: string | null;
}

/**
 * Practitioner filter options
 */
export interface PractitionerFilter {
  search?: string; // Search by name or CCHN
  MaDonVi?: string; // Filter by unit
  TrangThaiLamViec?: TrangThaiLamViec; // Filter by work status
  GioiTinh?: GioiTinh; // Filter by gender
  KhoaPhong?: string; // Filter by department
  tuoiMin?: number; // Minimum age
  tuoiMax?: number; // Maximum age
}

/**
 * Practitioner sort options
 */
export interface PractitionerSort {
  field: keyof Practitioner;
  direction: 'asc' | 'desc';
}

/**
 * Helper function to calculate age from date of birth
 */
export function calculateAge(ngaySinh: Date | null): number | null {
  if (!ngaySinh) return null;
  
  const today = new Date();
  const birthDate = new Date(ngaySinh);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Helper function to format date for display (DD/MM/YYYY)
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
 * Helper function to parse Vietnamese date (DD/MM/YYYY)
 */
export function parseVietnameseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

/**
 * Helper function to get gender display text
 */
export function getGenderDisplay(gioiTinh: GioiTinh | null): string {
  if (!gioiTinh) return '';
  
  const genderMap: Record<GioiTinh, string> = {
    'Nam': 'Nam',
    'Nữ': 'Nữ',
    'Khác': 'Khác'
  };
  
  return genderMap[gioiTinh];
}

/**
 * Helper function to get work status display text
 */
export function getWorkStatusDisplay(trangThai: TrangThaiLamViec): string {
  const statusMap: Record<TrangThaiLamViec, string> = {
    'DangLamViec': 'Đang làm việc',
    'DaNghi': 'Đã nghỉ',
    'TamHoan': 'Tạm hoãn'
  };
  
  return statusMap[trangThai];
}

/**
 * Helper function to get work status color
 */
export function getWorkStatusColor(trangThai: TrangThaiLamViec): string {
  const colorMap: Record<TrangThaiLamViec, string> = {
    'DangLamViec': 'text-green-600 bg-green-50',
    'DaNghi': 'text-gray-600 bg-gray-50',
    'TamHoan': 'text-amber-600 bg-amber-50'
  };
  
  return colorMap[trangThai];
}
