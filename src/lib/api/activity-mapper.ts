/**
 * Activity Data Mapping Utilities
 * 
 * Maps between database rows, TypeScript types, and frontend display formats
 */

import type {
  Activity,
  ActivityDisplay,
  CreateActivity,
  ImportActivity,
  TrangThaiDuyet,
} from '@/types/activity';
import {
  calculateDuration,
  formatVietnameseDate,
  parseVietnameseDate,
  validateActivityDates,
  validateCredits,
} from '@/types/activity';

/**
 * Map database row to Activity type
 */
export function mapDbToActivity(row: any): Activity {
  return {
    MaGhiNhan: row.MaGhiNhan,
    MaNhanVien: row.MaNhanVien,
    MaDanhMuc: row.MaDanhMuc || null,
    TenHoatDong: row.TenHoatDong,
    VaiTro: row.VaiTro || null,
    ThoiGianBatDau: row.ThoiGianBatDau ? new Date(row.ThoiGianBatDau) : null,
    ThoiGianKetThuc: row.ThoiGianKetThuc ? new Date(row.ThoiGianKetThuc) : null,
    SoGio: row.SoGio !== null ? parseFloat(row.SoGio) : null,
    SoTinChiQuyDoi: parseFloat(row.SoTinChiQuyDoi),
    FileMinhChungUrl: row.FileMinhChungUrl || null,
    FileMinhChungETag: row.FileMinhChungETag || null,
    FileMinhChungSha256: row.FileMinhChungSha256 || null,
    FileMinhChungSize: row.FileMinhChungSize !== null ? parseInt(row.FileMinhChungSize, 10) : null,
    NguoiNhap: row.NguoiNhap,
    TrangThaiDuyet: row.TrangThaiDuyet as TrangThaiDuyet,
    ThoiGianDuyet: row.ThoiGianDuyet ? new Date(row.ThoiGianDuyet) : null,
    GhiChu: row.GhiChu || null,
    // Extended fields
    HinhThucCapNhatKienThucYKhoa: row.HinhThucCapNhatKienThucYKhoa || null,
    ChiTietVaiTro: row.ChiTietVaiTro || null,
    DonViToChuc: row.DonViToChuc || null,
    NgayBatDau: row.NgayBatDau ? new Date(row.NgayBatDau) : null,
    NgayKetThuc: row.NgayKetThuc ? new Date(row.NgayKetThuc) : null,
    SoTiet: row.SoTiet !== null ? parseFloat(row.SoTiet) : null,
    SoGioTinChiQuyDoi: row.SoGioTinChiQuyDoi !== null ? parseFloat(row.SoGioTinChiQuyDoi) : null,
    BangChungSoGiayChungNhan: row.BangChungSoGiayChungNhan || null,
    CreatedAt: new Date(row.CreatedAt),
    UpdatedAt: new Date(row.UpdatedAt),
  };
}

/**
 * Add computed fields for display
 */
export function mapToDisplay(
  activity: Activity,
  additionalData?: {
    TenNhanVien?: string;
    TenDanhMuc?: string;
    TenNguoiNhap?: string;
  }
): ActivityDisplay {
  return {
    ...activity,
    TenNhanVien: additionalData?.TenNhanVien,
    TenDanhMuc: additionalData?.TenDanhMuc,
    TenNguoiNhap: additionalData?.TenNguoiNhap,
    SoNgayHoatDong: calculateDuration(activity.NgayBatDau, activity.NgayKetThuc),
  };
}

/**
 * Map Excel import data to database format
 */
export function mapImportToDb(
  importData: ImportActivity,
  nguoiNhap: string
): Partial<CreateActivity> {
  return {
    MaNhanVien: importData.MaNhanVien,
    TenHoatDong: importData.TenHoatDong.trim(),
    HinhThucCapNhatKienThucYKhoa: importData.HinhThucCapNhatKienThucYKhoa?.trim() || null,
    ChiTietVaiTro: importData.ChiTietVaiTro?.trim() || null,
    DonViToChuc: importData.DonViToChuc?.trim() || null,
    NgayBatDau: importData.NgayBatDau ? parseVietnameseDate(importData.NgayBatDau) : null,
    NgayKetThuc: importData.NgayKetThuc ? parseVietnameseDate(importData.NgayKetThuc) : null,
    SoTiet: importData.SoTiet ? parseFloat(importData.SoTiet) : null,
    SoGioTinChiQuyDoi: importData.SoGioTinChiQuyDoi ? parseFloat(importData.SoGioTinChiQuyDoi) : null,
    BangChungSoGiayChungNhan: importData.BangChungSoGiayChungNhan?.trim() || null,
    NguoiNhap: nguoiNhap,
    TrangThaiDuyet: 'ChoDuyet',
    MaDanhMuc: null, // Custom activities from import
  };
}

/**
 * Serialize Activity for JSON response (convert Dates to ISO strings)
 */
export function serializeActivity(activity: Activity): any {
  return {
    ...activity,
    ThoiGianBatDau: activity.ThoiGianBatDau?.toISOString() || null,
    ThoiGianKetThuc: activity.ThoiGianKetThuc?.toISOString() || null,
    ThoiGianDuyet: activity.ThoiGianDuyet?.toISOString() || null,
    NgayBatDau: activity.NgayBatDau?.toISOString() || null,
    NgayKetThuc: activity.NgayKetThuc?.toISOString() || null,
    CreatedAt: activity.CreatedAt.toISOString(),
    UpdatedAt: activity.UpdatedAt.toISOString(),
  };
}

