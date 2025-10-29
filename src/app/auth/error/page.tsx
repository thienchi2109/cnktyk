"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

const ERROR_MESSAGES = {
  Configuration: "Có lỗi cấu hình hệ thống. Vui lòng liên hệ quản trị viên.",
  AccessDenied: "Bạn không có quyền truy cập vào tài nguyên này.",
  Verification: "Có lỗi xác thực. Vui lòng thử lại.",
  Default: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
} as const;

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") as keyof typeof ERROR_MESSAGES;
  
  const errorMessage = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-100/50 backdrop-blur-sm">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lỗi xác thực
          </h1>
          <p className="text-gray-600">
            Có lỗi xảy ra trong quá trình đăng nhập
          </p>
        </div>

        <GlassCard className="p-6">
          <Alert variant="destructive" className="bg-red-50/50 backdrop-blur-sm mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {errorMessage}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/auth/signin">
                Thử đăng nhập lại
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full bg-white/50 backdrop-blur-sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Về trang chủ
              </Link>
            </Button>
          </div>
        </GlassCard>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Nếu vấn đề vẫn tiếp tục, vui lòng liên hệ quản trị viên hệ thống</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-red-500" />
            <span className="text-slate-600">Loading...</span>
          </div>
        </GlassCard>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}