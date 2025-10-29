import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface GlassFooterProps {
  className?: string;
  children?: React.ReactNode;
}

export const GlassFooter = React.forwardRef<HTMLElement, GlassFooterProps>(
  ({ className, children }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          "backdrop-blur-lg bg-white/10 border-t border-white/20 mt-auto",
          className
        )}
      >
        <div className="px-4 py-4 lg:px-6">
          {children || (
            <div className="flex items-center justify-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Phát triển bởi Phòng Tổ chức cán bộ - Sở Y tế
              </p>
            </div>
          )}
        </div>
      </footer>
    );
  }
);

GlassFooter.displayName = "GlassFooter";