'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Save, Plus } from 'lucide-react';

// Form validation schema
const ActivityFormSchema = z.object({
  TenDanhMuc: z.string().min(1, 'Tên hoạt động là bắt buộc'),
  LoaiHoatDong: z.enum(['KhoaHoc', 'HoiThao', 'NghienCuu', 'BaoCao']),
  DonViTinh: z.enum(['gio', 'tiet', 'tin_chi']),
  TyLeQuyDoi: z.number().min(0, 'Tỷ lệ quy đổi phải >= 0').default(1.0),
  GioToiThieu: z.number().min(0).nullable(),
  GioToiDa: z.number().min(0).nullable(),
  YeuCauMinhChung: z.boolean().default(true),
  HieuLucTu: z.string().optional(),
  HieuLucDen: z.string().optional(),
}).refine(
  (data) => {
    if (data.GioToiThieu !== null && data.GioToiDa !== null) {
      return data.GioToiDa >= data.GioToiThieu;
    }
    return true;
  },
  {
    message: 'Số giờ tối đa phải >= số giờ tối thiểu',
    path: ['GioToiDa'],
  }
);

type ActivityFormData = z.infer<typeof ActivityFormSchema>;

interface ActivityFormProps {
  activity?: any;
  mode: 'create' | 'edit';
  onSubmit: (data: ActivityFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const activityTypeOptions = [
  { value: 'KhoaHoc', label: 'Khóa học' },
  { value: 'HoiThao', label: 'Hội thảo' },
  { value: 'NghienCuu', label: 'Nghiên cứu' },
  { value: 'BaoCao', label: 'Báo cáo' },
];

const unitOptions = [
  { value: 'gio', label: 'Giờ' },
  { value: 'tiet', label: 'Tiết' },
  { value: 'tin_chi', label: 'Tín chỉ' },
];

export function ActivityForm({ activity, mode, onSubmit, onCancel, isLoading = false }: ActivityFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<z.infer<typeof ActivityFormSchema>>({
    resolver: zodResolver(ActivityFormSchema) as any,
    defaultValues: activity ? {
      TenDanhMuc: activity.TenDanhMuc || '',
      LoaiHoatDong: activity.LoaiHoatDong || 'KhoaHoc',
      DonViTinh: activity.DonViTinh || 'gio',
      TyLeQuyDoi: activity.TyLeQuyDoi || 1.0,
      GioToiThieu: activity.GioToiThieu,
      GioToiDa: activity.GioToiDa,
      YeuCauMinhChung: activity.YeuCauMinhChung ?? true,
      HieuLucTu: activity.HieuLucTu ? new Date(activity.HieuLucTu).toISOString().split('T')[0] : '',
      HieuLucDen: activity.HieuLucDen ? new Date(activity.HieuLucDen).toISOString().split('T')[0] : '',
    } : {
      TenDanhMuc: '',
      LoaiHoatDong: 'KhoaHoc',
      DonViTinh: 'gio',
      TyLeQuyDoi: 1.0,
      GioToiThieu: null,
      GioToiDa: null,
      YeuCauMinhChung: true,
      HieuLucTu: '',
      HieuLucDen: '',
    }
  });

  const handleFormSubmit = async (data: z.infer<typeof ActivityFormSchema>) => {
    try {
      setSubmitError(null);
      await onSubmit(data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {mode === 'create' ? 'Thêm hoạt động mới' : 'Chỉnh sửa hoạt động'}
        </h2>
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </GlassButton>
      </div>

      {submitError && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {submitError}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-4">
        {/* Activity Name */}
        <div className="space-y-2">
          <Label htmlFor="TenDanhMuc">Tên hoạt động *</Label>
          <Input
            id="TenDanhMuc"
            {...register('TenDanhMuc')}
            placeholder="Nhập tên hoạt động"
            className={errors.TenDanhMuc ? 'border-red-300' : ''}
          />
          {errors.TenDanhMuc && (
            <p className="text-sm text-red-500">{errors.TenDanhMuc.message}</p>
          )}
        </div>

        {/* Activity Type */}
        <div className="space-y-2">
          <Label htmlFor="LoaiHoatDong">Loại hoạt động *</Label>
          <Select
            value={watch('LoaiHoatDong')}
            onValueChange={(value) => setValue('LoaiHoatDong', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn loại hoạt động" />
            </SelectTrigger>
            <SelectContent>
              {activityTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.LoaiHoatDong && (
            <p className="text-sm text-red-500">{errors.LoaiHoatDong.message}</p>
          )}
        </div>

        {/* Unit */}
        <div className="space-y-2">
          <Label htmlFor="DonViTinh">Đơn vị tính *</Label>
          <Select
            value={watch('DonViTinh')}
            onValueChange={(value) => setValue('DonViTinh', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn đơn vị tính" />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.DonViTinh && (
            <p className="text-sm text-red-500">{errors.DonViTinh.message}</p>
          )}
        </div>

        {/* Conversion Rate */}
        <div className="space-y-2">
          <Label htmlFor="TyLeQuyDoi">Tỷ lệ quy đổi *</Label>
          <Input
            id="TyLeQuyDoi"
            type="number"
            step="0.1"
            min="0"
            {...register('TyLeQuyDoi', { valueAsNumber: true })}
            placeholder="1.0"
            className={errors.TyLeQuyDoi ? 'border-red-300' : ''}
          />
          {errors.TyLeQuyDoi && (
            <p className="text-sm text-red-500">{errors.TyLeQuyDoi.message}</p>
          )}
        </div>

        {/* Min/Max Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="GioToiThieu">Số giờ tối thiểu</Label>
            <Input
              id="GioToiThieu"
              type="number"
              min="0"
              {...register('GioToiThieu', { 
                setValueAs: (v: string) => v === '' ? null : parseFloat(v) 
              })}
              placeholder="Không giới hạn"
            />
            {errors.GioToiThieu && (
              <p className="text-sm text-red-500">{errors.GioToiThieu.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="GioToiDa">Số giờ tối đa</Label>
            <Input
              id="GioToiDa"
              type="number"
              min="0"
              {...register('GioToiDa', { 
                setValueAs: (v: string) => v === '' ? null : parseFloat(v) 
              })}
              placeholder="Không giới hạn"
              className={errors.GioToiDa ? 'border-red-300' : ''}
            />
            {errors.GioToiDa && (
              <p className="text-sm text-red-500">{errors.GioToiDa.message}</p>
            )}
          </div>
        </div>

        {/* Evidence Required */}
        <div className="flex items-center space-x-2">
          <input
            id="YeuCauMinhChung"
            type="checkbox"
            {...register('YeuCauMinhChung')}
            className="rounded border-gray-300 text-medical-blue focus:ring-medical-blue"
          />
          <Label htmlFor="YeuCauMinhChung">Yêu cầu minh chứng</Label>
        </div>

        {/* Validity Period */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="HieuLucTu">Hiệu lực từ</Label>
            <Input
              id="HieuLucTu"
              type="date"
              {...register('HieuLucTu')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="HieuLucDen">Hiệu lực đến</Label>
            <Input
              id="HieuLucDen"
              type="date"
              {...register('HieuLucDen')}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <GlassButton
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Hủy
          </GlassButton>
          <GlassButton
            type="submit"
            disabled={isLoading}
            className="bg-medical-blue hover:bg-medical-blue/90"
          >
            {isLoading ? (
              'Đang xử lý...'
            ) : (
              <>
                {mode === 'create' ? <Plus className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {mode === 'create' ? 'Thêm hoạt động' : 'Cập nhật'}
              </>
            )}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
}