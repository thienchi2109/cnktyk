"use client";

import { Loader2, Shield, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface LoadingOverlayProps {
  isVisible: boolean;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: "Xác thực thông tin", icon: Shield },
    { label: "Kiểm tra quyền truy cập", icon: CheckCircle },
    { label: "Đang chuyển hướng", icon: Loader2 }
  ];

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentStep(0);
      return;
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    // Step progression
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Loading card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl p-8">
          {/* Header with logo/icon */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30 animate-ping" style={{ animationDelay: '0.5s' }}></div>
              
              {/* Main icon */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                <Shield className="h-10 w-10 text-white animate-pulse" />
              </div>
            </div>

            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Đang đăng nhập
            </h3>
            <p className="text-slate-600 text-sm text-center">
              Vui lòng chờ trong giây lát...
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out bg-[length:200%_100%] animate-shimmer"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-xs text-slate-500">
                {Math.round(progress)}%
              </span>
              <span className="text-xs font-medium text-blue-600">
                {progress < 100 ? 'Đang xử lý' : 'Hoàn tất'}
              </span>
            </div>
          </div>

          {/* Step indicators */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-50 border border-blue-200/50' 
                      : isCompleted 
                        ? 'bg-green-50 border border-green-200/50'
                        : 'bg-slate-50 border border-slate-200/30'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/50' 
                      : isCompleted 
                        ? 'bg-green-500'
                        : 'bg-slate-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <Icon className={`h-4 w-4 text-white ${isActive ? 'animate-spin' : ''}`} />
                    )}
                  </div>
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    isActive 
                      ? 'text-blue-700' 
                      : isCompleted 
                        ? 'text-green-700'
                        : 'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Subtle footer message */}
          <div className="mt-6 pt-4 border-t border-slate-200/50">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Kết nối an toàn</span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}
