import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "./glass-card";

interface GlassFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

const GlassForm = React.forwardRef<HTMLFormElement, GlassFormProps>(
  ({ title, description, children, className, ...props }, ref) => {
    return (
      <GlassCard className={cn("w-full max-w-md mx-auto", className)}>
        {(title || description) && (
          <div className="mb-6">
            {title && (
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-slate-600 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        )}
        
        <form ref={ref} {...props}>
          {children}
        </form>
      </GlassCard>
    );
  }
);
GlassForm.displayName = "GlassForm";

interface GlassFormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const GlassFormField = React.forwardRef<HTMLDivElement, GlassFormFieldProps>(
  ({ label, error, required, children, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {label && (
          <label className="text-sm font-medium text-slate-900 dark:text-white">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {children}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
GlassFormField.displayName = "GlassFormField";

export { GlassForm, GlassFormField };