import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const glassCardVariants = cva(
  'backdrop-blur-md bg-white/20 border border-white/30 rounded-xl shadow-lg shadow-black/5 dark:bg-slate-900/20 dark:border-slate-700/30',
  {
    variants: {
      blur: {
        sm: 'backdrop-blur-sm',
        md: 'backdrop-blur-md',
        lg: 'backdrop-blur-lg',
        xl: 'backdrop-blur-xl'
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      },
      hover: {
        none: '',
        subtle: 'hover:bg-white/25 dark:hover:bg-slate-900/25 transition-colors duration-200',
        glow: 'hover:shadow-xl hover:shadow-primary/10 transition-all duration-300'
      }
    },
    defaultVariants: {
      blur: 'md',
      padding: 'md',
      hover: 'none'
    }
  }
);

interface GlassCardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  children: React.ReactNode;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, blur, padding, hover, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ blur, padding, hover }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';