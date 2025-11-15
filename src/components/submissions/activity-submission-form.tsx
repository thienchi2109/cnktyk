'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Calendar,
  Clock,
  FileText,
  User,
  BookOpen,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload, UploadedFile } from '@/components/ui/file-upload';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { SheetFooter } from '@/components/ui/sheet';
import { useActivitiesCatalog } from '@/hooks/use-activities';
import { PractitionerSelector } from '@/components/ui/practitioner-selector';
import { useUnitPractitioners } from '@/hooks/use-unit-practitioners';

interface ActivityCatalog {
  MaDanhMuc: string;
  TenDanhMuc: string;
  LoaiHoatDong: 'KhoaHoc' | 'HoiThao' | 'NghienCuu' | 'BaoCao';
  TyLeQuyDoi: number;
  GioToiThieu: number | null;
  GioToiDa: number | null;
  YeuCauMinhChung: boolean;
  MaDonVi?: string | null;
  DaXoaMem?: boolean;
}

interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  ChucDanh: string | null;
}

interface ActivitySubmissionFormProps {
  userRole: string;
  practitioners?: Practitioner[];
  onSubmit?: (submissionId: string) => void;
  onCancel?: () => void;
  redirectOnSuccess?: boolean;
  variant?: 'sheet' | 'page';
  // When user is a practitioner, prefill their practitioner id to satisfy validation
  initialPractitionerId?: string;
}

