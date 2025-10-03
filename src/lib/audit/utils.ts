/**
 * Audit Utility Functions
 * Helper functions for audit logging
 */

import { NextRequest } from 'next/server';

/**
 * Extract IP address from Next.js request
 */
export function getClientIP(request: NextRequest): string | undefined {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to undefined if no IP found
  return undefined;
}

/**
 * Sanitize sensitive data from audit logs
 */
export function sanitizeAuditData(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['MatKhau', 'MatKhauBam', 'password', 'token', 'secret'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Format audit log action for display
 */
export function formatAuditAction(action: string): string {
  const actionMap: Record<string, string> = {
    CREATE: 'Tạo mới',
    UPDATE: 'Cập nhật',
    DELETE: 'Xóa',
    APPROVE: 'Phê duyệt',
    REJECT: 'Từ chối',
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
    UPLOAD: 'Tải lên',
    DOWNLOAD: 'Tải xuống',
    EXPORT: 'Xuất dữ liệu',
    IMPORT: 'Nhập dữ liệu',
  };

  return actionMap[action] || action;
}

/**
 * Format table name for display
 */
export function formatTableName(tableName: string): string {
  const tableMap: Record<string, string> = {
    TaiKhoan: 'Tài khoản',
    NhanVien: 'Nhân viên',
    DonVi: 'Đơn vị',
    GhiNhanHoatDong: 'Ghi nhận hoạt động',
    DanhMucHoatDong: 'Danh mục hoạt động',
    QuyTacTinChi: 'Quy tắc tín chỉ',
    ThongBao: 'Thông báo',
    NhatKyHeThong: 'Nhật ký hệ thống',
  };

  return tableMap[tableName] || tableName;
}

/**
 * Check if an action is suspicious
 */
export function isSuspiciousActivity(
  action: string,
  userId?: string,
  ipAddress?: string,
  content?: Record<string, any>
): boolean {
  // Failed login attempts
  if (action === 'LOGIN' && content?.success === false) {
    return true;
  }

  // Multiple delete operations
  if (action === 'DELETE') {
    return true;
  }

  // Unauthorized access attempts
  if (content?.error?.includes('Unauthorized') || content?.error?.includes('Forbidden')) {
    return true;
  }

  return false;
}
