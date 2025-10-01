import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const progressVariants = cva(
  "relative overflow-hidden rounded-full backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-white/20 border border-white/30",
        solid: "bg-slate-200 dark:bg-slate-800"
      },
      size: {
        sm: "h-2",
        default: "h-3",
        lg: "h-4"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

interface GlassProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  showLabel?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

const colorClasses = {
  primary: "bg-gradient-to-r from-primary/60 to-primary/80",
  secondary: "bg-gradient-to-r from-secondary/60 to-secondary/80",
  success: "bg-gradient-to-r from-green-500/60 to-green-500/80",
  warning: "bg-gradient-to-r from-amber-500/60 to-amber-500/80",
  danger: "bg-gradient-to-r from-red-500/60 to-red-500/80"
};

export const GlassProgress = React.forwardRef<HTMLDivElement, GlassProgressProps>(
  ({ value, max = 100, showLabel, color = 'primary', variant, size, className, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className="w-full space-y-2">
        {showLabel && (
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        
        <div
          ref={ref}
          className={cn(progressVariants({ variant, size }), className)}
          {...props}
        >
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              colorClasses[color]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

GlassProgress.displayName = "GlassProgress";

// Circular Progress Component
interface GlassCircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}

export const GlassCircularProgress = React.forwardRef<SVGSVGElement, GlassCircularProgressProps>(
  ({ value, max = 100, size = 120, strokeWidth = 8, color = 'primary', showLabel, className }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorMap = {
      primary: '#0066CC',
      secondary: '#00A86B',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444'
    };

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
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorMap[color]}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(0, 102, 204, 0.3))'
            }}
          />
        </svg>
        
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round(percentage)}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {value}/{max}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

GlassCircularProgress.displayName = "GlassCircularProgress";