'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Shield, 
  Building, 
  Calendar, 
  Key, 
  Save, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface UserProfile {
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

interface UserProfileProps {
  profile: UserProfile;
  onUpdateProfile: (data: { MatKhau?: string }) => Promise<void>;
  isLoading?: boolean;
}

const roleLabels: Record<string, string> = {
  SoYTe: 'Sở Y Tế',
  DonVi: 'Đơn Vị',
  NguoiHanhNghe: 'Người Hành Nghề',
  Auditor: 'Kiểm Toán',
};

const roleColors: Record<string, string> = {
  SoYTe: 'text-medical-blue bg-medical-blue/10',
  DonVi: 'text-medical-green bg-medical-green/10',
  NguoiHanhNghe: 'text-medical-amber bg-medical-amber/10',
  Auditor: 'text-gray-600 bg-gray-100',
};

export function UserProfile({ profile, onUpdateProfile, isLoading = false }: UserProfileProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới là bắt buộc';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    if (!validatePassword()) {
      return;
    }

    try {
      await onUpdateProfile({ MatKhau: passwordData.newPassword });
      setSuccess('Mật khẩu đã được cập nhật thành công');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Có lỗi xảy ra' });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-medical-blue/10">
            <User className="h-6 w-6 text-medical-blue" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 page-title">Thông tin cá nhân</h1>
        </div>
        <p className="text-gray-600">Xem và cập nhật thông tin tài khoản của bạn trong hệ thống CNKTYKLT</p>
      </div>

      {/* Profile Header */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 rounded-full bg-gradient-to-br from-medical-blue/20 to-medical-green/20">
            <User className="h-10 w-10 text-medical-blue" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.TenDangNhap}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleColors[profile.QuyenHan]}`}>
                <Shield className="h-3 w-3" />
                {roleLabels[profile.QuyenHan]}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                profile.TrangThai 
                  ? 'text-medical-green bg-medical-green/10' 
                  : 'text-medical-red bg-medical-red/10'
              }`}>
                <CheckCircle className="h-3 w-3" />
                {profile.TrangThai ? 'Hoạt động' : 'Vô hiệu hóa'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Tên Đăng Nhập</Label>
              <div className="mt-1 p-3 bg-gray-50/50 rounded-lg border">
                <span className="font-medium text-gray-900">{profile.TenDangNhap}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Quyền Hạn</Label>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${roleColors[profile.QuyenHan]}`}>
                  <Shield className="h-4 w-4" />
                  {roleLabels[profile.QuyenHan]}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Trạng Thái</Label>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  profile.TrangThai 
                    ? 'text-medical-green bg-medical-green/10' 
                    : 'text-medical-red bg-medical-red/10'
                }`}>
                  <CheckCircle className="h-4 w-4" />
                  {profile.TrangThai ? 'Hoạt động' : 'Vô hiệu hóa'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Đơn Vị</Label>
              <div className="mt-1 p-3 bg-gray-50/50 rounded-lg border">
                {profile.DonVi ? (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {profile.DonVi.TenDonVi}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({profile.DonVi.CapQuanLy})
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500">Không thuộc đơn vị nào</span>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Ngày Tạo</Label>
              <div className="mt-1 p-3 bg-gray-50/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {new Date(profile.TaoLuc).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">ID Tài Khoản</Label>
              <div className="mt-1 p-3 bg-gray-50/50 rounded-lg border">
                <span className="text-sm font-mono text-gray-600">
                  {profile.MaTaiKhoan}
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Password Change Section */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-medical-amber/10">
            <Key className="h-6 w-6 text-medical-amber" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bảo Mật Tài Khoản</h2>
            <p className="text-sm text-gray-500">Quản lý mật khẩu và bảo mật tài khoản</p>
          </div>
        </div>

        {success && (
          <Alert className="mb-4 border-medical-green/20 bg-medical-green/5">
            <CheckCircle className="h-4 w-4 text-medical-green" />
            <AlertDescription className="text-medical-green">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {errors.submit && (
          <Alert className="mb-4 border-medical-red/20 bg-medical-red/5">
            <AlertCircle className="h-4 w-4 text-medical-red" />
            <AlertDescription className="text-medical-red">
              {errors.submit}
            </AlertDescription>
          </Alert>
        )}

        {!isChangingPassword ? (
          <div className="bg-gradient-to-r from-medical-amber/5 to-medical-blue/5 rounded-lg p-4 border border-medical-amber/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-medical-amber/10 mt-1">
                <Key className="h-5 w-5 text-medical-amber" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Khuyến nghị bảo mật</h3>
                <p className="text-gray-600 mb-4">
                  Để đảm bảo an toàn cho tài khoản, bạn nên thay đổi mật khẩu định kỳ và sử dụng mật khẩu mạnh.
                </p>
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  className="flex items-center gap-2"
                  variant="medical-secondary"
                >
                  <Key className="h-4 w-4" />
                  Đổi Mật Khẩu
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Mật Khẩu Mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className={errors.newPassword ? 'border-medical-red' : ''}
              />
              {errors.newPassword && (
                <p className="text-sm text-medical-red mt-1">{errors.newPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Xác Nhận Mật Khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className={errors.confirmPassword ? 'border-medical-red' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-medical-red mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
                variant="medical"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
              </Button>
              
              <Button
                type="button"
                variant="outline-accent"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ newPassword: '', confirmPassword: '' });
                  setErrors({});
                }}
                disabled={isLoading}
              >
                Hủy
              </Button>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
