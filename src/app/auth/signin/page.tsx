"use client";

import { useState } from "react";
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
  FileText
} from "lucide-react";

export default function SignInPage() {
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        
        {/* Floating Medical Elements */}
        <div className="absolute top-1/4 left-1/4 animate-float">
          <HeartPulse className="h-8 w-8 text-red-400/30" />
        </div>
        <div className="absolute top-3/4 right-1/4 animate-float-delayed">
          <Microscope className="h-6 w-6 text-blue-400/30" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 animate-float-slow">
          <Stethoscope className="h-7 w-7 text-green-400/30" />
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Panel - Information (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12">
          <div className="max-w-lg">
            {/* Logo and Branding */}
            <div className="flex items-center mb-8">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-md border border-white/30 shadow-xl">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <div className="ml-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  QUẢN LÝ CẬP NHẬT KIẾN THỨC Y KHOA LIÊN TỤC
                </h1>
                <p className="text-slate-600 font-medium">Healthcare Compliance Management</p>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="space-y-4 mb-8">
              <GlassCard className="p-4 hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Quản lý người hành nghề</h3>
                    <p className="text-sm text-slate-600">Theo dõi và quản lý hoạt động CNKTYKLT</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4 hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Báo cáo tuân thủ</h3>
                    <p className="text-sm text-slate-600">Phân tích và báo cáo chi tiết</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4 hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Hệ thống tích hợp</h3>
                    <p className="text-sm text-slate-600">Kết nối đa cấp quản lý y tế</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-slate-600">Hệ thống hoạt động</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-600">Bảo mật cao</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-md border border-white/30 shadow-xl">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                CNKTYKLT Platform
              </h1>
              <p className="text-slate-600">
                Đăng nhập để truy cập hệ thống quản lý tuân thủ
              </p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Chào mừng trở lại</h2>
              <p className="text-slate-600">Đăng nhập để tiếp tục sử dụng hệ thống</p>
            </div>

            {/* Login Form */}
            <GlassCard className="p-8 shadow-2xl border-white/40">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="TenDangNhap" className="text-slate-700 font-medium">
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
                      className="pl-10 h-12 text-base"
                      placeholder="Nhập tên đăng nhập"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="MatKhau" className="text-slate-700 font-medium">
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
                      className="pl-10 h-12 text-base"
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
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
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
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-center justify-center space-x-4 text-sm text-slate-600">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Hướng dẫn</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <div className="flex items-center space-x-1">
                    <HeartPulse className="h-4 w-4" />
                    <span>Hỗ trợ</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="text-sm text-slate-500 space-y-1">
                <p>Hệ thống quản lý tuân thủ CNKTYKLT</p>
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