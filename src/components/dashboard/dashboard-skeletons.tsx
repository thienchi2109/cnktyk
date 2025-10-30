import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/glass-card';
import { AlertTriangle } from 'lucide-react';

const baseContainer =
  'relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-lg';
const basePulse = 'motion-safe:animate-pulse motion-reduce:animate-none';

export const dashboardSkeletonTokens = {
  container: `${baseContainer} ${basePulse}`,
  surface: 'bg-white/20',
  bar: 'h-3 rounded-full bg-white/30',
  circle: 'rounded-full bg-white/30',
} as const;

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function DashboardCardSkeleton({ className, lines = 3 }: SkeletonProps) {
  return (
    <div
      className={cn(dashboardSkeletonTokens.container, 'p-6', className)}
      aria-hidden="true"
      role="presentation"
    >
      <div className="space-y-4">
        <Skeleton className={cn('h-6 w-1/3', dashboardSkeletonTokens.surface)} />
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                dashboardSkeletonTokens.surface,
                dashboardSkeletonTokens.bar,
                index === lines - 1 ? 'w-1/2' : 'w-full'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardKpiSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        dashboardSkeletonTokens.container,
        'p-4 flex flex-col gap-3',
        className
      )}
      aria-hidden="true"
      role="presentation"
    >
      <Skeleton className={cn('h-4 w-1/2', dashboardSkeletonTokens.surface)} />
      <Skeleton className={cn('h-10 w-1/3', dashboardSkeletonTokens.surface)} />
      <Skeleton className={cn('h-3 w-1/4', dashboardSkeletonTokens.surface)} />
    </div>
  );
}

export function DashboardChartSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        dashboardSkeletonTokens.container,
        'p-6 h-[260px] flex items-center justify-center',
        className
      )}
      aria-hidden="true"
      role="presentation"
    >
      <Skeleton className={cn('h-40 w-full', dashboardSkeletonTokens.surface)} />
    </div>
  );
}

export function DashboardTableSkeleton({
  className,
  lines = 4,
}: SkeletonProps) {
  return (
    <div
      className={cn(dashboardSkeletonTokens.container, 'p-0', className)}
      aria-hidden="true"
      role="presentation"
    >
      <div className="p-4 border-b border-white/10">
        <Skeleton className={cn('h-5 w-1/3', dashboardSkeletonTokens.surface)} />
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="px-4 py-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Skeleton
                className={cn(
                  'h-4',
                  dashboardSkeletonTokens.surface,
                  dashboardSkeletonTokens.bar
                )}
              />
              <Skeleton
                className={cn(
                  'h-4',
                  dashboardSkeletonTokens.surface,
                  dashboardSkeletonTokens.bar
                )}
              />
              <Skeleton
                className={cn(
                  'h-4',
                  dashboardSkeletonTokens.surface,
                  dashboardSkeletonTokens.bar
                )}
              />
              <Skeleton
                className={cn(
                  'h-4',
                  dashboardSkeletonTokens.surface,
                  dashboardSkeletonTokens.bar
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardListSkeleton({
  className,
  lines = 3,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        dashboardSkeletonTokens.container,
        'p-6 space-y-4',
        className
      )}
      aria-hidden="true"
      role="presentation"
    >
      <Skeleton className={cn('h-5 w-1/4', dashboardSkeletonTokens.surface)} />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton
              className={cn(
                'h-4 w-2/3',
                dashboardSkeletonTokens.surface
              )}
            />
            <Skeleton
              className={cn(
                'h-3 w-1/2',
                dashboardSkeletonTokens.surface
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorProps {
  message: string;
  headline?: string;
}

export function DashboardErrorCard({
  message,
  headline = 'Không thể tải dữ liệu',
  className,
}: ErrorProps & { className?: string }) {
  return (
    <GlassCard
      className={cn(
        'p-6 border border-medical-red/40 bg-red-50/20 text-medical-red',
        className
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-1" />
        <div>
          <p className="font-semibold">{headline}</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </GlassCard>
  );
}

export function DashboardErrorPanel({
  message,
  headline = 'Không thể tải dữ liệu',
  className,
}: ErrorProps & { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-medical-red/30 bg-red-50/20 p-4 text-medical-red',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-1" />
        <div>
          <p className="font-semibold">{headline}</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}
