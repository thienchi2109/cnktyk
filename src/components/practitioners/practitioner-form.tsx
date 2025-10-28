'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X } from 'lucide-react';
import { CreateNhanVienSchema, type CreateNhanVien } from '@/lib/db/schemas';

// Form schema with additional client-side validation
// Must omit MaDonVi from CreateNhanVienSchema first, then re-add with custom validation
// to avoid "Invalid uuid" error when form initializes with empty string
const PractitionerFormSchema = CreateNhanVienSchema
  .omit({ MaDonVi: true })
  .extend({
    MaDonVi: z.string().min(1, 'Vui lòng chọn đơn vị y tế'),
    TrangThaiLamViec: z.enum(['DangLamViec', 'DaNghi', 'TamHoan']).default('DangLamViec'),
    Email: z.string().email('Định dạng email không hợp lệ').optional().or(z.literal('')),
    DienThoai: z.string().regex(/^[0-9+\-\s()]*$/, 'Định dạng số điện thoại không hợp lệ').optional().or(z.literal('')),
    MaNhanVienNoiBo: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      // Validate MaDonVi is a valid UUID if provided
      if (data.MaDonVi && data.MaDonVi.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(data.MaDonVi);
      }
      return false; // MaDonVi is required
    },
    {
      message: 'Vui lòng chọn đơn vị y tế',
      path: ['MaDonVi'],
    }
  );

type PractitionerFormData = z.infer<typeof PractitionerFormSchema>;

interface PractitionerFormProps {
  initialData?: Partial<CreateNhanVien & { MaNhanVien?: string }>;
  unitId?: string;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  variant?: 'card' | 'sheet'; // 'card' for standalone pages, 'sheet' for off-canvas
  userRole?: 'SoYTe' | 'DonVi' | 'NguoiHanhNghe' | 'Auditor' | string;
}

