/**
 * Practitioner Data Mapper
 * 
 * Utilities for mapping between database records and frontend types,
 * including date formatting and field transformations.
 */

import type { Practitioner, PractitionerDisplay, ImportPractitioner } from '@/types/practitioner';
import { calculateAge, parseVietnameseDate } from '@/types/practitioner';

/**
 * Map database row to Practitioner type
 * Handles date parsing and null values
 */
export function mapDbToPractitioner(row: any): Practitioner {
  return {
    MaNhanVien: row.MaNhanVien,
    HoVaTen: row.HoVaTen,
    SoCCHN: row.SoCCHN || null,
    NgayCapCCHN: row.NgayCapCCHN ? new Date(row.NgayCapCCHN) : null,
    MaDonVi: row.MaDonVi,
    TrangThaiLamViec: row.TrangThaiLamViec,
    Email: row.Email || null,
    DienThoai: row.DienThoai || null,
    ChucDanh: row.ChucDanh || null,
    // Extended fields
    MaNhanVienNoiBo: row.MaNhanVienNoiBo || null,
    NgaySinh: row.NgaySinh ? new Date(row.NgaySinh) : null,
    GioiTinh: row.GioiTinh || null,
    KhoaPhong: row.KhoaPhong || null,
    NoiCapCCHN: row.NoiCapCCHN || null,
    PhamViChuyenMon: row.PhamViChuyenMon || null,
  };
}

/**
 * Map Practitioner to display format with computed fields
 */
export function mapToDisplay(practitioner: Practitioner, additionalData?: {
  TenDonVi?: string;
  TongTinChi?: number;
  TienDoHoanThanh?: number;
}): PractitionerDisplay {
  return {
    ...practitioner,
    Tuoi: calculateAge(practitioner.NgaySinh),
    TenDonVi: additionalData?.TenDonVi,
    TongTinChi: additionalData?.TongTinChi,
    TienDoHoanThanh: additionalData?.TienDoHoanThanh,
  };
}

/**
 * Map Excel import data to database format
 * Handles date parsing and field concatenation
 */
export function mapImportToDb(importData: ImportPractitioner, unitId: string): {
  HoVaTen: string;
  SoCCHN: string;
  NgayCapCCHN: Date | null;
  MaDonVi: string;
  TrangThaiLamViec: 'DangLamViec';
  ChucDanh: string | null;
  MaNhanVienNoiBo: string | null;
  NgaySinh: Date | null;
  GioiTinh: string | null;
  KhoaPhong: string | null;
  NoiCapCCHN: string | null;
  PhamViChuyenMon: string | null;
} {
  // Concatenate ChucVu and KhoaPhong for ChucDanh field
  let chucDanh: string | null = null;
  if (importData.ChucVu && importData.KhoaPhong) {
    chucDanh = `${importData.ChucVu} - ${importData.KhoaPhong}`;
  } else if (importData.ChucVu) {
    chucDanh = importData.ChucVu;
  } else if (importData.KhoaPhong) {
    chucDanh = importData.KhoaPhong;
  }

  return {
    HoVaTen: importData.HoVaTen.trim(),
    SoCCHN: importData.SoCCHN.trim(),
    NgayCapCCHN: parseVietnameseDate(importData.NgayCap),
    MaDonVi: unitId,
    TrangThaiLamViec: 'DangLamViec',
    ChucDanh: chucDanh,
    MaNhanVienNoiBo: importData.MaNhanVienNoiBo?.trim() || null,
    NgaySinh: importData.NgaySinh ? parseVietnameseDate(importData.NgaySinh) : null,
    GioiTinh: importData.GioiTinh || null,
    KhoaPhong: importData.KhoaPhong?.trim() || null,
    NoiCapCCHN: importData.NoiCap?.trim() || null,
    PhamViChuyenMon: importData.PhamViChuyenMon?.trim() || null,
  };
}

/**
 * Serialize Practitioner for JSON response
 * Converts dates to ISO strings
 */
export function serializePractitioner(practitioner: Practitioner): any {
  return {
    ...practitioner,
    NgayCapCCHN: practitioner.NgayCapCCHN?.toISOString() || null,
    NgaySinh: practitioner.NgaySinh?.toISOString() || null,
  };
}

/**
 * Deserialize Practitioner from JSON
 * Converts ISO strings back to Date objects
 */
export function deserializePractitioner(data: any): Practitioner {
  return {
    ...data,
    NgayCapCCHN: data.NgayCapCCHN ? new Date(data.NgayCapCCHN) : null,
    NgaySinh: data.NgaySinh ? new Date(data.NgaySinh) : null,
  };
}

/**
 * Validate practitioner data before saving
 */
export function validatePractitioner(data: Partial<Practitioner>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!data.HoVaTen || data.HoVaTen.trim().length === 0) {
    errors.push('Họ và tên là bắt buộc');
  }

  if (!data.MaDonVi) {
    errors.push('Đơn vị là bắt buộc');
  }

  // CCHN validation
  if (data.SoCCHN && data.SoCCHN.trim().length === 0) {
    errors.push('Số CCHN không hợp lệ');
  }

  // Age validation
  if (data.NgaySinh) {
    const age = calculateAge(data.NgaySinh);
    if (age !== null && age < 18) {
      errors.push('Nhân viên phải đủ 18 tuổi');
    }
    if (age !== null && age > 100) {
      errors.push('Ngày sinh không hợp lệ');
    }
  }

  // Email validation
  if (data.Email && data.Email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.Email)) {
      errors.push('Email không hợp lệ');
    }
  }

  // Phone validation
  if (data.DienThoai && data.DienThoai.trim().length > 0) {
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(data.DienThoai.replace(/\s/g, ''))) {
      errors.push('Số điện thoại phải có 10-11 chữ số');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build SQL WHERE clause for practitioner filtering
 */
export function buildFilterClause(filter: {
  search?: string;
  MaDonVi?: string;
  TrangThaiLamViec?: string;
  GioiTinh?: string;
  KhoaPhong?: string;
}): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.search) {
    conditions.push(`(
      LOWER("HoVaTen") LIKE $${paramIndex} OR 
      LOWER("SoCCHN") LIKE $${paramIndex}
    )`);
    params.push(`%${filter.search.toLowerCase()}%`);
    paramIndex++;
  }

  if (filter.MaDonVi) {
    conditions.push(`"MaDonVi" = $${paramIndex}`);
    params.push(filter.MaDonVi);
    paramIndex++;
  }

  if (filter.TrangThaiLamViec) {
    conditions.push(`"TrangThaiLamViec" = $${paramIndex}`);
    params.push(filter.TrangThaiLamViec);
    paramIndex++;
  }

  if (filter.GioiTinh) {
    conditions.push(`"GioiTinh" = $${paramIndex}`);
    params.push(filter.GioiTinh);
    paramIndex++;
  }

  if (filter.KhoaPhong) {
    conditions.push(`LOWER("KhoaPhong") LIKE $${paramIndex}`);
    params.push(`%${filter.KhoaPhong.toLowerCase()}%`);
    paramIndex++;
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return { clause, params };
}
