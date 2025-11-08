/**
 * Centralized audit action constants for the CNKTYKLT platform
 *
 * These constants ensure consistency across the application when logging
 * audit trail entries to the NhatKyHeThong table.
 *
 * Usage:
 *   import { AUDIT_ACTIONS } from '@/types/audit-actions';
 *
 *   await nhatKyHeThongRepo.logAction(
 *     userId,
 *     AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
 *     'GhiNhanHoatDong',
 *     null,
 *     { ... metadata ... },
 *     ipAddress
 *   );
 */

export const AUDIT_ACTIONS = {
  // ============================================================================
  // Submission Actions (GhiNhanHoatDong)
  // ============================================================================

  /**
   * Individual submission created by practitioner or admin
   */
  SUBMISSION_CREATE: 'SUBMISSION_CREATE',

  /**
   * Submission updated (evidence uploaded, dates changed, etc.)
   */
  SUBMISSION_UPDATE: 'SUBMISSION_UPDATE',

  /**
   * Submission deleted
   */
  SUBMISSION_DELETE: 'SUBMISSION_DELETE',

  /**
   * Submission approved by reviewer (DonVi/SoYTe)
   */
  SUBMISSION_APPROVE: 'SUBMISSION_APPROVE',

  /**
   * Submission rejected by reviewer (DonVi/SoYTe)
   */
  SUBMISSION_REJECT: 'SUBMISSION_REJECT',

  /**
   * Bulk submission creation via cohort builder
   * Multiple submissions created at once for training enrollment
   */
  BULK_SUBMISSION_CREATE: 'BULK_SUBMISSION_CREATE',

  /**
   * Bulk approval of multiple submissions
   */
  BULK_SUBMISSION_APPROVE: 'BULK_SUBMISSION_APPROVE',

  // ============================================================================
  // Activity Catalog Actions (DanhMucHoatDong)
  // ============================================================================

  /**
   * Activity catalog entry created
   */
  ACTIVITY_CREATE: 'ACTIVITY_CREATE',

  /**
   * Activity catalog entry updated
   */
  ACTIVITY_UPDATE: 'ACTIVITY_UPDATE',

  /**
   * Activity catalog entry deleted (soft delete)
   */
  ACTIVITY_DELETE: 'ACTIVITY_DELETE',

  // ============================================================================
  // User & Authentication Actions (TaiKhoan)
  // ============================================================================

  /**
   * User successfully logged in
   */
  USER_LOGIN: 'USER_LOGIN',

  /**
   * User logged out
   */
  USER_LOGOUT: 'USER_LOGOUT',

  /**
   * New user account created
   */
  USER_CREATE: 'USER_CREATE',

  /**
   * User account updated (profile, permissions, etc.)
   */
  USER_UPDATE: 'USER_UPDATE',

  /**
   * User account deleted or deactivated
   */
  USER_DELETE: 'USER_DELETE',

  /**
   * Failed login attempt
   */
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',

  /**
   * Password changed
   */
  USER_PASSWORD_CHANGE: 'USER_PASSWORD_CHANGE',

  // ============================================================================
  // Practitioner Actions (NhanVien)
  // ============================================================================

  /**
   * Practitioner record created
   */
  PRACTITIONER_CREATE: 'PRACTITIONER_CREATE',

  /**
   * Practitioner record updated
   */
  PRACTITIONER_UPDATE: 'PRACTITIONER_UPDATE',

  /**
   * Practitioner record deleted
   */
  PRACTITIONER_DELETE: 'PRACTITIONER_DELETE',

  // ============================================================================
  // Unit Actions (DonVi)
  // ============================================================================

  /**
   * Unit/organization created
   */
  UNIT_CREATE: 'UNIT_CREATE',

  /**
   * Unit/organization updated
   */
  UNIT_UPDATE: 'UNIT_UPDATE',

  /**
   * Unit/organization deleted
   */
  UNIT_DELETE: 'UNIT_DELETE',

  // ============================================================================
  // Credit Rule Actions (QuyDinhTinChi)
  // ============================================================================

  /**
   * Credit calculation rule updated
   */
  CREDIT_RULE_UPDATE: 'CREDIT_RULE_UPDATE',

  /**
   * Credit rule created
   */
  CREDIT_RULE_CREATE: 'CREDIT_RULE_CREATE',

  /**
   * Credit rule deleted
   */
  CREDIT_RULE_DELETE: 'CREDIT_RULE_DELETE',

  // ============================================================================
  // Compliance Cycle Actions (KyCNKT)
  // ============================================================================

  /**
   * Compliance cycle created
   */
  CYCLE_CREATE: 'CYCLE_CREATE',

  /**
   * Compliance cycle updated
   */
  CYCLE_UPDATE: 'CYCLE_UPDATE',

  /**
   * Compliance cycle deleted
   */
  CYCLE_DELETE: 'CYCLE_DELETE',

  // ============================================================================
  // System Actions
  // ============================================================================

  /**
   * Database backup initiated
   */
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',

  /**
   * Database restored from backup
   */
  SYSTEM_RESTORE: 'SYSTEM_RESTORE',

  /**
   * Data imported from external source (Excel, CSV, API)
   */
  SYSTEM_IMPORT: 'SYSTEM_IMPORT',

  /**
   * Data exported (Excel, CSV, PDF)
   */
  SYSTEM_EXPORT: 'SYSTEM_EXPORT',

  /**
   * System configuration changed
   */
  SYSTEM_CONFIG_UPDATE: 'SYSTEM_CONFIG_UPDATE',

  // ============================================================================
  // Evidence/File Actions
  // ============================================================================

  /**
   * Evidence file uploaded
   */
  FILE_UPLOAD: 'FILE_UPLOAD',

  /**
   * Evidence file deleted
   */
  FILE_DELETE: 'FILE_DELETE',

  /**
   * Evidence file downloaded
   */
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',
} as const;

/**
 * Type-safe audit action type
 * Use this for type checking in TypeScript
 */
export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

/**
 * Helper to check if a string is a valid audit action
 */
export function isValidAuditAction(action: string): action is AuditAction {
  return Object.values(AUDIT_ACTIONS).includes(action as AuditAction);
}
