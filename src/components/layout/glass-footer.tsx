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
        <div className="px-4 py-6 lg:px-6">
          {children || (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>&copy; 2024 CNKTYKLT Platform. All rights reserved.</p>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                <a 
                  href="#" 
                  className="hover:text-primary transition-colors duration-200"
                >
                  Privacy Policy
                </a>
                <a 
                  href="#" 
                  className="hover:text-primary transition-colors duration-200"
                >
                  Terms of Service
                </a>
                <a 
                  href="#" 
                  className="hover:text-primary transition-colors duration-200"
                >
                  Support
                </a>
              </div>
            </div>
          )}
        </div>
      </footer>
    );
  }
);

GlassFooter.displayName = "GlassFooter";