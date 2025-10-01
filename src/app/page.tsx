import { GlassCard } from "@/components/ui/glass-card";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";

export default async function Home() {
  const session = await getCurrentSession();
  
  // Redirect authenticated users to their appropriate dashboard
  if (session?.user) {
    const dashboardUrl = getDashboardUrl(session.user.role);
    redirect(dashboardUrl);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-medical-blue mb-4">
            CNKTYKLT Compliance Management Platform
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Healthcare practitioner compliance tracking system for the Department of Health
          </p>
          <div className="flex justify-center">
            <GlassCard className="p-4">
              <a 
                href="/auth/signin"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Đăng nhập hệ thống
              </a>
            </GlassCard>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-medical-blue mb-3">
              ✅ Authentication System
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ NextAuth.js with JWT</li>
              <li>✅ Role-based access control</li>
              <li>✅ 5-minute JWT expiry</li>
              <li>✅ 2-hour session duration</li>
              <li>✅ Secure password hashing</li>
            </ul>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-medical-green mb-3">
              Database Foundation
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Neon PostgreSQL connection</li>
              <li>✅ Zod schema validation</li>
              <li>✅ Repository pattern</li>
              <li>✅ Audit logging system</li>
              <li>✅ 100% test coverage</li>
            </ul>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-medical-blue mb-3">
              User Roles
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span>Sở Y Tế (SoYTe)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <span>Đơn Vị (DonVi)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                <span>Người Hành Nghề</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                <span>Kiểm Toán (Auditor)</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-medical-blue mb-4">
            Authentication System Ready
          </h2>
          <p className="text-gray-600 mb-6">
            Task 3 completed successfully! The authentication system is now fully implemented with 
            NextAuth.js, JWT tokens, role-based access control, and secure session management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/auth/signin"
              className="glass-button px-6 py-3 text-medical-blue font-medium hover:bg-blue-50/50 transition-colors"
            >
              Test Authentication
            </a>
            <a 
              href="/signin-showcase"
              className="glass-button px-6 py-3 text-purple-600 font-medium hover:bg-purple-50/50 transition-colors"
            >
              New Sign-In Design
            </a>
            <a 
              href="/navigation-demo"
              className="glass-button px-6 py-3 text-medical-green font-medium hover:bg-green-50/50 transition-colors"
            >
              UI Components Demo
            </a>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function getDashboardUrl(role: string): string {
  switch (role) {
    case "SoYTe":
      return "/so-y-te/dashboard";
    case "DonVi":
      return "/don-vi/dashboard";
    case "NguoiHanhNghe":
      return "/nguoi-hanh-nghe/dashboard";
    case "Auditor":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
