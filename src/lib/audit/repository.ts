/**
 * Audit Log Repository
 * Specialized queries for audit trail viewing and analysis
 */

import { db } from '../db/client';
import { NhatKyHeThong } from '../db/schemas';
import { AuditAction } from './logger';

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  tableName?: string;
  recordId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  searchTerm?: string;
}

export interface AuditLogWithUser extends NhatKyHeThong {
  TenDangNhap?: string;
  QuyenHan?: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLogWithUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class AuditLogRepository {
  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(
    filters: AuditLogFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedAuditLogs> {
    const offset = (page - 1) * pageSize;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (filters.userId) {
      conditions.push(`nk."MaTaiKhoan" = $${paramIndex++}`);
      params.push(filters.userId);
    }

    if (filters.action) {
      conditions.push(`nk."HanhDong" = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.tableName) {
      conditions.push(`nk."Bang" = $${paramIndex++}`);
      params.push(filters.tableName);
    }

    if (filters.recordId) {
      conditions.push(`nk."KhoaChinh" = $${paramIndex++}`);
      params.push(filters.recordId);
    }

    if (filters.startDate) {
      conditions.push(`nk."ThoiGian" >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`nk."ThoiGian" <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    if (filters.ipAddress) {
      conditions.push(`nk."DiaChiIP" = $${paramIndex++}`);
      params.push(filters.ipAddress);
    }

    if (filters.searchTerm) {
      conditions.push(`(
        nk."HanhDong" ILIKE $${paramIndex} OR
        nk."Bang" ILIKE $${paramIndex} OR
        nk."KhoaChinh" ILIKE $${paramIndex} OR
        tk."TenDangNhap" ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "NhatKyHeThong" nk
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = nk."MaTaiKhoan"
      ${whereClause}
    `;
    const countResult = await db.queryOne<{ total: string }>(countQuery, params);
    const total = parseInt(countResult?.total || '0', 10);

    // Get paginated logs
    const logsQuery = `
      SELECT 
        nk."MaNhatKy",
        nk."MaTaiKhoan",
        nk."HanhDong",
        nk."Bang",
        nk."KhoaChinh",
        nk."NoiDung",
        nk."ThoiGian",
        nk."DiaChiIP",
        tk."TenDangNhap",
        tk."QuyenHan"
      FROM "NhatKyHeThong" nk
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = nk."MaTaiKhoan"
      ${whereClause}
      ORDER BY nk."ThoiGian" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const logs = await db.query<AuditLogWithUser>(
      logsQuery, 
      [...params, pageSize, offset]
    );

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get audit logs for a specific record
   */
  static async getRecordHistory(
    tableName: string,
    recordId: string
  ): Promise<AuditLogWithUser[]> {
    const query = `
      SELECT 
        nk."MaNhatKy",
        nk."MaTaiKhoan",
        nk."HanhDong",
        nk."Bang",
        nk."KhoaChinh",
        nk."NoiDung",
        nk."ThoiGian",
        nk."DiaChiIP",
        tk."TenDangNhap",
        tk."QuyenHan"
      FROM "NhatKyHeThong" nk
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = nk."MaTaiKhoan"
      WHERE nk."Bang" = $1 AND nk."KhoaChinh" = $2
      ORDER BY nk."ThoiGian" DESC
    `;

    return db.query<AuditLogWithUser>(query, [tableName, recordId]);
  }

  /**
   * Get user activity summary
   */
  static async getUserActivitySummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalActions: number;
    actionBreakdown: Record<string, number>;
    recentActivity: AuditLogWithUser[];
  }> {
    const conditions: string[] = [`"MaTaiKhoan" = $1`];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`"ThoiGian" >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`"ThoiGian" <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total actions
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM "NhatKyHeThong"
      ${whereClause}
    `;
    const totalResult = await db.queryOne<{ total: string }>(totalQuery, params);
    const totalActions = parseInt(totalResult?.total || '0', 10);

    // Get action breakdown
    const breakdownQuery = `
      SELECT "HanhDong", COUNT(*) as count
      FROM "NhatKyHeThong"
      ${whereClause}
      GROUP BY "HanhDong"
      ORDER BY count DESC
    `;
    const breakdown = await db.query<{ HanhDong: string; count: string }>(
      breakdownQuery, 
      params
    );
    const actionBreakdown: Record<string, number> = {};
    breakdown.forEach(row => {
      actionBreakdown[row.HanhDong] = parseInt(row.count, 10);
    });

    // Get recent activity
    const recentQuery = `
      SELECT 
        nk."MaNhatKy",
        nk."MaTaiKhoan",
        nk."HanhDong",
        nk."Bang",
        nk."KhoaChinh",
        nk."NoiDung",
        nk."ThoiGian",
        nk."DiaChiIP",
        tk."TenDangNhap",
        tk."QuyenHan"
      FROM "NhatKyHeThong" nk
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = nk."MaTaiKhoan"
      ${whereClause}
      ORDER BY nk."ThoiGian" DESC
      LIMIT 10
    `;
    const recentActivity = await db.query<AuditLogWithUser>(recentQuery, params);

    return {
      totalActions,
      actionBreakdown,
      recentActivity,
    };
  }

  /**
   * Get system-wide audit statistics
   */
  static async getSystemStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalLogs: number;
    actionBreakdown: Record<string, number>;
    tableBreakdown: Record<string, number>;
    topUsers: Array<{ userId: string; username: string; actionCount: number }>;
    suspiciousActivity: AuditLogWithUser[];
  }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`"ThoiGian" >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`"ThoiGian" <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Total logs
    const totalQuery = `SELECT COUNT(*) as total FROM "NhatKyHeThong" ${whereClause}`;
    const totalResult = await db.queryOne<{ total: string }>(totalQuery, params);
    const totalLogs = parseInt(totalResult?.total || '0', 10);

    // Action breakdown
    const actionQuery = `
      SELECT "HanhDong", COUNT(*) as count
      FROM "NhatKyHeThong"
      ${whereClause}
      GROUP BY "HanhDong"
      ORDER BY count DESC
    `;
    const actions = await db.query<{ HanhDong: string; count: string }>(actionQuery, params);
    const actionBreakdown: Record<string, number> = {};
    actions.forEach(row => {
      actionBreakdown[row.HanhDong] = parseInt(row.count, 10);
    });

    // Table breakdown
    const tableQuery = `
      SELECT "Bang", COUNT(*) as count
      FROM "NhatKyHeThong"
      ${whereClause}
      AND "Bang" IS NOT NULL
      GROUP BY "Bang"
      ORDER BY count DESC
    `;
    const tables = await db.query<{ Bang: string; count: string }>(tableQuery, params);
    const tableBreakdown: Record<string, number> = {};
    tables.forEach(row => {
      tableBreakdown[row.Bang] = parseInt(row.count, 10);
    });

    // Top users
    const topUsersQuery = `
      SELECT 
        nk."MaTaiKhoan" as "userId",
        tk."TenDangNhap" as username,
        COUNT(*) as "actionCount"
      FROM "NhatKyHeThong" nk
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = nk."MaTaiKhoan"
      ${whereClause}
      AND nk."MaTaiKhoan" IS NOT NULL
      GROUP BY nk."MaTaiKhoan", tk."TenDangNhap"
      ORDER BY "actionCount" DESC
      LIMIT 10
    `;
    const topUsers = await db.query<{ userId: string; username: string; actionCount: string }>(
      topUsersQuery, 
      params
    );

    // Suspicious activity (multiple failed logins, unusual patterns)
    const suspiciousQuery = `
      SELECT 
        nk."MaNhatKy",
        nk."MaTaiKhoan",
        nk."HanhDong",
        nk."Bang",
        nk."KhoaChinh",
        nk."NoiDung",
        nk."ThoiGian",
        nk."DiaChiIP",
        tk."TenDangNhap",
        tk."QuyenHan"
      FROM "NhatKyHeThong" nk
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = nk."MaTaiKhoan"
      WHERE nk."HanhDong" = 'LOGIN'
      AND nk."NoiDung"->>'success' = 'false'
      ${conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''}
      ORDER BY nk."ThoiGian" DESC
      LIMIT 20
    `;
    const suspiciousActivity = await db.query<AuditLogWithUser>(suspiciousQuery, params);

    return {
      totalLogs,
      actionBreakdown,
      tableBreakdown,
      topUsers: topUsers.map(u => ({
        userId: u.userId,
        username: u.username,
        actionCount: parseInt(u.actionCount, 10),
      })),
      suspiciousActivity,
    };
  }

  /**
   * Verify file integrity by checking checksums
   */
  static async verifyFileIntegrity(
    recordId: string
  ): Promise<{
    isValid: boolean;
    currentChecksum?: string;
    originalChecksum?: string;
    uploadLog?: AuditLogWithUser;
  }> {
    // Get the activity record
    const activityQuery = `
      SELECT "FileMinhChungSha256", "FileMinhChungUrl"
      FROM "GhiNhanHoatDong"
      WHERE "MaGhiNhan" = $1
    `;
    const activity = await db.queryOne<{
      FileMinhChungSha256: string;
      FileMinhChungUrl: string;
    }>(activityQuery, [recordId]);

    if (!activity || !activity.FileMinhChungSha256) {
      return { isValid: false };
    }

    // Get the upload audit log
    const uploadLogQuery = `
      SELECT 
        nk."MaNhatKy",
        nk."MaTaiKhoan",
        nk."HanhDong",
        nk."Bang",
        nk."KhoaChinh",
        nk."NoiDung",
        nk."ThoiGian",
        nk."DiaChiIP",
        tk."TenDangNhap",
        tk."QuyenHan"
      FROM "NhatKyHeThong" nk
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = nk."MaTaiKhoan"
      WHERE nk."HanhDong" = 'UPLOAD'
      AND nk."KhoaChinh" = $1
      ORDER BY nk."ThoiGian" DESC
      LIMIT 1
    `;
    const uploadLog = await db.queryOne<AuditLogWithUser>(uploadLogQuery, [recordId]);

    const originalChecksum = uploadLog?.NoiDung?.checksum || activity.FileMinhChungSha256;
    const currentChecksum = activity.FileMinhChungSha256;

    return {
      isValid: originalChecksum === currentChecksum,
      currentChecksum,
      originalChecksum,
      uploadLog: uploadLog || undefined,
    };
  }
}
