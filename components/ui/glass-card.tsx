import React from 'react';
import { cn } from '../../lib/utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';