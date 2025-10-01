import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-lg text-sm transition-all duration-200 placeholder:text-slate-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "backdrop-blur-md bg-white/20 border border-white/30 focus:border-primary/50 focus:bg-white/30 focus:shadow-lg focus:shadow-primary/10",
        solid: "bg-white border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20",
        ghost: "bg-transparent border-0 focus:bg-white/10"
      },
      size: {
        sm: "p-2 text-xs",
        default: "p-3",
        lg: "p-4 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };