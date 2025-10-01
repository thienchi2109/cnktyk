import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Helper function to get current session
export async function getCurrentSession() {
  return await auth();
}

// Helper function to check if user has required role
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

// Helper function to check if user can access unit data
export function canAccessUnit(userRole: string, userUnitId?: string, targetUnitId?: string): boolean {
  // SoYTe can access all units
  if (userRole === "SoYTe") return true;
  
  // DonVi can only access their own unit
  if (userRole === "DonVi") return userUnitId === targetUnitId;
  
  // NguoiHanhNghe can only access their own data (handled elsewhere)
  // Auditor has read-only access to all data
  if (userRole === "Auditor") return true;
  
  return false;
}

// Role hierarchy for authorization
export const ROLE_PERMISSIONS = {
  SoYTe: ["read:all", "write:all", "admin:all"],
  DonVi: ["read:unit", "write:unit", "approve:activities"],
  NguoiHanhNghe: ["read:self", "write:self", "submit:activities"],
  Auditor: ["read:all"],
} as const;

export type UserRole = keyof typeof ROLE_PERMISSIONS;
export type Permission = typeof ROLE_PERMISSIONS[UserRole][number];