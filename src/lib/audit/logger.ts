/**
 * Audit Logging Utility
 * Provides comprehensive audit trail for all data modifications
 */

import { db } from '../db/client';
import { CreateNhatKyHeThong } from '../db/schemas';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'EXPORT'
  | 'IMPORT';

export interface AuditLogEntry {
  maTaiKhoan?: string;
  hanhDong: AuditAction;
  bang?: string;
  khoaChinh?: string;
  noiDung?: Record<string, any>;
  diaChiIP?: string;
}

export class AuditLogger {
  /**
   * Log an audit entry
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const auditData: CreateNhatKyHeThong = {
        MaTaiKhoan: entry.maTaiKhoan || null,
        HanhDong: entry.hanhDong,
        Bang: entry.bang || null,
        KhoaChinh: entry.khoaChinh || null,
        NoiDung: entry.noiDung || null,
        DiaChiIP: entry.diaChiIP || null,
      };

      await db.insert('NhatKyHeThong', auditData);
    } catch (error) {
      // Log to console but don't throw - audit logging should not break app flow
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Log a CREATE action
   */
  static async logCreate(
    tableName: string,
    recordId: string,
    data: Record<string, any>,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: 'CREATE',
      bang: tableName,
      khoaChinh: recordId,
      noiDung: { created: data },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log an UPDATE action with before/after values
   */
  static async logUpdate(
    tableName: string,
    recordId: string,
    before: Record<string, any>,
    after: Record<string, any>,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    // Only log changed fields
    const changes: Record<string, { before: any; after: any }> = {};
    
    for (const key in after) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = {
          before: before[key],
          after: after[key],
        };
      }
    }

    await this.log({
      maTaiKhoan: userId,
      hanhDong: 'UPDATE',
      bang: tableName,
      khoaChinh: recordId,
      noiDung: { changes },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log a DELETE action
   */
  static async logDelete(
    tableName: string,
    recordId: string,
    data: Record<string, any>,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: 'DELETE',
      bang: tableName,
      khoaChinh: recordId,
      noiDung: { deleted: data },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log an APPROVE action
   */
  static async logApprove(
    recordId: string,
    approverComment?: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: 'APPROVE',
      bang: 'GhiNhanHoatDong',
      khoaChinh: recordId,
      noiDung: { comment: approverComment },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log a REJECT action
   */
  static async logReject(
    recordId: string,
    rejectionReason: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: 'REJECT',
      bang: 'GhiNhanHoatDong',
      khoaChinh: recordId,
      noiDung: { reason: rejectionReason },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log authentication events
   */
  static async logAuth(
    action: 'LOGIN' | 'LOGOUT',
    userId: string,
    success: boolean,
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: action,
      noiDung: { success, ...details },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log file operations
   */
  static async logFileOperation(
    action: 'UPLOAD' | 'DOWNLOAD',
    fileName: string,
    fileSize: number,
    checksum: string,
    userId?: string,
    ipAddress?: string,
    relatedRecordId?: string
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: action,
      bang: 'GhiNhanHoatDong',
      khoaChinh: relatedRecordId,
      noiDung: {
        fileName,
        fileSize,
        checksum,
        timestamp: new Date().toISOString(),
      },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log data export operations
   */
  static async logExport(
    exportType: string,
    filters: Record<string, any>,
    recordCount: number,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: 'EXPORT',
      noiDung: {
        exportType,
        filters,
        recordCount,
        timestamp: new Date().toISOString(),
      },
      diaChiIP: ipAddress,
    });
  }

  /**
   * Log bulk import operations
   */
  static async logImport(
    importType: string,
    recordCount: number,
    successCount: number,
    errorCount: number,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      maTaiKhoan: userId,
      hanhDong: 'IMPORT',
      noiDung: {
        importType,
        recordCount,
        successCount,
        errorCount,
        timestamp: new Date().toISOString(),
      },
      diaChiIP: ipAddress,
    });
  }
}
