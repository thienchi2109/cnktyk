'use client';

import { useState } from 'react';
import { z } from 'zod';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/glass-select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreateTaiKhoanSchema, UpdateTaiKhoanSchema } from '@/lib/db/schemas';
import { UserPlus, Save, AlertCircle } from 'lucide-react';

type UserFormData = z.infer<typeof CreateTaiKhoanSchema>;
type UpdateUserFormData = z.infer<typeof UpdateTaiKhoanSchema>;

interface Unit {
  MaDonVi: string;
  TenDonVi: string;
  CapQuanLy: string;
}

interface UserFormProps {
  mode: 'create' | 'edit';
  variant?: 'card' | 'sheet';
  initialData?: Partial<UserFormData>;
  units: Unit[];
  onSubmit: (data: UserFormData | UpdateUserFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  currentUserRole: string;
}

const roleOptions = [
  { value: 'SoYTe', label: 'Sở Y Tế' },
  { value: 'DonVi', label: 'Đơn Vị' },
  { value: 'NguoiHanhNghe', label: 'Người Hành Nghề' },
  { value: 'Auditor', label: 'Kiểm Toán' },
];

export function UserForm({
  mode,
  variant = 'card',
  initialData,
  units,
  onSubmit,
  onCancel,
  isLoading = false,
  currentUserRole,
}: UserFormProps) {
  const [formData, setFormData] = useState<Partial<UserFormData>>({
    TenDangNhap: initialData?.TenDangNhap || '',
    MatKhau: '',
    QuyenHan: initialData?.QuyenHan || 'NguoiHanhNghe',
    MaDonVi: initialData?.MaDonVi || null,
    TrangThai: initialData?.TrangThai ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  const validateForm = () => {
    try {
      const schema = mode === 'create' ? CreateTaiKhoanSchema : UpdateTaiKhoanSchema;
      schema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    try {
      // Omit empty password on edit to avoid server-side validation errors
      const payload: any = { ...formData };
      if (mode === 'edit' && (!payload.MatKhau || payload.MatKhau.trim() === '')) {
        delete payload.MatKhau;
      }
      await onSubmit(payload as UserFormData);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Filter role options based on current user's role
  const availableRoles = roleOptions.filter(role => {
    if (currentUserRole === 'DonVi') {
      // Unit admins can ONLY manage NguoiHanhNghe (practitioner) accounts
      return role.value === 'NguoiHanhNghe';
    }
    return true;
  });

  // Render header only for card variant
  const renderHeader = () => {
    if (variant === 'sheet') return null;
    
    return (
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-medical-blue/10">
          <UserPlus className="h-6 w-6 text-medical-blue" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Tạo Tài Khoản Mới' : 'Chỉnh Sửa Tài Khoản'}
          </h2>
          <p className="text-sm text-gray-500">
            {mode === 'create' 
              ? 'Nhập thông tin để tạo tài khoản mới trong hệ thống' 
              : 'Cập nhật thông tin tài khoản người dùng'
            }
          </p>
        </div>
      </div>
    );
  };

  const formContent = (
    <>

      {submitError && (
        <Alert className="mb-4 border-medical-red/20 bg-medical-red/5">
          <AlertCircle className="h-4 w-4 text-medical-red" />
          <AlertDescription className="text-medical-red">
            {submitError}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Tên Đăng Nhập</Label>
          <Input
            id="username"
            type="text"
            value={formData.TenDangNhap}
            onChange={(e) => handleInputChange('TenDangNhap', e.target.value)}
            placeholder="Nhập tên đăng nhập"
            disabled={mode === 'edit'} // Username cannot be changed in edit mode
            className={errors.TenDangNhap ? 'border-medical-red' : ''}
          />
          {errors.TenDangNhap && (
            <p className="text-sm text-medical-red mt-1">{errors.TenDangNhap}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">
            {mode === 'create' ? 'Mật Khẩu' : 'Mật Khẩu Mới (để trống nếu không đổi)'}
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.MatKhau}
            onChange={(e) => handleInputChange('MatKhau', e.target.value)}
            placeholder={mode === 'create' ? 'Nhập mật khẩu' : 'Nhập mật khẩu mới'}
            className={errors.MatKhau ? 'border-medical-red' : ''}
          />
          {errors.MatKhau && (
            <p className="text-sm text-medical-red mt-1">{errors.MatKhau}</p>
          )}
        </div>

        <div>
          <Label htmlFor="role">Quyền Hạn</Label>
          <Select
            value={formData.QuyenHan}
            onChange={(e) => handleInputChange('QuyenHan', e.target.value)}
          >
            {availableRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
          {errors.QuyenHan && (
            <p className="text-sm text-medical-red mt-1">{errors.QuyenHan}</p>
          )}
        </div>

        <div>
          <Label htmlFor="unit">Đơn Vị</Label>
          <Select
            value={formData.MaDonVi || ''}
            onChange={(e) => handleInputChange('MaDonVi', e.target.value || null)}
          >
            <option value="">-- Chọn đơn vị --</option>
            {units.map((unit) => (
              <option key={unit.MaDonVi} value={unit.MaDonVi}>
                {unit.TenDonVi} ({unit.CapQuanLy})
              </option>
            ))}
          </Select>
          {errors.MaDonVi && (
            <p className="text-sm text-medical-red mt-1">{errors.MaDonVi}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="status"
            type="checkbox"
            checked={formData.TrangThai}
            onChange={(e) => handleInputChange('TrangThai', e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="status">Tài khoản hoạt động</Label>
        </div>

        <div className="flex gap-3 pt-4">
          <GlassButton
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Đang xử lý...' : mode === 'create' ? 'Tạo Tài Khoản' : 'Cập Nhật'}
          </GlassButton>
          
          <GlassButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Hủy
          </GlassButton>
        </div>
      </form>
    </>
  );

  if (variant === 'sheet') {
    return (
      <div className="space-y-6">
        {formContent}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderHeader()}
      <GlassCard className="p-6">
        {formContent}
      </GlassCard>
    </div>
  );
}
