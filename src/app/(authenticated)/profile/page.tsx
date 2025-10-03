'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { UserProfile } from '@/components/users/user-profile';
import { GlassCard } from '@/components/ui/glass-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface UserProfileData {
  MaTaiKhoan: string;
  TenDangNhap: string;
  QuyenHan: string;
  MaDonVi: string | null;
  TrangThai: boolean;
  TaoLuc: string;
  DonVi?: {
    MaDonVi: string;
    TenDonVi: string;
    CapQuanLy: string;
  } | null;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch user profile
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async (data: { MatKhau?: string }) => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
    } catch (error) {
      throw error; // Re-throw to be handled by the component
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
            <span className="text-gray-600">Đang tải thông tin...</span>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8 max-w-md">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn cần đăng nhập để truy cập trang này.
            </AlertDescription>
          </Alert>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8 max-w-md">
          <Alert className="border-medical-red/20 bg-medical-red/5">
            <AlertCircle className="h-4 w-4 text-medical-red" />
            <AlertDescription className="text-medical-red">
              {error}
            </AlertDescription>
          </Alert>
        </GlassCard>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8 max-w-md">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Không tìm thấy thông tin hồ sơ.
            </AlertDescription>
          </Alert>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
        <UserProfile
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          isLoading={isLoading}
        />
    </div>
  );
}