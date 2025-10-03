import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Define protected routes and their required roles
const PROTECTED_ROUTES = {
  "/dashboard": ["SoYTe", "DonVi", "NguoiHanhNghe", "Auditor"],
  "/practitioners": ["SoYTe", "DonVi", "NguoiHanhNghe"],
  "/activities": ["SoYTe", "DonVi"],
  "/submissions": ["SoYTe", "DonVi", "NguoiHanhNghe"],
  "/credits": ["SoYTe", "DonVi", "NguoiHanhNghe"],
  "/notifications": ["SoYTe", "DonVi", "NguoiHanhNghe", "Auditor"],
  "/users": ["SoYTe", "DonVi"],
  "/profile": ["SoYTe", "DonVi", "NguoiHanhNghe", "Auditor"],
  "/files": ["SoYTe", "DonVi"],
} as const;

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/auth/signin",
  "/auth/error",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/callback",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/auth/session",
  "/api/auth/error",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    nextUrl.pathname.startsWith(route)
  );

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check role-based access for protected routes
  for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES) as [string, readonly string[]][]) {
    if (nextUrl.pathname.startsWith(route)) {
      if (!userRole || !allowedRoles.includes(userRole as any)) {
        // Redirect to appropriate dashboard based on role
        const dashboardUrl = getDashboardUrl(userRole);
        return NextResponse.redirect(new URL(dashboardUrl, nextUrl.origin));
      }
    }
  }

  return NextResponse.next();
});

function getDashboardUrl(role?: string): string {
  switch (role) {
    case "SoYTe":
      return "/dashboard/doh";
    case "DonVi":
      return "/dashboard/unit-admin";
    case "NguoiHanhNghe":
      return "/dashboard/practitioner";
    case "Auditor":
      return "/dashboard";
    default:
      return "/auth/signin";
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};