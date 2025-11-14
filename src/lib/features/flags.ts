/**
 * Feature flag utilities for DonVi (Unit Admin) account management access.
 *
 * The flag is controlled via the ENABLE_DONVI_ACCOUNT_MANAGEMENT environment
 * variable. When the value is the string "true", account management remains
 * accessible for DonVi users. Any other value (including undefined) disables
 * DonVi access while keeping SoYTe access unchanged.
 */
const DONVI_ACCOUNT_MANAGEMENT_FLAG = "ENABLE_DONVI_ACCOUNT_MANAGEMENT";

const normalizeBoolean = (value?: string | null): boolean => {
  if (!value) return false;
  return value.trim().toLowerCase() === "true";
};

/**
 * Returns true when DonVi account management should be enabled.
 */
export const isDonViAccountManagementEnabled = (): boolean => {
  return normalizeBoolean(process.env[DONVI_ACCOUNT_MANAGEMENT_FLAG]);
};

/**
 * Shared bilingual messaging shown when the feature is disabled.
 */
export const DONVI_ACCOUNT_MANAGEMENT_DISABLED_MESSAGE = {
  vi: "Chức năng quản lý tài khoản tạm thời chưa khả dụng cho vai trò Quản trị viên đơn vị. Vui lòng liên hệ Sở Y Tế nếu bạn cần hỗ trợ.",
  en: "Account management functionality is temporarily unavailable for the Unit Admin role. Please contact the Department of Health if you need assistance.",
} as const;

/**
 * Describes the current runtime status of the feature flag, including the
 * computed boolean and an optional bilingual message when disabled.
 */
export const getDonViAccountManagementStatus = () => {
  const enabled = isDonViAccountManagementEnabled();

  return {
    enabled,
    message: enabled ? undefined : DONVI_ACCOUNT_MANAGEMENT_DISABLED_MESSAGE,
  };
};

export type DonViAccountManagementStatus = ReturnType<typeof getDonViAccountManagementStatus>;
