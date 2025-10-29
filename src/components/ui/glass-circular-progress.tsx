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
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        ref={ref}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-300 ease-in-out",
            value >= 100 ? "text-green-500" :
            value >= 70 ? "text-blue-500" :
            value >= 50 ? "text-yellow-500" :
            "text-red-500"
          )}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(value)}%
          </span>
        </div>
      )}
    </div>
  );
});

GlassCircularProgress.displayName = "GlassCircularProgress";
