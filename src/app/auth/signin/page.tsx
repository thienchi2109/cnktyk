"use client";

import { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Shield, 
  HeartPulse, 
  Microscope, 
  Stethoscope, 
  BookOpen,
  User,
  Lock,
  CheckCircle,
  Users,
  BarChart3,
  FileText,
  Building2,
  UserCog,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import Image from "next/image";
import { LoadingOverlay } from "@/components/auth/loading-overlay";

function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDevAccounts, setShowDevAccounts] = useState(false);
  const [formData, setFormData] = useState({
    TenDangNhap: "",
    MatKhau: "",
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        TenDangNhap: formData.TenDangNhap,
        MatKhau: formData.MatKhau,
        redirect: false,
      });

      if (result?.error) {
        setError("Tên đăng nhập hoặc mật khẩu không đúng");
        setIsLoading(false);
        return;
      }

      // Get the session to determine redirect URL
      const session = await getSession();
      if (session?.user?.role) {
        const dashboardUrl = getRoleSpecificDashboard(session.user.role);
        router.replace(dashboardUrl); // use replace to avoid back-navigation to signin
      } else {
        router.replace(callbackUrl);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.");
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Development: Quick login with test accounts
  const handleQuickLogin = (username: string, password: string) => {
    setFormData({
      TenDangNhap: username,
      MatKhau: password,
    });
  };

  return (
    <>
      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} />
      
      <div className="min-h-screen relative overflow-hidden">
        {/* Simple Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20">
        {/* Clean Gradient Orbs */}
        <div className="absolute top-16 left-16 w-96 h-96 bg-gradient-to-r from-blue-300/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-16 right-16 w-[28rem] h-[28rem] bg-gradient-to-r from-green-300/12 to-emerald-300/12 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-300/10 to-indigo-300/10 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-r from-amber-300/8 to-orange-300/8 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex max-w-7xl mx-auto">
        {/* Left Panel - Information (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-8 xl:p-12 pr-6 xl:pr-8">
          <div className="max-w-lg xl:max-w-xl">
            {/* Premium Header Section */}
            <div className="mb-8">
              {/* Inline Status Badges */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/30">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 text-sm font-medium">Realtime</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200/30">
                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-700 text-sm font-medium">Verified</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/30">
                  <BarChart3 className="h-3 w-3 text-purple-600" />
                  <span className="text-purple-700 text-sm font-medium">Analytics</span>
                </div>
              </div>

              {/* Balanced, Impactful Typography */}
              <h1 className="text-3xl xl:text-4xl font-bold text-slate-800 leading-tight mb-4">
                Hệ thống Quản lý Đào tạo<br />
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-green-600 bg-clip-text text-transparent">
                  Nhân lực ngành Y tế Cần Thơ
                </span>
              </h1>
              <p className="text-slate-600 font-medium text-lg xl:text-xl leading-relaxed">
                Can Tho Healthcare Training Management System
              </p>

              {/* Quick Stats */}
              <div className="flex items-center gap-6 mt-6 text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">2,847</div>
                    <div className="text-sm text-slate-500">Người dùng</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">156</div>
                    <div className="text-sm text-slate-500">Chương trình</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">42</div>
                    <div className="text-sm text-slate-500">Đơn vị</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sophisticated Feature Cards */}
            <div className="space-y-4 mb-8">
              <GlassCard className="p-6 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer group bg-white/70 backdrop-blur-xl border-white/40 relative overflow-hidden">
                {/* Gradient Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative flex items-center space-x-4">
                  {/* Icon Badge with Gradient and Scale Animation */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 group-hover:from-blue-500/25 group-hover:to-cyan-500/25 group-hover:scale-110 transition-all duration-300 border border-blue-200/30">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg">Quản lý đào tạo</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Core</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">Theo dõi và quản lý chương trình đào tạo chuyên nghiệp</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 cursor-pointer group bg-white/70 backdrop-blur-xl border-white/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-500/15 group-hover:from-green-500/25 group-hover:to-emerald-500/25 group-hover:scale-110 transition-all duration-300 border border-green-200/30">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg">Báo cáo tiến độ</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Analytics</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">Phân tích và báo cáo đào tạo thời gian thực</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 cursor-pointer group bg-white/70 backdrop-blur-xl border-white/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 group-hover:from-purple-500/25 group-hover:to-indigo-500/25 group-hover:scale-110 transition-all duration-300 border border-purple-200/30">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg">Quản lý nhân lực</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Enterprise</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">Kết nối đa cấp quản lý nhân lực y tế toàn diện</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Enhanced Status Indicators */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-500/30"></div>
                  <span className="text-slate-600 font-medium">Hệ thống hoạt động</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-slate-600 font-medium">Bảo mật cao</span>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                Uptime: <span className="font-semibold text-green-600">99.9%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-6 xl:p-8 pl-4 xl:pl-6">
          <div className="w-full max-w-md lg:max-w-lg">


            {/* Enhanced Login Form with Logo */}
            <GlassCard className="p-6 shadow-2xl shadow-slate-900/10 border-white/60 bg-white/70 backdrop-blur-xl">
              {/* Mobile Logo and Header inside card */}
              <div className="lg:hidden text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white shadow-lg shadow-slate-900/10 border border-white/60 aspect-square backdrop-blur-sm">
                    <Image
                      src="/logo.png"
                      alt="CT-HTMS Logo"
                      fill
                      sizes="64px"
                      className="object-contain p-2"
                    />
                  </div>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                  CT-HTMS Platform
                </h1>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Đăng nhập để truy cập hệ thống quản lý đào tạo
                </p>
              </div>

              {/* Desktop Logo and Header inside card */}
              <div className="hidden lg:block text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-white shadow-lg shadow-slate-900/10 border border-white/60 aspect-square backdrop-blur-sm">
                    <Image
                      src="/logo.png"
                      alt="CT-HTMS Logo"
                      fill
                      sizes="80px"
                      className="object-contain p-2.5"
                    />
                  </div>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2 whitespace-nowrap">
                  Chào mừng trở lại
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Đăng nhập để tiếp tục sử dụng hệ thống
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="TenDangNhap" className="text-slate-700 font-semibold text-sm">
                    Tên đăng nhập
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    <Input
                      id="TenDangNhap"
                      name="TenDangNhap"
                      type="text"
                      value={formData.TenDangNhap}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      className="pl-10 h-11 text-sm bg-white/90 border-slate-200/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10 hover:border-slate-300/60 transition-all duration-200 rounded-lg"
                      placeholder="Nhập tên đăng nhập"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="MatKhau" className="text-slate-700 font-semibold text-sm">
                    Mật khẩu
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    <Input
                      id="MatKhau"
                      name="MatKhau"
                      type="password"
                      autoComplete="current-password"
                      value={formData.MatKhau}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      className="pl-10 h-11 text-sm bg-white/90 border-slate-200/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10 hover:border-slate-300/60 transition-all duration-200 rounded-lg"
                      placeholder="Nhập mật khẩu"
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-50/90 backdrop-blur-sm border-red-200/60 rounded-xl">
                    <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <GlassButton
                  type="submit"
                  variant="default"
                  size="default"
                  className="w-full h-11 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700 text-white border-0 rounded-lg hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Đăng nhập hệ thống
                    </>
                  )}
                </GlassButton>
              </form>

              {/* Additional Info */}
              <div className="mt-4 pt-4 border-t border-slate-200/30">
                <div className="flex items-center justify-center space-x-3 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-3 w-3" />
                    <span>Hướng dẫn</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <div className="flex items-center space-x-1">
                    <HeartPulse className="h-3 w-3" />
                    <span>Hỗ trợ</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Development: Collapsible Quick Account Selector */}
            {process.env.NODE_ENV === 'development' && (
              <GlassCard className="mt-4 shadow-lg border-amber-200/50 bg-amber-50/70 backdrop-blur-md overflow-hidden">
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => setShowDevAccounts(!showDevAccounts)}
                  className="w-full p-3 flex items-center justify-between hover:bg-amber-100/50 transition-colors duration-200"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                    <h3 className="text-xs font-semibold text-amber-800">Chế độ phát triển - Đăng nhập nhanh</h3>
                  </div>
                  <ChevronDown 
                    className={`h-3.5 w-3.5 text-amber-600 transition-transform duration-200 ${
                      showDevAccounts ? 'rotate-180' : ''
                    }`} 
                  />
                </button>

                {/* Collapsible Content */}
                <div className={`transition-all duration-300 ease-in-out ${
                  showDevAccounts 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                } overflow-hidden`}>
                  <div className="px-3 pb-3">
                    <p className="text-xs text-amber-600 mb-3">Nhấp để tự động điền thông tin (xóa trước khi triển khai)</p>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {/* SoYTe Account */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('admin', '1234')}
                        disabled={isLoading}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="p-1.5 rounded-md bg-blue-500/15 group-hover:bg-blue-500/25 transition-colors">
                          <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-semibold text-blue-900">Admin - Sở Y Tế</div>
                          <div className="text-[10px] text-blue-600">admin - Toàn quyền hệ thống</div>
                        </div>
                      </button>

                      {/* DonVi Account */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('qldv', '1234')}
                        disabled={isLoading}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-green-200 bg-green-50/80 hover:bg-green-100/80 hover:border-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="p-1.5 rounded-md bg-green-500/15 group-hover:bg-green-500/25 transition-colors">
                          <Users className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-semibold text-green-900">Quản lý Đơn vị</div>
                          <div className="text-[10px] text-green-600">qldv - Quản lý đơn vị</div>
                        </div>
                      </button>

                      {/* NguoiHanhNghe Account */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('nhanvien', '1234')}
                        disabled={isLoading}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-purple-200 bg-purple-50/80 hover:bg-purple-100/80 hover:border-purple-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="p-1.5 rounded-md bg-purple-500/15 group-hover:bg-purple-500/25 transition-colors">
                          <UserCog className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-semibold text-purple-900">Nhân viên Y tế</div>
                          <div className="text-[10px] text-purple-600">nhanvien - Người hành nghề</div>
                        </div>
                      </button>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-amber-200/50">
                      <p className="text-[10px] text-amber-700 text-center">Tất cả mật khẩu: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800 font-mono text-[10px]">1234</code></p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Enhanced Footer */}
            <div className="mt-6 text-center">
              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-medium">Hệ thống Quản lý Đào tạo Nhân lực Y tế Cần Thơ</p>
                <p className="text-slate-400 text-[10px]">Phiên bản 1.0.0 • © 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

function getRoleSpecificDashboard(role: string): string {
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
      return "/dashboard";
  }
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-slate-600">Loading...</span>
          </div>
        </GlassCard>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}