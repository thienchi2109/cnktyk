import React from 'react';
import { cn } from '@/lib/utils';

export type LoadingNoticeProps = {
  message: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'center' | 'left';
  className?: string;
};

export function LoadingNotice({ message, size = 'md', align = 'center', className }: LoadingNoticeProps) {
  const sizeClasses = {
    sm: {
      container: 'py-4',
      spinner: 'h-4 w-4 border-2',
      text: 'text-sm',
    },
    md: {
      container: 'py-8',
      spinner: 'h-5 w-5 border-2',
      text: 'text-base',
    },
    lg: {
      container: 'py-12',
      spinner: 'h-7 w-7 border-2',
      text: 'text-lg',
    },
  } as const;

  const alignClasses = align === 'left' ? 'justify-start text-left' : 'justify-center text-center';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'w-full flex items-center gap-3 text-gray-600',
        sizeClasses[size].container,
        alignClasses,
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-slate-300 border-t-transparent border-b-medical-blue',
          sizeClasses[size].spinner,
        )}
      />
      <p className={cn('font-medium', sizeClasses[size].text)}>{message}</p>
    </div>
  );
}

export default LoadingNotice;