const submissionSchema = z.object({
  MaNhanVien: z.string().min(1, 'Vui lòng chọn nhân viên'),
  MaDanhMuc: z.string().optional(),
  TenHoatDong: z.string().min(1, 'Tên hoạt động là bắt buộc'),
  // Migration 003 fields
  HinhThucCapNhatKienThucYKhoa: z.string().optional(),
  ChiTietVaiTro: z.string().optional(),
  DonViToChuc: z.string().optional(),
  NgayBatDau: z.string().optional(),
  NgayKetThuc: z.string().optional(),
  SoTiet: z.number().min(0, 'Số tiết phải lớn hơn 0').optional(),
  SoGioTinChiQuyDoi: z.number().min(0, 'Số tín chỉ phải lớn hơn 0'),
  BangChungSoGiayChungNhan: z.string().optional(),
  GhiChuDuyet: z.string().optional(),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

const activityTypeLabels = {
  KhoaHoc: 'Khóa học',
  HoiThao: 'Hội thảo',
  NghienCuu: 'Nghiên cứu',
  BaoCao: 'Báo cáo',
};

export function ActivitySubmissionForm({
  userRole,
  practitioners = [],
  onSubmit,
  onCancel,
  redirectOnSuccess = true,
  variant = 'sheet',
  initialPractitionerId,
}: ActivitySubmissionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { data: activitiesData, isLoading: isActivitiesLoading } = useActivitiesCatalog({
    scope: 'all',
    status: 'active',
    limit: 200,
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Use TanStack Query for practitioner caching (with server data as initialData)
  const { data: cachedPractitioners, isLoading: isPractitionersLoading } = useUnitPractitioners({
    initialData: practitioners,
    enabled: userRole === 'DonVi',
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      MaNhanVien: initialPractitionerId ?? '',
      SoGioTinChiQuyDoi: 0,
    },
  });

  // Optimization #1: Only watch specific fields instead of all fields
  const MaDanhMuc = watch('MaDanhMuc');
  const SoTiet = watch('SoTiet');
  const SoGioTinChiQuyDoi = watch('SoGioTinChiQuyDoi');

  // Optimization #2: Process activity catalog with useMemo instead of useEffect + setState
  const activityCatalog = useMemo(() => {
    if (!activitiesData) {
      return [];
    }

    // useActivitiesCatalog returns { global: [], unit: [], permissions: {} }
    const global = Array.isArray(activitiesData.global) ? activitiesData.global : [];
    const unit = Array.isArray(activitiesData.unit) ? activitiesData.unit : [];

    // Combine global and unit activities, filtering out soft-deleted ones
    const dedupedMap = new Map<string, ActivityCatalog>();
    for (const activity of [...global, ...unit]) {
      if (!activity || activity.DaXoaMem) {
        continue;
      }
      dedupedMap.set(activity.MaDanhMuc, activity);
    }

    return Array.from(dedupedMap.values());
  }, [activitiesData]);

  // Optimization #3: Derive selectedActivity with useMemo instead of useEffect + setState
  const selectedActivity = useMemo(() => {
    if (!MaDanhMuc) {
      return null;
    }
    return activityCatalog.find((a: ActivityCatalog) => a.MaDanhMuc === MaDanhMuc) || null;
  }, [MaDanhMuc, activityCatalog]);

  // Optimization #4: Calculate credits with useMemo instead of useState
  const calculatedCredits = useMemo(() => {
    if (selectedActivity && SoTiet) {
      // Convert TyLeQuyDoi to number (comes from DB as string)
      const conversionRate = Number(selectedActivity.TyLeQuyDoi);
      if (isNaN(conversionRate)) {
        return 0;
      }
      return SoTiet * conversionRate;
    }
    return SoGioTinChiQuyDoi || 0;
  }, [selectedActivity, SoTiet, SoGioTinChiQuyDoi]);

  // Prefill practitioner id for practitioner role
  useEffect(() => {
    if (userRole === 'NguoiHanhNghe' && initialPractitionerId) {
      setValue('MaNhanVien', initialPractitionerId, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [userRole, initialPractitionerId, setValue]);

  // Auto-fill activity name when catalog item is selected
  useEffect(() => {
    if (selectedActivity) {
      setValue('TenHoatDong', selectedActivity.TenDanhMuc);
    }
  }, [selectedActivity, setValue]);

  // Auto-sync calculated credits to form field
  useEffect(() => {
    if (selectedActivity && SoTiet) {
      setValue('SoGioTinChiQuyDoi', calculatedCredits);
    }
  }, [selectedActivity, SoTiet, calculatedCredits, setValue]);

  const handleFileUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };

  const handleFileUploadError = (error: string) => {
    setError(`Lỗi tải tệp: ${error}`);
  };

  const onSubmitForm = async (data: SubmissionFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Prepare submission data
      const submissionData = {
        ...data,
        NgayBatDau: data.NgayBatDau || null,
        NgayKetThuc: data.NgayKetThuc || null,
        FileMinhChungUrl: uploadedFiles.length > 0 ? `/api/files/${uploadedFiles[0].filename}` : null,
      };

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      setSuccess('Hoạt động đã được gửi thành công và đang chờ phê duyệt');

      // Reset form
      reset();
      setUploadedFiles([]);

      // Notify parent component
      if (onSubmit) {
        onSubmit(result.submission.MaGhiNhan);
      }

      // Redirect after a short delay (only if enabled)
      if (redirectOnSuccess !== false) {
        setTimeout(() => {
          router.push('/submissions');
        }, 2000);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit(onSubmitForm)}
        className={variant === 'sheet' ? 'space-y-6 pb-36' : 'space-y-6'}
      >
        {/* Practitioner Selection (for unit admins) */}
        {userRole === 'DonVi' && practitioners.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-medical-blue" />
              <h3 className="text-lg font-semibold text-gray-900">Thông tin nhân viên</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="MaNhanVien">Chọn nhân viên *</Label>
                <Controller
                  name="MaNhanVien"
                  control={control}
                  rules={{ required: 'Vui lòng chọn nhân viên' }}
                  render={({ field }) => (
                    <PractitionerSelector
                      practitioners={cachedPractitioners || []}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                      placeholder="Chọn nhân viên..."
                      error={errors.MaNhanVien?.message}
                      isLoading={isPractitionersLoading}
                    />
                  )}
                />
              </div>
            </div>
          </GlassCard>
        )}

        {/* Activity Information */}
        <GlassCard className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="h-5 w-5 text-medical-blue" />
            <h3 className="text-lg font-semibold text-gray-900">Thông tin hoạt động</h3>
          </div>

          {isActivitiesLoading && (
            <div className="mb-4">
              <LoadingNotice message="Đang tải danh mục hoạt động..." size="sm" align="left" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Catalog Selection */}
            <div className="md:col-span-2">
              <Label htmlFor="MaDanhMuc">Chọn từ danh mục hoạt động (tùy chọn)</Label>
              <Select onValueChange={(value) => setValue('MaDanhMuc', value === '__none__' ? undefined : value)}>
                <SelectTrigger className="relative z-10 data-[state=open]:z-50">
                  <SelectValue placeholder="Chọn hoạt động từ danh mục..." />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-white">
                  <SelectItem value="__none__">Hoạt động tự do (không từ danh mục)</SelectItem>
                  {activityCatalog.map((activity) => (
                    <SelectItem key={activity.MaDanhMuc} value={activity.MaDanhMuc}>
                      <div className="flex flex-col">
                        <span className="font-medium">{activity.TenDanhMuc}</span>
                        <span className="text-sm text-gray-500">
                          {activityTypeLabels[activity.LoaiHoatDong]} • {Number(activity.TyLeQuyDoi)}x tín chỉ
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity Name */}
            <div className="md:col-span-2">
              <Label htmlFor="TenHoatDong">Tên hoạt động *</Label>
              <Input
                id="TenHoatDong"
                {...register('TenHoatDong')}
                placeholder="Nhập tên hoạt động..."
                disabled={!!selectedActivity}
              />
              {errors.TenHoatDong && (
                <p className="text-sm text-red-600 mt-1">{errors.TenHoatDong.message}</p>
              )}
            </div>

            {/* Form of Medical Knowledge Update */}
            <div>
              <Label htmlFor="HinhThucCapNhatKienThucYKhoa">Hình thức cập nhật kiến thức</Label>
              <Input
                id="HinhThucCapNhatKienThucYKhoa"
                {...register('HinhThucCapNhatKienThucYKhoa')}
                placeholder="VD: Hội thảo, Đào tạo, Hội nghị..."
              />
            </div>

            {/* Detailed Role */}
            <div>
              <Label htmlFor="ChiTietVaiTro">Chi tiết vai trò</Label>
              <Input
                id="ChiTietVaiTro"
                {...register('ChiTietVaiTro')}
                placeholder="VD: Báo cáo viên, Tham dự, Diễn giả..."
              />
            </div>

            {/* Organizing Unit */}
            <div className="md:col-span-2">
              <Label htmlFor="DonViToChuc">Đơn vị tổ chức</Label>
              <Input
                id="DonViToChuc"
                {...register('DonViToChuc')}
                placeholder="Tên đơn vị tổ chức hoạt động..."
              />
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="NgayBatDau">Ngày bắt đầu</Label>
              <Input
                id="NgayBatDau"
                type="date"
                {...register('NgayBatDau')}
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="NgayKetThuc">Ngày kết thúc</Label>
              <Input
                id="NgayKetThuc"
                type="date"
                {...register('NgayKetThuc')}
              />
            </div>

            {/* Number of Sessions */}
            <div>
              <Label htmlFor="SoTiet">Số tiết (nếu có)</Label>
              <Input
                id="SoTiet"
                type="number"
                step="0.5"
                min="0"
                {...register('SoTiet', { valueAsNumber: true })}
                placeholder="0"
              />
              {selectedActivity && selectedActivity.GioToiThieu && (
                <p className="text-xs text-gray-500 mt-1">
                  Tối thiểu: {selectedActivity.GioToiThieu}
                  {selectedActivity.GioToiDa && ` • Tối đa: ${selectedActivity.GioToiDa}`}
                </p>
              )}
            </div>

            {/* Certificate Number */}
            <div>
              <Label htmlFor="BangChungSoGiayChungNhan">Số giấy chứng nhận</Label>
              <Input
                id="BangChungSoGiayChungNhan"
                {...register('BangChungSoGiayChungNhan')}
                placeholder="Số giấy chứng nhận (nếu có)..."
              />
            </div>
          </div>
        </GlassCard>

        {/* Credits Calculation */}
        <GlassCard className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-5 w-5 text-medical-blue" />
            <h3 className="text-lg font-semibold text-gray-900">Tín chỉ</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="SoGioTinChiQuyDoi">Số giờ tín chỉ quy đổi *</Label>
              <Input
                id="SoGioTinChiQuyDoi"
                type="number"
                step="0.1"
                min="0"
                {...register('SoGioTinChiQuyDoi', { valueAsNumber: true })}
                placeholder="0"
                disabled={!!selectedActivity && !!SoTiet}
              />
              {errors.SoGioTinChiQuyDoi && (
                <p className="text-sm text-red-600 mt-1">{errors.SoGioTinChiQuyDoi.message}</p>
              )}

              {selectedActivity && SoTiet && (
                <p className="text-sm text-green-600 mt-1">
                  Tự động tính: {SoTiet} tiết × {Number(selectedActivity.TyLeQuyDoi)} = {calculatedCredits} tín chỉ
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="GhiChuDuyet">Ghi chú</Label>
              <Textarea
                id="GhiChuDuyet"
                {...register('GhiChuDuyet')}
                placeholder="Ghi chú thêm về hoạt động..."
                rows={3}
              />
            </div>
          </div>
        </GlassCard>

        {/* Evidence Files */}
        <GlassCard className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-5 w-5 text-medical-blue" />
            <h3 className="text-lg font-semibold text-gray-900">Tệp minh chứng</h3>
            {selectedActivity?.YeuCauMinhChung && (
              <span className="text-sm text-red-600">(Bắt buộc)</span>
            )}
          </div>

          <FileUpload
            onUpload={handleFileUpload}
            onError={handleFileUploadError}
            maxFiles={3}
            maxSize={10}
            acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
          />
        </GlassCard>

        {/* Form Actions */}
        {variant === 'page' ? (
          <div className="flex justify-end gap-3 pt-6">
            {onCancel && (
              <Button
                type="button"
                variant="outline-accent"
                onClick={onCancel}
                disabled={isLoading}
                className="gap-2"
                size="lg"
              >
                <X className="w-4 h-4" />
                Hủy
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              variant="medical"
              className="gap-2"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Gửi hoạt động
            </Button>
          </div>
        ) : (
          <SheetFooter className="-mx-6 px-6 py-4 mt-6 bg-white sticky bottom-0">
            <div className="flex w-full flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline-accent"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="gap-2"
                  size="lg"
                >
                  <X className="w-4 h-4" />
                  Hủy
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                variant="medical"
                className="gap-2"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Gửi hoạt động
              </Button>
            </div>
          </SheetFooter>
        )}
      </form>
    </div>
  );
}
