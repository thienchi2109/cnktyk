'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
  CheckCircle
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload, UploadedFile } from '@/components/ui/file-upload';

interface ActivityCatalog {
  MaDanhMuc: string;
  TenDanhMuc: string;
  LoaiHoatDong: 'KhoaHoc' | 'HoiThao' | 'NghienCuu' | 'BaoCao';
  TyLeQuyDoi: number;
  GioToiThieu: number | null;
  GioToiDa: number | null;
  YeuCauMinhChung: boolean;
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
}

const submissionSchema = z.object({
  MaNhanVien: z.string().min(1, 'Vui lòng chọn nhân viên'),
  MaDanhMuc: z.string().optional(),
  TenHoatDong: z.string().min(1, 'Tên hoạt động là bắt buộc'),
  VaiTro: z.string().optional(),
  ThoiGianBatDau: z.string().optional(),
  ThoiGianKetThuc: z.string().optional(),
  SoGio: z.number().min(0, 'Số giờ phải lớn hơn 0').optional(),
  SoTinChiQuyDoi: z.number().min(0, 'Số tín chỉ phải lớn hơn 0'),
  GhiChu: z.string().optional(),
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
  onCancel 
}: ActivitySubmissionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activityCatalog, setActivityCatalog] = useState<ActivityCatalog[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityCatalog | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [calculatedCredits, setCalculatedCredits] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      SoTinChiQuyDoi: 0,
    },
  });

  const watchedValues = watch();

  // Fetch activity catalog
  useEffect(() => {
    const fetchActivityCatalog = async () => {
      try {
        const response = await fetch('/api/activities');
        if (response.ok) {
          const data = await response.json();
          setActivityCatalog(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch activity catalog:', error);
      }
    };

    fetchActivityCatalog();
  }, []);

  // Handle activity catalog selection
  useEffect(() => {
    if (watchedValues.MaDanhMuc) {
      const activity = activityCatalog.find(a => a.MaDanhMuc === watchedValues.MaDanhMuc);
      setSelectedActivity(activity || null);
      
      if (activity) {
        setValue('TenHoatDong', activity.TenDanhMuc);
      }
    } else {
      setSelectedActivity(null);
    }
  }, [watchedValues.MaDanhMuc, activityCatalog, setValue]);

  // Calculate credits automatically
  useEffect(() => {
    if (selectedActivity && watchedValues.SoGio) {
      const credits = watchedValues.SoGio * selectedActivity.TyLeQuyDoi;
      setCalculatedCredits(credits);
      setValue('SoTinChiQuyDoi', credits);
    } else if (!selectedActivity && watchedValues.SoTinChiQuyDoi !== undefined) {
      setCalculatedCredits(watchedValues.SoTinChiQuyDoi);
    }
  }, [selectedActivity, watchedValues.SoGio, watchedValues.SoTinChiQuyDoi, setValue]);

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
        ThoiGianBatDau: data.ThoiGianBatDau ? new Date(data.ThoiGianBatDau) : null,
        ThoiGianKetThuc: data.ThoiGianKetThuc ? new Date(data.ThoiGianKetThuc) : null,
        evidenceFiles: uploadedFiles.map(file => ({
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          checksum: file.checksum,
        })),
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
      setSelectedActivity(null);
      setCalculatedCredits(0);

      // Notify parent component
      if (onSubmit) {
        onSubmit(result.submission.MaGhiNhan);
      }

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/submissions');
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ghi nhận hoạt động</h1>
          <p className="text-gray-600 mt-1">Gửi hoạt động đào tạo liên tục để được phê duyệt</p>
        </div>
        
        {onCancel && (
          <GlassButton
            variant="ghost"
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800"
          >
            <X className="h-4 w-4 mr-2" />
            Hủy
          </GlassButton>
        )}
      </div>

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

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
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
                <Select onValueChange={(value) => setValue('MaNhanVien', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhân viên..." />
                  </SelectTrigger>
                  <SelectContent>
                    {practitioners.map((practitioner) => (
                      <SelectItem key={practitioner.MaNhanVien} value={practitioner.MaNhanVien}>
                        <div className="flex flex-col">
                          <span className="font-medium">{practitioner.HoVaTen}</span>
                          {practitioner.ChucDanh && (
                            <span className="text-sm text-gray-500">{practitioner.ChucDanh}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.MaNhanVien && (
                  <p className="text-sm text-red-600 mt-1">{errors.MaNhanVien.message}</p>
                )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Catalog Selection */}
            <div className="md:col-span-2">
              <Label htmlFor="MaDanhMuc">Chọn từ danh mục hoạt động (tùy chọn)</Label>
              <Select onValueChange={(value) => setValue('MaDanhMuc', value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hoạt động từ danh mục..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Hoạt động tự do (không từ danh mục)</SelectItem>
                  {activityCatalog.map((activity) => (
                    <SelectItem key={activity.MaDanhMuc} value={activity.MaDanhMuc}>
                      <div className="flex flex-col">
                        <span className="font-medium">{activity.TenDanhMuc}</span>
                        <span className="text-sm text-gray-500">
                          {activityTypeLabels[activity.LoaiHoatDong]} • {activity.TyLeQuyDoi}x tín chỉ
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

            {/* Role */}
            <div>
              <Label htmlFor="VaiTro">Vai trò trong hoạt động</Label>
              <Input
                id="VaiTro"
                {...register('VaiTro')}
                placeholder="VD: Học viên, Diễn giả, Tác giả..."
              />
            </div>

            {/* Hours */}
            <div>
              <Label htmlFor="SoGio">Số giờ tham gia</Label>
              <Input
                id="SoGio"
                type="number"
                step="0.5"
                min="0"
                {...register('SoGio', { valueAsNumber: true })}
                placeholder="0"
              />
              {selectedActivity && selectedActivity.GioToiThieu && (
                <p className="text-xs text-gray-500 mt-1">
                  Tối thiểu: {selectedActivity.GioToiThieu}h
                  {selectedActivity.GioToiDa && ` • Tối đa: ${selectedActivity.GioToiDa}h`}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="ThoiGianBatDau">Thời gian bắt đầu</Label>
              <Input
                id="ThoiGianBatDau"
                type="datetime-local"
                {...register('ThoiGianBatDau')}
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="ThoiGianKetThuc">Thời gian kết thúc</Label>
              <Input
                id="ThoiGianKetThuc"
                type="datetime-local"
                {...register('ThoiGianKetThuc')}
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
              <Label htmlFor="SoTinChiQuyDoi">Số tín chỉ quy đổi *</Label>
              <Input
                id="SoTinChiQuyDoi"
                type="number"
                step="0.1"
                min="0"
                {...register('SoTinChiQuyDoi', { valueAsNumber: true })}
                placeholder="0"
                disabled={!!selectedActivity && !!watchedValues.SoGio}
              />
              {errors.SoTinChiQuyDoi && (
                <p className="text-sm text-red-600 mt-1">{errors.SoTinChiQuyDoi.message}</p>
              )}
              
              {selectedActivity && watchedValues.SoGio && (
                <p className="text-sm text-green-600 mt-1">
                  Tự động tính: {watchedValues.SoGio}h × {selectedActivity.TyLeQuyDoi} = {calculatedCredits} tín chỉ
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="GhiChu">Ghi chú</Label>
              <Textarea
                id="GhiChu"
                {...register('GhiChu')}
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

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <GlassButton
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Hủy
            </GlassButton>
          )}
          
          <GlassButton
            type="submit"
            disabled={isLoading}
            className="bg-medical-blue hover:bg-medical-blue/90"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Gửi hoạt động
              </>
            )}
          </GlassButton>
        </div>
      </form>
    </div>
  );
}