'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { AlertCircle } from 'lucide-react';
interface DonViAccountDisabledMessageProps {
  className?: string;
}

export function DonViAccountDisabledMessage({
  className,
}: DonViAccountDisabledMessageProps) {
  return (
    <Alert
      className={cn(
        'border-medical-amber/40 bg-medical-amber/10 text-medical-amber-foreground',
        className,
      )}
    >
      <AlertCircle className="h-5 w-5 text-medical-amber" />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTitle className="text-medical-amber font-semibold">
            Quản lý tài khoản tạm thời bị vô hiệu hóa
          </AlertTitle>
          <Badge
            variant="outline"
            className="border-medical-amber text-medical-amber bg-white/70"
          >
            Tạm thời tắt
          </Badge>
        </div>
        <AlertDescription className="space-y-2 text-sm text-gray-700" />
      </div>
    </Alert>
  );
}
