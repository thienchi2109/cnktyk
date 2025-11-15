/**
 * Error page component
 */

'use client';

import { useEffect } from 'react';
import { GlassCard, Button } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full text-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-red-600">500</h1>
            <h2 className="text-2xl font-semibold text-gray-800">Đã xảy ra lỗi</h2>
            <p className="text-gray-600">
              Hệ thống đã gặp sự cố không mong muốn. Vui lòng thử lại sau.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={reset} className="w-full" variant="medical">
              Thử lại
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/auth/signin">
                Về trang đăng nhập
              </a>
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
