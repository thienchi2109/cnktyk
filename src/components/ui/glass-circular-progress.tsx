import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface GlassCircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
}

export const GlassCircularProgress = React.forwardRef<
  SVGSVGElement,
  GlassCircularProgressProps
>(({ value, size = 120, strokeWidth = 8, className, showValue = true }, ref) => {
  // Guard against NaN/Infinity and out-of-range values
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;

  // Ensure non-negative geometry values
  const safeSize = Number.isFinite(size) && size > 0 ? size : 120;
  const safeStroke = Number.isFinite(strokeWidth) && strokeWidth >= 0 ? strokeWidth : 8;
  const radius = Math.max((safeSize - safeStroke) / 2, 0);
  const circumference = radius * 2 * Math.PI;
  const offset = circumference * (1 - safeValue / 100);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        ref={ref}
        width={safeSize}
        height={safeSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={safeStroke}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={safeStroke}
          fill="none"
          strokeDasharray={circumference || 0}
          strokeDashoffset={offset || 0}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-300 ease-in-out",
            safeValue >= 100 ? "text-green-500" :
            safeValue >= 70 ? "text-blue-500" :
            safeValue >= 50 ? "text-yellow-500" :
            "text-red-500"
          )}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(safeValue)}%
          </span>
        </div>
      )}
    </div>
  );
});

GlassCircularProgress.displayName = "GlassCircularProgress";
