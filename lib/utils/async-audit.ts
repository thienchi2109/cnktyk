/**
 * Async Audit Logging Utility
 *
 * Provides non-blocking audit log functionality to prevent audit writes
 * from blocking API responses. Audit logs are important but non-critical;
 * if they fail, the user's request should still succeed.
 *
 * Usage:
 * ```typescript
 * import { asyncAuditLog } from '@/lib/utils/async-audit';
 *
 * // Fire and forget - returns immediately
 * asyncAuditLog(auditRepo, {
 *   MaTaiKhoan: session.user.id,
 *   HanhDong: 'VIEW_REPORT',
 *   Bang: 'Reports',
 *   KhoaChinh: 'compliance',
 *   NoiDung: { reportType: 'compliance' },
 *   DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
 * });
 *
 * // Continue processing without waiting
 * return NextResponse.json(data);
 * ```
 */

import { NhatKyHeThongRepository } from '@/lib/db/repositories';
import type { CreateNhatKyHeThong } from '@/lib/db/schemas';

/**
 * Writes an audit log entry asynchronously without blocking the caller.
 *
 * This function initiates the audit log write and returns immediately,
 * allowing the API response to be sent without waiting for the database
 * write to complete. If the audit log write fails, an error is logged
 * to the console for monitoring, but the failure does not impact the
 * user's request.
 *
 * @param repository - NhatKyHeThongRepository instance
 * @param data - Audit log data to write
 *
 * @example
 * ```typescript
 * const auditRepo = new NhatKyHeThongRepository();
 *
 * asyncAuditLog(auditRepo, {
 *   MaTaiKhoan: session.user.id,
 *   HanhDong: 'VIEW_REPORT',
 *   Bang: 'Reports',
 *   KhoaChinh: 'performance-summary',
 *   NoiDung: {
 *     reportType: 'performance-summary',
 *     unitId: unitId,
 *   },
 *   DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
 * });
 * ```
 */
export function asyncAuditLog(
  repository: NhatKyHeThongRepository,
  data: CreateNhatKyHeThong
): void {
  // Fire and forget - don't await the promise
  repository
    .create(data)
    .catch((error) => {
      // Log error for monitoring but don't throw
      console.error('[Async Audit Log Failed]', {
        action: data.HanhDong,
        table: data.Bang,
        key: data.KhoaChinh,
        userId: data.MaTaiKhoan,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // TODO: Consider integrating with error tracking service (Sentry, etc.)
      // This would allow monitoring audit log failure rates in production
    });

  // Function returns immediately without waiting for DB write
}

/**
 * Helper function to create audit log data for report views.
 * Standardizes the audit log format for all report types.
 *
 * @param userId - User ID (MaTaiKhoan)
 * @param reportType - Type of report being viewed
 * @param filters - Report filters applied
 * @param ipAddress - Client IP address
 * @returns Formatted audit log data
 *
 * @example
 * ```typescript
 * const auditData = createReportAuditData(
 *   session.user.id,
 *   'compliance',
 *   { startDate: '2025-01-01', endDate: '2025-01-31' },
 *   request.headers.get('x-forwarded-for') || 'unknown'
 * );
 *
 * asyncAuditLog(auditRepo, auditData);
 * ```
 */
export function createReportAuditData(
  userId: string,
  reportType: 'performance-summary' | 'compliance' | 'activities' | 'practitioner-details',
  filters: Record<string, unknown>,
  ipAddress: string
): CreateNhatKyHeThong {
  return {
    MaTaiKhoan: userId,
    HanhDong: 'VIEW_REPORT',
    Bang: 'Reports',
    KhoaChinh: reportType,
    NoiDung: {
      reportType,
      filters,
      timestamp: new Date().toISOString(),
    },
    DiaChiIP: ipAddress,
  };
}

/**
 * Synchronous audit log function (legacy compatibility).
 *
 * Use this only when you need to wait for the audit log to complete
 * (e.g., in critical security operations). For report viewing and
 * other non-critical operations, prefer asyncAuditLog().
 *
 * @param repository - NhatKyHeThongRepository instance
 * @param data - Audit log data to write
 * @returns Promise that resolves when audit log is written
 */
export async function syncAuditLog(
  repository: NhatKyHeThongRepository,
  data: CreateNhatKyHeThong
): Promise<void> {
  try {
    await repository.create(data);
  } catch (error) {
    console.error('[Sync Audit Log Failed]', {
      action: data.HanhDong,
      table: data.Bang,
      key: data.KhoaChinh,
      userId: data.MaTaiKhoan,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    // Re-throw for sync operations where audit failure should block
    throw error;
  }
}
