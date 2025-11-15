'use client';

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassCard } from "./glass-card";
import { Button } from "./button";

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
};

export const GlassModal = React.forwardRef<HTMLDivElement, GlassModalProps>(
  ({ isOpen, onClose, title, description, children, size = 'md', className }, ref) => {
    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <GlassCard
          ref={ref}
          className={cn(
            "relative w-full animate-in fade-in-0 zoom-in-95 duration-200",
            modalSizes[size],
            className
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {title && (
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-4 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1">
            {children}
          </div>
        </GlassCard>
      </div>
    );
  }
);

GlassModal.displayName = "GlassModal";
