"use client";

import { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Shield,
  HeartPulse,
  BookOpen,
  User,
  Lock,
  CheckCircle,
  Users,
  BarChart3,
  Building2,
  UserCog,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Stethoscope
} from "lucide-react";
import Image from "next/image";
import { LoadingOverlay } from "@/components/auth/loading-overlay";
import { cn } from "@/lib/utils";

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

      const session = await getSession();
      if (session?.user?.role) {
        const dashboardUrl = getRoleSpecificDashboard(session.user.role);
        router.replace(dashboardUrl);
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

  const handleQuickLogin = (username: string, password: string) => {
    setFormData({
      TenDangNhap: username,
      MatKhau: password,
    });
  };

  return (
    <>
      <LoadingOverlay isVisible={isLoading} />
      
      <div className="min-h-screen w-full flex overflow-hidden bg-white">
        {/* Left Panel - Form Section (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col justify-center p-8 lg:p-12 relative z-10 bg-white">
          <div className="max-w-md w-full mx-auto animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150 ease-out">
            {/* Mobile Logo (Visible only on small screens) */}
            <div className="lg:hidden mb-8 flex justify-center">
               <div className="w-16 h-16 relative">
                 <Image src="/logo.png" alt="Logo" fill className="object-contain" />
               </div>
            </div>

            {/* Header */}
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                Chào mừng trở lại
              </h1>
              <p className="text-slate-500">
                Đăng nhập vào Hệ thống Quản lý Đào tạo Y tế
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="space-y-1 group animate-in slide-in-from-bottom-2 fade-in duration-500 delay-200">
                <div className="relative">
                  <Input
                    id="TenDangNhap"
                    name="TenDangNhap"
                    type="text"
                    value={formData.TenDangNhap}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="peer h-12 pl-10 pt-4 pb-1 text-base bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all duration-200"
                    placeholder=" "
                  />
                  <Label 
                    htmlFor="TenDangNhap" 
                    className="absolute left-10 top-4 text-slate-500 text-sm transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-blue-600 cursor-text pointer-events-none"
                  >
                    Tên đăng nhập
                  </Label>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 peer-focus:text-blue-600 transition-colors duration-200" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1 group animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300">
                <div className="relative">
                  <Input
                    id="MatKhau"
                    name="MatKhau"
                    type="password"
                    value={formData.MatKhau}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="peer h-12 pl-10 pt-4 pb-1 text-base bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all duration-200"
                    placeholder=" "
                  />
                  <Label 
                    htmlFor="MatKhau" 
                    className="absolute left-10 top-4 text-slate-500 text-sm transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-blue-600 cursor-text pointer-events-none"
                  >
                    Mật khẩu
                  </Label>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 peer-focus:text-blue-600 transition-colors duration-200" />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <AlertDescription className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between animate-in fade-in duration-700 delay-400">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <div className="w-4 h-4 rounded border border-slate-300 group-hover:border-blue-400 transition-colors" />
                  <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">Ghi nhớ đăng nhập</span>
                </label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline decoration-blue-300 decoration-2 underline-offset-2 transition-all">
                  Quên mật khẩu?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl animate-in fade-in duration-700 delay-500"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đăng nhập ngay <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500 animate-in fade-in duration-700 delay-700">
               <div className="flex gap-4">
                 <a href="#" className="hover:text-blue-600 transition-colors">Điều khoản</a>
                 <a href="#" className="hover:text-blue-600 transition-colors">Bảo mật</a>
               </div>
               <div className="flex items-center gap-2">
                 <HeartPulse className="h-4 w-4 text-red-500" />
                 <span>Hỗ trợ kỹ thuật</span>
               </div>
            </div>

            {/* Development Quick Login */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000">
                <button
                  onClick={() => setShowDevAccounts(!showDevAccounts)}
                  className="w-full flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 hover:bg-amber-100 transition-colors group"
                >
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Dev Mode: Đăng nhập nhanh
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", showDevAccounts && "rotate-180")} />
                </button>
                
                <div className={cn(
                  "grid gap-2 overflow-hidden transition-all duration-300 ease-in-out",
                  showDevAccounts ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="min-h-0 grid gap-2">
                    {[
                      { role: 'Admin', user: 'admin', name: 'Sở Y Tế', icon: Building2, color: 'blue' },
                      { role: 'Unit', user: 'qldv', name: 'Quản lý Đơn vị', icon: Users, color: 'green' },
                      { role: 'User', user: 'nhanvien', name: 'Nhân viên Y tế', icon: UserCog, color: 'purple' }
                    ].map((item) => (
                      <button
                        key={item.user}
                        onClick={() => handleQuickLogin(item.user, '1234')}
                        className={`flex items-center gap-3 p-3 rounded-lg border bg-${item.color}-50 border-${item.color}-100 hover:border-${item.color}-200 hover:shadow-sm transition-all text-left group`}
                      >
                        <div className={`p-2 rounded-md bg-${item.color}-100 text-${item.color}-600 group-hover:bg-${item.color}-200 transition-colors`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                           <div className={`text-xs font-bold text-${item.color}-900`}>{item.name}</div>
                           <div className="text-[10px] text-slate-500">{item.user} • 1234</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Visual Section (60%) - Hidden on mobile */}
        <div className="hidden lg:flex lg:w-[60%] bg-slate-900 relative overflow-hidden animate-in fade-in duration-1000">
           {/* Background Gradients */}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900" />
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
           
           {/* Decorative Abstract Lines */}
           <div className="absolute inset-0 opacity-30">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="url(#grad1)" strokeWidth="0.5" />
                 <path d="M0 100 C 30 20 70 20 100 100 Z" fill="none" stroke="url(#grad1)" strokeWidth="0.5" className="animate-pulse" style={{animationDuration: '8s'}} />
                 <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                       <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                       <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                 </defs>
              </svg>
           </div>

           {/* Content Overlay */}
           <div className="absolute inset-0 flex flex-col justify-between p-16 z-20">
              {/* Logo Area */}
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center">
                    <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain brightness-0 invert" />
                 </div>
                 <div>
                    <h3 className="text-white font-bold tracking-wide text-lg">CNKTYKLT Platform</h3>
                    <p className="text-slate-400 text-xs uppercase tracking-wider">Sở Y Tế Cần Thơ</p>
                 </div>
              </div>

              {/* Main Visual Content */}
              <div className="space-y-8 max-w-2xl">
                 <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                    Nâng cao chất lượng <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                       Nhân lực Y tế
                    </span>
                 </h2>
                 <p className="text-slate-300 text-lg leading-relaxed max-w-lg">
                    Hệ thống quản lý toàn diện cho phép theo dõi, đánh giá và cấp chứng chỉ đào tạo liên tục một cách minh bạch, chính xác và hiệu quả.
                 </p>
                 
                 {/* Feature Pills */}
                 <div className="flex flex-wrap gap-3">
                    {[
                       { icon: CheckCircle, text: "Xác thực tức thì" },
                       { icon: Shield, text: "Bảo mật cấp cao" },
                       { icon: BarChart3, text: "Báo cáo Real-time" },
                       { icon: Stethoscope, text: "Chuẩn hóa Y khoa" }
                    ].map((feature, idx) => (
                       <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-white/90 text-sm hover:bg-white/10 transition-colors">
                          <feature.icon className="h-4 w-4 text-cyan-400" />
                          <span>{feature.text}</span>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Stats / Footer */}
              <div className="flex gap-12 pt-8 border-t border-white/10">
                 <div>
                    <div className="text-3xl font-bold text-white">2.8k+</div>
                    <div className="text-slate-400 text-sm mt-1">Hồ sơ nhân sự</div>
                 </div>
                 <div>
                    <div className="text-3xl font-bold text-white">156</div>
                    <div className="text-slate-400 text-sm mt-1">Chương trình đào tạo</div>
                 </div>
                 <div>
                    <div className="text-3xl font-bold text-white">99.9%</div>
                    <div className="text-slate-400 text-sm mt-1">Uptime hệ thống</div>
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-slate-500 text-sm font-medium">Đang tải giao diện...</span>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}