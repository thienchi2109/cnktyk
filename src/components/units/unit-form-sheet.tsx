'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2 } from 'lucide-react';

const CAP_QUAN_LY_OPTIONS = [
  { value: 'SoYTe', label: 'Sở Y Tế' },
  { value: 'BenhVien', label: 'Bệnh viện' },
  { value: 'TrungTam', label: 'Trung tâm' },
  { value: 'PhongKham', label: 'Phòng khám' },
] as const;

const SENTINEL_ROOT = 'ROOT';

const UnitFormSchema = z.object({
  TenDonVi: z
    .string()
    .trim()
    .min(3, 'Tên đơn vị phải có ít nhất 3 ký tự')
    .max(120, 'Tên đơn vị không được vượt quá 120 ký tự'),
  CapQuanLy: z.enum(['SoYTe', 'BenhVien', 'TrungTam', 'PhongKham']),
  MaDonViCha: z
    .union([z.string().uuid('Mã đơn vị cha không hợp lệ'), z.literal(null)])
    .optional(),
  TrangThai: z.boolean(),
});

type UnitFormValues = z.infer<typeof UnitFormSchema>;

export interface ManagedUnitRecord {
  MaDonVi: string;
  TenDonVi: string;
  CapQuanLy: string;
  MaDonViCha: string | null;
  TrangThai: boolean;
}

interface UnitFormSheetProps {
  open: boolean;
  mode: 'create' | 'edit';
  unitId?: string | null;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (unit: ManagedUnitRecord) => void;
}

type UnitTreeNode = ManagedUnitRecord & { children: UnitTreeNode[] };

function buildUnitForest(units: ManagedUnitRecord[]) {
  const nodeMap = new Map<string, UnitTreeNode>();
  units.forEach((unit) => {
    nodeMap.set(unit.MaDonVi, { ...unit, children: [] });
  });

  nodeMap.forEach((node) => {
    if (node.MaDonViCha && nodeMap.has(node.MaDonViCha)) {
      nodeMap.get(node.MaDonViCha)!.children.push(node);
    }
  });

  const sortNodes = (nodes: UnitTreeNode[]) => {
    nodes.sort((a, b) => a.TenDonVi.localeCompare(b.TenDonVi, 'vi-VN', { sensitivity: 'base' }));
    nodes.forEach((child) => sortNodes(child.children));
  };

  const roots = Array.from(nodeMap.values()).filter(
    (node) => !node.MaDonViCha || !nodeMap.has(node.MaDonViCha),
  );
  sortNodes(roots);

  return { roots, nodeMap };
}

async function fetchAllUnits(): Promise<ManagedUnitRecord[]> {
  const response = await fetch('/api/units?includeInactive=true', { cache: 'no-store' });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || 'Không thể tải danh sách đơn vị.');
  }

  return (payload?.units ?? []) as ManagedUnitRecord[];
}

