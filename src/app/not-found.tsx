/**
 * 404 Not Found Page
 */

import Link from 'next/link';
import { GlassCard, GlassButton } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full text-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-blue-600">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800">Trang không tìm thấy</h2>
            <p className="text-gray-600">
              Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link href="/auth/signin">
              <GlassButton className="w-full">
                Đăng nhập
              </GlassButton>
            </Link>
            <Link href="/">
              <GlassButton variant="outline" className="w-full">
                Trang chủ
              </GlassButton>
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
