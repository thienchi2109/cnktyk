import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const glassButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "backdrop-blur-md bg-primary/20 border border-primary/30 text-primary-900 hover:bg-primary/30 hover:shadow-lg hover:shadow-primary/20",
        secondary: "backdrop-blur-md bg-secondary/20 border border-secondary/30 text-secondary-900 hover:bg-secondary/30 hover:shadow-lg hover:shadow-secondary/20",
        success: "backdrop-blur-md bg-green-500/20 border border-green-500/30 text-green-900 hover:bg-green-500/30 hover:shadow-lg hover:shadow-green-500/20",
        warning: "backdrop-blur-md bg-amber-500/20 border border-amber-500/30 text-amber-900 hover:bg-amber-500/30 hover:shadow-lg hover:shadow-amber-500/20",
        danger: "backdrop-blur-md bg-red-500/20 border border-red-500/30 text-red-900 hover:bg-red-500/30 hover:shadow-lg hover:shadow-red-500/20",
        ghost: "backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 hover:shadow-lg",
        outline: "backdrop-blur-md bg-transparent border-2 border-primary/50 text-primary hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/20"
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };