"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasRole, canAccessUnit } from "./index";

// Hook to get current session with loading state
export function useAuth() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user,
    featureFlags: session?.featureFlags,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
  };
}

// Hook to require authentication (redirects if not authenticated)
export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, isLoading, router]);
  
  return { user, isLoading };
}

// Hook to require specific role
export function useRequireRole(allowedRoles: string[]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && user && !hasRole(user.role, allowedRoles)) {
      router.push("/auth/error?error=AccessDenied");
    }
  }, [user, isLoading, allowedRoles, router]);
  
  return { user, isLoading };
}

// Hook to check permissions without redirect
export function usePermissions() {
  const { user } = useAuth();
  
  const checkRole = (requiredRoles: string[]) => {
    if (!user) return false;
    return hasRole(user.role, requiredRoles);
  };
  
  const checkUnitAccess = (targetUnitId: string) => {
    if (!user) return false;
    return canAccessUnit(user.role, user.unitId, targetUnitId);
  };
  
  return {
    user,
    checkRole,
    checkUnitAccess,
    isSoYTe: user?.role === "SoYTe",
    isDonVi: user?.role === "DonVi",
    isNguoiHanhNghe: user?.role === "NguoiHanhNghe",
    isAuditor: user?.role === "Auditor",
  };
}
