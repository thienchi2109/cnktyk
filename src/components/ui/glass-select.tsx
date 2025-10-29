import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const selectVariants = cva(
  "flex w-full items-center justify-between rounded-lg text-sm transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "backdrop-blur-md bg-white/20 border border-white/30 focus:border-primary/50 focus:bg-white/30 focus:shadow-lg focus:shadow-primary/10",
        solid: "bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20",
        ghost: "bg-transparent border-0 focus:bg-white/10"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-3 py-2",
        lg: "h-12 px-4 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            selectVariants({ variant, size }),
            "appearance-none pr-8 cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-500" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select, selectVariants };