/**
 * Deserialize Activity from JSON (convert ISO strings to Dates)
 */
export function deserializeActivity(data: any): Activity {
  return {
    ...data,
    ThoiGianBatDau: data.ThoiGianBatDau ? new Date(data.ThoiGianBatDau) : null,
    ThoiGianKetThuc: data.ThoiGianKetThuc ? new Date(data.ThoiGianKetThuc) : null,
    ThoiGianDuyet: data.ThoiGianDuyet ? new Date(data.ThoiGianDuyet) : null,
    NgayBatDau: data.NgayBatDau ? new Date(data.NgayBatDau) : null,
    NgayKetThuc: data.NgayKetThuc ? new Date(data.NgayKetThuc) : null,
    CreatedAt: new Date(data.CreatedAt),
    UpdatedAt: new Date(data.UpdatedAt),
  };
}

/**
 * Validate activity data
 */
export function validateActivity(data: Partial<CreateActivity>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!data.TenHoatDong || data.TenHoatDong.trim() === '') {
    errors.push('Tên hoạt động là bắt buộc');
  }

  if (!data.MaNhanVien) {
    errors.push('Mã nhân viên là bắt buộc');
  }

  // Validate credits
  const creditValidation = validateCredits(data.SoGioTinChiQuyDoi || null);
  if (!creditValidation.valid) {
    errors.push(creditValidation.error!);
  }

  // Validate dates
  const dateValidation = validateActivityDates(data.NgayBatDau || null, data.NgayKetThuc || null);
  if (!dateValidation.valid) {
    errors.push(dateValidation.error!);
  }

  // Validate SoTiet if provided
  if (data.SoTiet !== null && data.SoTiet !== undefined) {
    if (data.SoTiet < 0) {
      errors.push('Số tiết phải lớn hơn hoặc bằng 0');
    }
    if (data.SoTiet > 999.99) {
      errors.push('Số tiết không được vượt quá 999.99');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build SQL WHERE clause for filtering activities
 */
export function buildFilterClause(filter: {
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
}): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.MaNhanVien) {
    conditions.push(`"MaNhanVien" = $${paramIndex++}`);
    params.push(filter.MaNhanVien);
  }

  if (filter.MaDanhMuc) {
    conditions.push(`"MaDanhMuc" = $${paramIndex++}`);
    params.push(filter.MaDanhMuc);
  }

  if (filter.TrangThaiDuyet) {
    conditions.push(`"TrangThaiDuyet" = $${paramIndex++}`);
    params.push(filter.TrangThaiDuyet);
  }

  if (filter.HinhThucCapNhatKienThucYKhoa) {
    conditions.push(`"HinhThucCapNhatKienThucYKhoa" ILIKE $${paramIndex++}`);
    params.push(`%${filter.HinhThucCapNhatKienThucYKhoa}%`);
  }

  if (filter.DonViToChuc) {
    conditions.push(`"DonViToChuc" ILIKE $${paramIndex++}`);
    params.push(`%${filter.DonViToChuc}%`);
  }

  if (filter.NgayBatDauFrom) {
    conditions.push(`"NgayBatDau" >= $${paramIndex++}`);
    params.push(filter.NgayBatDauFrom);
  }

  if (filter.NgayBatDauTo) {
    conditions.push(`"NgayBatDau" <= $${paramIndex++}`);
    params.push(filter.NgayBatDauTo);
  }

  if (filter.NgayKetThucFrom) {
    conditions.push(`"NgayKetThuc" >= $${paramIndex++}`);
    params.push(filter.NgayKetThucFrom);
  }

  if (filter.NgayKetThucTo) {
    conditions.push(`"NgayKetThuc" <= $${paramIndex++}`);
    params.push(filter.NgayKetThucTo);
  }

  if (filter.search) {
    conditions.push(`(
      "TenHoatDong" ILIKE $${paramIndex} OR
      "HinhThucCapNhatKienThucYKhoa" ILIKE $${paramIndex} OR
      "DonViToChuc" ILIKE $${paramIndex} OR
      "ChiTietVaiTro" ILIKE $${paramIndex}
    )`);
    params.push(`%${filter.search}%`);
    paramIndex++;
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return { clause, params };
}

/**
 * Format activity for Excel export
 */
export function formatForExport(activity: Activity): any {
  return {
    'Tên hoạt động': activity.TenHoatDong,
    'Hình thức': activity.HinhThucCapNhatKienThucYKhoa || '',
    'Chi tiết vai trò': activity.ChiTietVaiTro || '',
    'Đơn vị tổ chức': activity.DonViToChuc || '',
    'Ngày bắt đầu': activity.NgayBatDau ? formatVietnameseDate(activity.NgayBatDau) : '',
    'Ngày kết thúc': activity.NgayKetThuc ? formatVietnameseDate(activity.NgayKetThuc) : '',
    'Số tiết': activity.SoTiet || '',
    'Số giờ tín chỉ': activity.SoGioTinChiQuyDoi || '',
    'Bằng chứng': activity.BangChungSoGiayChungNhan || '',
    'Trạng thái': activity.TrangThaiDuyet,
  };
}
