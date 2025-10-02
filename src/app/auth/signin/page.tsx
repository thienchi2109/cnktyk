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
  ShieldCheck
} from "lucide-react";
import Image from "next/image";

function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
        return;
      }

      // Get the session to determine redirect URL
      const session = await getSession();
      if (session?.user?.role) {
        const dashboardUrl = getDashboardUrl(session.user.role);
        router.push(dashboardUrl);
      } else {
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.");
    } finally {
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Softer Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
        {/* Subtle Animated Gradient Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-200/15 to-cyan-200/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-green-200/10 to-emerald-200/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-purple-200/8 to-pink-200/8 rounded-full blur-3xl animate-pulse delay-2000"></div>
        
        {/* Subtle Floating Medical Elements */}
        <div className="absolute top-1/4 left-1/4 animate-float">
          <HeartPulse className="h-8 w-8 text-red-300/20" />
        </div>
        <div className="absolute top-3/4 right-1/4 animate-float-delayed">
          <Microscope className="h-6 w-6 text-blue-300/20" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 animate-float-slow">
          <Stethoscope className="h-7 w-7 text-green-300/20" />
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex max-w-7xl mx-auto">
        {/* Left Panel - Information (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-6 xl:p-8 pr-4 xl:pr-6">
          <div className="max-w-md xl:max-w-lg">
            {/* Branding */}
            <div className="mb-6">
              <h1 className="text-2xl xl:text-3xl font-bold text-slate-800 leading-tight mb-2">
                Hệ thống Quản lý Đào tạo Nhân lực Y tế Cần Thơ (CT-HTMS)
              </h1>
              <p className="text-slate-500 font-medium text-base">Can Tho Healthcare Training Management System</p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 mb-6">
              <GlassCard className="p-3 hover:scale-[1.02] transition-all duration-300 cursor-pointer group bg-white/60 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/15 group-hover:bg-blue-500/25 transition-colors">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-base">Quản lý đào tạo</h3>
                    <p className="text-sm text-slate-500">Theo dõi và quản lý chương trình đào tạo</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-3 hover:scale-[1.02] transition-all duration-300 cursor-pointer group bg-white/60 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-green-500/15 group-hover:bg-green-500/25 transition-colors">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-base">Báo cáo tiến độ</h3>
                    <p className="text-sm text-slate-500">Phân tích và báo cáo đào tạo</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-3 hover:scale-[1.02] transition-all duration-300 cursor-pointer group bg-white/60 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/15 group-hover:bg-purple-500/25 transition-colors">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-base">Quản lý nhân lực</h3>
                    <p className="text-sm text-slate-500">Kết nối đa cấp quản lý nhân lực y tế</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-slate-500">Hệ thống hoạt động</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-500">Bảo mật cao</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-6 xl:p-8 pl-4 xl:pl-6">
          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="relative w-20 h-20 flex-shrink-0 rounded-full overflow-hidden bg-white shadow-lg border-2 border-white/50 aspect-square">
                  <Image
                    src="/logo.png"
                    alt="CT-HTMS Logo"
                    fill
                    className="object-contain p-2.5"
                  />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                CT-HTMS Platform
              </h1>
              <p className="text-slate-500 text-base">
                Đăng nhập để truy cập hệ thống quản lý đào tạo
              </p>
            </div>

            {/* Desktop Header with Logo */}
            <div className="hidden lg:block text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative w-24 h-24 flex-shrink-0 rounded-full overflow-hidden bg-white shadow-lg border-2 border-white/50 aspect-square">
                  <Image
                    src="/logo.png"
                    alt="CT-HTMS Logo"
                    fill
                    className="object-contain p-3"
                  />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Chào mừng trở lại</h2>
              <p className="text-slate-500 text-base">Đăng nhập để tiếp tục sử dụng hệ thống</p>
            </div>

            {/* Login Form */}
            <GlassCard className="p-6 shadow-xl border-white/50 bg-white/70 backdrop-blur-md">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="TenDangNhap" className="text-slate-600 font-medium text-base">
                    Tên đăng nhập
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="TenDangNhap"
                      name="TenDangNhap"
                      type="text"
                      value={formData.TenDangNhap}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      className="pl-12 h-12 text-base bg-white/80 border-slate-200/50"
                      placeholder="Nhập tên đăng nhập"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="MatKhau" className="text-slate-600 font-medium text-base">
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="MatKhau"
                      name="MatKhau"
                      type="password"
                      value={formData.MatKhau}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      className="pl-12 h-12 text-base bg-white/80 border-slate-200/50"
                      placeholder="Nhập mật khẩu"
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-50/80 backdrop-blur-sm border-red-200/50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <GlassButton
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-5 w-5" />
                      Đăng nhập hệ thống
                    </>
                  )}
                </GlassButton>
              </form>

              {/* Additional Info */}
              <div className="mt-5 pt-5 border-t border-slate-200/30">
                <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Hướng dẫn</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <div className="flex items-center space-x-1">
                    <HeartPulse className="h-4 w-4" />
                    <span>Hỗ trợ</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Development: Quick Account Selector */}
            {process.env.NODE_ENV === 'development' && (
              <GlassCard className="mt-6 p-5 shadow-lg border-amber-200/50 bg-amber-50/70 backdrop-blur-md">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-amber-800">Chế độ phát triển - Đăng nhập nhanh</h3>
                  </div>
                  <p className="text-xs text-amber-600">Nhấp để tự động điền thông tin (xóa trước khi triển khai)</p>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {/* SoYTe Account */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('soyte_admin', 'password')}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="p-2 rounded-md bg-blue-500/15 group-hover:bg-blue-500/25 transition-colors">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-blue-900">Quản trị Sở Y Tế</div>
                      <div className="text-xs text-blue-600">soyte_admin - Toàn quyền hệ thống</div>
                    </div>
                  </button>

                  {/* DonVi Account */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('benhvien_qldt', 'password')}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-green-200 bg-green-50/80 hover:bg-green-100/80 hover:border-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="p-2 rounded-md bg-green-500/15 group-hover:bg-green-500/25 transition-colors">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-green-900">Quản lý Đơn vị</div>
                      <div className="text-xs text-green-600">benhvien_qldt - Quản lý bệnh viện</div>
                    </div>
                  </button>

                  {/* NguoiHanhNghe Account */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('bacsi_nguyen', 'password')}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-purple-200 bg-purple-50/80 hover:bg-purple-100/80 hover:border-purple-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="p-2 rounded-md bg-purple-500/15 group-hover:bg-purple-500/25 transition-colors">
                      <UserCog className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-purple-900">Người hành nghề Y tế</div>
                      <div className="text-xs text-purple-600">bacsi_nguyen - Bác sĩ điều trị</div>
                    </div>
                  </button>
                </div>
                
                <div className="mt-3 pt-3 border-t border-amber-200/50">
                  <p className="text-xs text-amber-700 text-center">Tất cả mật khẩu: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-mono">password</code></p>
                </div>
              </GlassCard>
            )}

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className="text-sm text-slate-400 space-y-1">
                <p>Hệ thống Quản lý Đào tạo Nhân lực Y tế Cần Thơ</p>
                <p>Phiên bản 1.0.0 • © 2024</p>
              </div>
            </div>
          </div>
        </div>
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