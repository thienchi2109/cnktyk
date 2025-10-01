import { redirect } from "next/navigation";
import { getCurrentSession, hasRole, canAccessUnit } from "./index";

// Server-side authentication check
export async function requireAuth() {
  const session = await getCurrentSession();
  
  if (!session || !session.user) {
    redirect("/auth/signin");
  }
  
  return session;
}

// Require specific role(s)
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  
  if (!hasRole(session.user.role, allowedRoles)) {
    redirect("/auth/error?error=AccessDenied");
  }
  
  return session;
}

// Require unit access
export async function requireUnitAccess(targetUnitId: string) {
  const session = await requireAuth();
  
  if (!canAccessUnit(session.user.role, session.user.unitId, targetUnitId)) {
    redirect("/auth/error?error=AccessDenied");
  }
  
  return session;
}

// Get current user or redirect
export async function getCurrentUser() {
  const session = await requireAuth();
  return session.user;
}

// Check if user has permission (without redirect)
export async function checkPermission(requiredRoles: string[]): Promise<boolean> {
  const session = await getCurrentSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  return hasRole(session.user.role, requiredRoles);
}

// Get user role for conditional rendering
export async function getUserRole(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.role || null;
}