export function PractitionerForm({
  initialData,
  unitId,
  units = [],
  onSuccess,
  onCancel,
  mode = 'create',
  variant = 'card',
  userRole
}: PractitionerFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof PractitionerFormSchema>>({
    resolver: zodResolver(PractitionerFormSchema) as any,
    defaultValues: {
      HoVaTen: initialData?.HoVaTen || '',
      SoCCHN: initialData?.SoCCHN || '',
      NgayCapCCHN: initialData?.NgayCapCCHN || undefined,
      MaDonVi: initialData?.MaDonVi || unitId || (units.length > 0 ? units[0].MaDonVi : ''),
      TrangThaiLamViec: initialData?.TrangThaiLamViec || 'DangLamViec',
      Email: initialData?.Email || '',
      DienThoai: initialData?.DienThoai || '',
      ChucDanh: initialData?.ChucDanh || '',
      MaNhanVienNoiBo: (initialData as any)?.MaNhanVienNoiBo || '',
    },
  });

  // Keep form in sync when initialData/units arrive asynchronously (edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const nextUnitId = initialData.MaDonVi || unitId || (units[0]?.MaDonVi ?? '');
      form.reset({
        HoVaTen: initialData.HoVaTen || '',
        SoCCHN: initialData.SoCCHN || '',
        // Provide string for date input; on submit, setValueAs converts to Date
        NgayCapCCHN: initialData.NgayCapCCHN
          ? new Date(initialData.NgayCapCCHN as any).toISOString().slice(0, 10)
          : undefined,
        MaDonVi: nextUnitId,
        TrangThaiLamViec: (initialData.TrangThaiLamViec as any) || 'DangLamViec',
        Email: (initialData.Email as any) || '',
        DienThoai: (initialData.DienThoai as any) || '',
        ChucDanh: (initialData.ChucDanh as any) || '',
        MaNhanVienNoiBo: (initialData as any)?.MaNhanVienNoiBo || '',
      } as any);
      form.clearErrors('MaDonVi');
    }
  }, [mode, initialData, unitId, units]);

  const isSelfLimited = userRole === 'NguoiHanhNghe' && mode === 'edit';
  const disableUnitChange = userRole === 'DonVi';

  const onSubmit = async (data: z.infer<typeof PractitionerFormSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Normalize and validate MaDonVi (ensure UUID string without whitespace)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let MaDonViValue = (data.MaDonVi || '').trim();
      // For DonVi role, force unit to current user's unitId
      if (userRole === 'DonVi' && unitId) {
        MaDonViValue = unitId;
      }
      if (!uuidRegex.test(MaDonViValue)) {
        setError('Vui lòng chọn đơn vị y tế hợp lệ');
        setIsLoading(false);
        return;
      }

      // Convert empty strings to null for optional fields
      const submitData: any = {
        ...data,
        MaDonVi: MaDonViValue,
        SoCCHN: data.SoCCHN || null,
        // NgayCapCCHN comes as string from date input; convert to Date or null
        NgayCapCCHN: data.NgayCapCCHN ? new Date(data.NgayCapCCHN as any) : null,
        Email: data.Email || null,
        DienThoai: data.DienThoai || null,
        ChucDanh: data.ChucDanh || null,
        MaNhanVienNoiBo: (data as any).MaNhanVienNoiBo ? (data as any).MaNhanVienNoiBo : null,
      };

      // DonVi and NguoiHanhNghe cannot change unit in edit mode; exclude MaDonVi from payload
      if (mode === 'edit' && (userRole === 'DonVi' || userRole === 'NguoiHanhNghe')) {
        delete submitData.MaDonVi;
      }

      const url = mode === 'create' ? '/api/practitioners' : `/api/practitioners/${initialData?.MaNhanVien}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        let errorPayload: any = {};
        try {
          errorPayload = await response.json();
        } catch {
          const text = await response.text();
          errorPayload = { error: text };
        }
        console.error('API Error:', errorPayload);
        const errorMsg = errorPayload.error || 'Failed to save practitioner';
        const errorDetails = errorPayload.details ? `\n${JSON.stringify(errorPayload.details, null, 2)}` : '';
        throw new Error(errorMsg + errorDetails);
      }

      const result = await response.json();
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/practitioners');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin cơ bản</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="HoVaTen">Họ và tên *</Label>
                <Input
                  id="HoVaTen"
                  {...form.register('HoVaTen')}
                  placeholder="Nhập họ và tên"
                  className={form.formState.errors.HoVaTen ? 'border-red-500' : ''}
                  disabled={isSelfLimited}
                />
                {form.formState.errors.HoVaTen && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.HoVaTen.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ChucDanh">Chức danh</Label>
                <Input
                  id="ChucDanh"
                  {...form.register('ChucDanh')}
                  placeholder="VD: Bác sĩ, Điều dưỡng, Dược sĩ"
                  disabled={isSelfLimited}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="Email">Email</Label>
                <Input
                  id="Email"
                  type="email"
                  {...form.register('Email')}
                  placeholder="practitioner@example.com"
                  className={form.formState.errors.Email ? 'border-red-500' : ''}
                />
                {form.formState.errors.Email && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.Email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="DienThoai">Số điện thoại</Label>
                <Input
                  id="DienThoai"
                  {...form.register('DienThoai')}
                  placeholder="+84 123 456 789"
                  className={form.formState.errors.DienThoai ? 'border-red-500' : ''}
                />
                {form.formState.errors.DienThoai && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.DienThoai.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* License Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin chứng chỉ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="SoCCHN">Số chứng chỉ hành nghề</Label>
                <Input
                  id="SoCCHN"
                  {...form.register('SoCCHN')}
                  placeholder="Nhập số CCHN"
                  disabled={isSelfLimited}
                />
                <p className="text-sm text-gray-500">
                  Để trống nếu không có
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="NgayCapCCHN">Ngày cấp chứng chỉ</Label>
                <Input
                  id="NgayCapCCHN"
                  type="date"
                  {...form.register('NgayCapCCHN', {
                    setValueAs: (value: string) => value ? new Date(value) : undefined
                  })}
                  disabled={isSelfLimited}
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin công tác</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {units.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="MaDonVi">Đơn vị y tế *</Label>
                  <Select
                    value={form.watch('MaDonVi')}
                    onValueChange={(value) => {
                      form.setValue('MaDonVi', value, { shouldValidate: true, shouldDirty: true });
                      form.clearErrors('MaDonVi');
                    }}
                    disabled={isSelfLimited || disableUnitChange}
                  >
                    <SelectTrigger className={form.formState.errors.MaDonVi ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Chọn đơn vị" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      {units.map((unit) => (
                        <SelectItem key={unit.MaDonVi} value={unit.MaDonVi}>
                          {unit.TenDonVi}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.MaDonVi && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.MaDonVi.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="TrangThaiLamViec">Trạng thái làm việc</Label>
                <Select
                  value={form.watch('TrangThaiLamViec')}
                  onValueChange={(value) => form.setValue('TrangThaiLamViec', value as any)}
                  disabled={isSelfLimited}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white">
                    <SelectItem value="DangLamViec">Đang làm việc</SelectItem>
                    <SelectItem value="TamHoan">Tạm hoãn</SelectItem>
                    <SelectItem value="DaNghi">Đã nghỉ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </form>
  );

  // Form action buttons (for card variant)
  const formActions = (
    <div className="flex justify-end space-x-4 pt-6 border-t">
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Hủy
        </Button>
      )}
      <Button
        type="submit"
        disabled={isLoading}
        onClick={form.handleSubmit(onSubmit as any)}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {mode === 'create' ? 'Đăng ký người hành nghề' : 'Cập nhật thông tin'}
      </Button>
    </div>
  );

  // Floating action buttons (for sheet variant)
  const floatingActions = (
    <div className="fixed bottom-6 right-6 flex gap-3 z-50">
      {/* Secondary Action Button - Cancel (only if onCancel provided) */}
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          size="lg"
        >
          <X className="w-5 h-5 mr-2" />
          Hủy
        </Button>
      )}
      
      {/* Primary Action Button - Save/Update */}
      <Button
        type="submit"
        disabled={isLoading}
        onClick={form.handleSubmit(onSubmit as any)}
        className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Save className="w-5 h-5 mr-2" />
        )}
        {mode === 'create' ? 'Đăng ký' : 'Cập nhật'}
      </Button>
    </div>
  );

  // Render with Card wrapper for standalone pages
  if (variant === 'card') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Đăng ký người hành nghề mới' : 'Chỉnh sửa người hành nghề'}
          </CardTitle>
          <CardDescription>
            {mode === 'create' 
              ? 'Thêm người hành nghề y tế mới vào hệ thống'
              : 'Cập nhật thông tin người hành nghề'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
          {formActions}
        </CardContent>
      </Card>
    );
  }

  // Render with floating action buttons for sheet/drawer context
  return (
    <>
      {formContent}
      {floatingActions}
    </>
  );
}
