'use client';

import { useState } from 'react';
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
const PractitionerFormSchema = CreateNhanVienSchema.extend({
  Email: z.string().email('Invalid email format').optional().or(z.literal('')),
  DienThoai: z.string().regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format').optional().or(z.literal('')),
});

type PractitionerFormData = z.infer<typeof PractitionerFormSchema>;

interface PractitionerFormProps {
  initialData?: Partial<CreateNhanVien>;
  unitId?: string;
  units?: Array<{ MaDonVi: string; TenDonVi: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

export function PractitionerForm({
  initialData,
  unitId,
  units = [],
  onSuccess,
  onCancel,
  mode = 'create'
}: PractitionerFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PractitionerFormData>({
    resolver: zodResolver(PractitionerFormSchema),
    defaultValues: {
      HoVaTen: initialData?.HoVaTen || '',
      SoCCHN: initialData?.SoCCHN || '',
      NgayCapCCHN: initialData?.NgayCapCCHN || undefined,
      MaDonVi: initialData?.MaDonVi || unitId || '',
      TrangThaiLamViec: initialData?.TrangThaiLamViec || 'DangLamViec',
      Email: initialData?.Email || '',
      DienThoai: initialData?.DienThoai || '',
      ChucDanh: initialData?.ChucDanh || '',
    },
  });

  const onSubmit = async (data: PractitionerFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert empty strings to null for optional fields
      const submitData = {
        ...data,
        SoCCHN: data.SoCCHN || null,
        NgayCapCCHN: data.NgayCapCCHN || null,
        Email: data.Email || null,
        DienThoai: data.DienThoai || null,
        ChucDanh: data.ChucDanh || null,
      };

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save practitioner');
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Register New Practitioner' : 'Edit Practitioner'}
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? 'Add a new healthcare practitioner to the system'
            : 'Update practitioner information'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="HoVaTen">Full Name *</Label>
                <Input
                  id="HoVaTen"
                  {...form.register('HoVaTen')}
                  placeholder="Enter full name"
                  className={form.formState.errors.HoVaTen ? 'border-red-500' : ''}
                />
                {form.formState.errors.HoVaTen && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.HoVaTen.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ChucDanh">Position/Title</Label>
                <Input
                  id="ChucDanh"
                  {...form.register('ChucDanh')}
                  placeholder="e.g., Doctor, Nurse, Pharmacist"
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
                <Label htmlFor="DienThoai">Phone Number</Label>
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
            <h3 className="text-lg font-medium">License Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="SoCCHN">CCHN License Number</Label>
                <Input
                  id="SoCCHN"
                  {...form.register('SoCCHN')}
                  placeholder="Enter CCHN number"
                />
                <p className="text-sm text-gray-500">
                  Leave empty if not applicable
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="NgayCapCCHN">License Issue Date</Label>
                <Input
                  id="NgayCapCCHN"
                  type="date"
                  {...form.register('NgayCapCCHN', {
                    setValueAs: (value) => value ? new Date(value) : undefined
                  })}
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Work Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {units.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="MaDonVi">Healthcare Unit *</Label>
                  <Select
                    value={form.watch('MaDonVi')}
                    onValueChange={(value) => form.setValue('MaDonVi', value)}
                  >
                    <SelectTrigger className={form.formState.errors.MaDonVi ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
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
                <Label htmlFor="TrangThaiLamViec">Work Status</Label>
                <Select
                  value={form.watch('TrangThaiLamViec')}
                  onValueChange={(value) => form.setValue('TrangThaiLamViec', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DangLamViec">Active</SelectItem>
                    <SelectItem value="TamHoan">Suspended</SelectItem>
                    <SelectItem value="DaNghi">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {mode === 'create' ? 'Register Practitioner' : 'Update Practitioner'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}