async function fetchUnitById(id: string): Promise<ManagedUnitRecord> {
  const response = await fetch(`/api/units/${id}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || 'Không thể tải thông tin đơn vị.');
  }

  return payload.unit as ManagedUnitRecord;
}

export function UnitFormSheet({ open, mode, unitId, onOpenChange, onCompleted }: UnitFormSheetProps) {
  const { toast } = useToast();
  const [units, setUnits] = useState<ManagedUnitRecord[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitLoading, setUnitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(UnitFormSchema),
    defaultValues: {
      TenDonVi: '',
      CapQuanLy: 'BenhVien',
      MaDonViCha: null,
      TrangThai: true,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setSubmitError(null);
      return;
    }

    const loadUnits = async () => {
      try {
        setUnitsLoading(true);
        const unitList = await fetchAllUnits();
        setUnits(unitList);
      } catch (error) {
        console.error('Failed to load units', error);
        toast({
          title: 'Không thể tải danh sách đơn vị',
          description:
            error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
          variant: 'destructive',
        });
      } finally {
        setUnitsLoading(false);
      }
    };

    void loadUnits();
  }, [open, toast, form]);

  useEffect(() => {
    if (!open || mode === 'create' || !unitId) {
      if (mode === 'create') {
        form.reset({
          TenDonVi: '',
          CapQuanLy: 'BenhVien',
          MaDonViCha: null,
          TrangThai: true,
        });
      }
      return;
    }

    const loadUnit = async () => {
      try {
        setUnitLoading(true);
        const data = await fetchUnitById(unitId);
        form.reset({
          TenDonVi: data.TenDonVi,
          CapQuanLy: data.CapQuanLy as UnitFormValues['CapQuanLy'],
          MaDonViCha: data.MaDonViCha,
          TrangThai: Boolean(data.TrangThai),
        });
      } catch (error) {
        console.error('Failed to load unit detail', error);
        toast({
          title: 'Không thể tải thông tin đơn vị',
          description:
            error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
          variant: 'destructive',
        });
        onOpenChange(false);
      } finally {
        setUnitLoading(false);
      }
    };

    void loadUnit();
  }, [open, mode, unitId, form, toast, onOpenChange]);

  const parentOptions = useMemo(() => {
    if (units.length === 0) {
      return [];
    }

    const { roots, nodeMap } = buildUnitForest(units);
    const descendantIds = new Set<string>();

    if (mode === 'edit' && unitId && nodeMap.has(unitId)) {
      const stack = [...nodeMap.get(unitId)!.children];
      while (stack.length) {
        const node = stack.pop()!;
        descendantIds.add(node.MaDonVi);
        stack.push(...node.children);
      }
    }

    const flatten = (nodes: UnitTreeNode[], depth = 0): Array<{
      value: string;
      label: string;
      depth: number;
      disabled: boolean;
      active: boolean;
    }> => {
      return nodes.flatMap((node) => {
        const disabled =
          !node.TrangThai || node.MaDonVi === unitId || descendantIds.has(node.MaDonVi);

        return [
          {
            value: node.MaDonVi,
            label: node.TenDonVi,
            depth,
            disabled,
            active: node.TrangThai,
          },
          ...flatten(node.children, depth + 1),
        ];
      });
    };

    return flatten(roots);
  }, [units, mode, unitId]);

  const handleValidSubmit = async (values: UnitFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    if (mode === 'edit' && unitId && values.MaDonViCha && values.MaDonViCha === unitId) {
      form.setError('MaDonViCha', {
        type: 'manual',
        message: 'Không thể chọn chính đơn vị làm đơn vị cha',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: UnitFormValues = {
        ...values,
        MaDonViCha: values.MaDonViCha || null,
      };

      const endpoint = mode === 'create' ? '/api/units' : `/api/units/${unitId}`;
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Không thể lưu đơn vị.');
      }

      const savedUnit = data.unit as ManagedUnitRecord;
      toast({
        title: mode === 'create' ? 'Tạo đơn vị thành công' : 'Cập nhật đơn vị thành công',
        description: savedUnit.TenDonVi,
      });
      onCompleted?.(savedUnit);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentValue = form.watch('MaDonViCha') ?? null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onOpenChange(false);
        } else {
          onOpenChange(true);
        }
      }}
    >
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl"
      >
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {mode === 'create' ? 'Thêm đơn vị mới' : 'Chỉnh sửa thông tin đơn vị'}
            </SheetTitle>
            <SheetDescription>
              Quản lý cấu trúc đơn vị trong hệ thống. Cấp quản lý và quan hệ cha-con ảnh hưởng tới phân quyền.
            </SheetDescription>
          </SheetHeader>

          <form className="space-y-5" onSubmit={form.handleSubmit(handleValidSubmit)} id="unit-form">
            <div className="space-y-2">
              <Label htmlFor="TenDonVi">Tên đơn vị</Label>
              <Input
                id="TenDonVi"
                placeholder="Ví dụ: Bệnh viện Đa khoa Cần Thơ"
                {...form.register('TenDonVi')}
                disabled={isSubmitting || unitLoading}
              />
              {form.formState.errors.TenDonVi && (
                <p className="text-sm text-red-600">{form.formState.errors.TenDonVi.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cấp quản lý</Label>
              <Select
                value={form.watch('CapQuanLy')}
                onValueChange={(value) => form.setValue('CapQuanLy', value as UnitFormValues['CapQuanLy'])}
                disabled={isSubmitting || unitLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cấp quản lý" />
                </SelectTrigger>
                <SelectContent>
                  {CAP_QUAN_LY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.CapQuanLy && (
                <p className="text-sm text-red-600">{form.formState.errors.CapQuanLy.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Đơn vị cha</Label>
              <Select
                value={parentValue ?? SENTINEL_ROOT}
                onValueChange={(value) => {
                  form.setValue('MaDonViCha', value === SENTINEL_ROOT ? null : value);
                }}
                disabled={isSubmitting || unitLoading || unitsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đơn vị cha" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={SENTINEL_ROOT}>
                    <span className="text-gray-600">Không có (đơn vị gốc)</span>
                  </SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="text-gray-400"
                          style={{ paddingLeft: `${option.depth * 12}px` }}
                        >
                          {option.depth > 0 ? '└─' : ''}
                        </span>
                        <span>{option.label}</span>
                        {!option.active && (
                          <span className="ml-auto text-xs text-amber-600 uppercase">Ngưng hoạt động</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unitsLoading && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Đang tải danh sách đơn vị...
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100/80 bg-gray-50/80 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Trạng thái hoạt động</p>
                <p className="text-xs text-gray-500">Tắt để vô hiệu hóa đơn vị này.</p>
              </div>
              <Switch
                checked={form.watch('TrangThai')}
                onCheckedChange={(checked) => form.setValue('TrangThai', checked)}
                disabled={isSubmitting || unitLoading}
              />
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </form>
          <SheetFooter className="-mx-6 px-6 py-4 mt-6 bg-white sticky bottom-0">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button
                type="submit"
                form="unit-form"
                variant="medical"
                disabled={isSubmitting || unitLoading}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    {mode === 'create' ? 'Thêm đơn vị' : 'Cập nhật'}
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
