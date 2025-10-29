'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Settings, ArrowLeft } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';
import { ResponsiveNavigation } from '@/components/layout/responsive-navigation';
import { useRouter } from 'next/navigation';

export default function NotificationPreferencesPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSavePreferences = async (preferences: any) => {
    try {
      // This would typically save to a user preferences API
      console.log('Saving preferences:', preferences);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you would save to database
      // const response = await fetch('/api/users/preferences', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(preferences)
      // });
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Đang tải...</h1>
          <p className="text-slate-600">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveNavigation
      user={{
        name: session.user?.username || 'User',
        role: session.user?.role || 'User'
      }}
      activeItem="notifications"
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GlassButton
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </GlassButton>
              
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Cài đặt thông báo
                </h1>
                <p className="text-slate-600">
                  Tùy chỉnh cách bạn nhận thông báo từ hệ thống
                </p>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <NotificationPreferences
            onSave={handleSavePreferences}
          />
        </div>
      </div>
    </ResponsiveNavigation>
  );
}