'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

interface UnitDependencyCounts {
  childUnits: number;
  practitioners: number;
  userAccounts: number;
}

interface UnitDeleteDialogProps {
  open: boolean;
  unitId?: string | null;
  unitName?: string;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function UnitDeleteDialog({
  open,
  unitId,
  unitName,
  onOpenChange,
  onCompleted,
}: UnitDeleteDialogProps) {
  const { toast } = useToast();
  const [dependents, setDependents] = useState<UnitDependencyCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open || !unitId) {
      setDependents(null);
      setError(null);
      setConfirmation('');
      return;
    }

    const loadDependents = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/units/${unitId}?withDependencies=true`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Không thể tải dữ liệu phụ thuộc.');
        }

        setDependents(data.dependents ?? null);
      } catch (err) {
        console.error('Failed to load unit dependents', err);
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phụ thuộc.');
      } finally {
        setLoading(false);
      }
    };

    void loadDependents();
  }, [open, unitId]);

  const hasBlockingDependencies = useMemo(() => {
    if (!dependents) return false;
    return (
      dependents.childUnits > 0 ||
      dependents.practitioners > 0 ||
      dependents.userAccounts > 0
    );
  }, [dependents]);

  const confirmationMatches = unitName
    ? confirmation.trim().toLowerCase() === unitName.trim().toLowerCase()
    : false;

  const handleDelete = async () => {
    if (!unitId) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/units/${unitId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        if (data?.details) {
          setDependents(data.details as UnitDependencyCounts);
        }
        throw new Error(data?.message || data?.error || 'Không thể vô hiệu hóa đơn vị.');
      }

      toast({
        title: 'Đã vô hiệu hóa đơn vị',
        description: data?.unit?.TenDonVi ?? unitName,
      });
      onCompleted?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vô hiệu hóa đơn vị</DialogTitle>
          <DialogDescription>
            Thao tác này sẽ ẩn đơn vị khỏi mọi báo cáo và tắt các quyền truy cập liên quan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
            <p>
              Nhập tên đơn vị <strong>{unitName}</strong> để xác nhận vô hiệu hóa.
            </p>
          </div>

          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={unitName ?? 'Tên đơn vị'}
            disabled={isDeleting || loading}
          />

          {loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang kiểm tra dữ liệu phụ thuộc...
            </p>
          ) : (
            <div className="rounded-xl border border-gray-100 px-4 py-3 bg-white/80">
              <p className="text-sm font-medium text-gray-800 mb-2">Trạng thái phụ thuộc</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Đơn vị con đang hoạt động: {dependents?.childUnits ?? 0}</li>
                <li>Nhân sự đang hoạt động: {dependents?.practitioners ?? 0}</li>
                <li>Tài khoản đang hoạt động: {dependents?.userAccounts ?? 0}</li>
              </ul>
            </div>
          )}

          {(hasBlockingDependencies || error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {hasBlockingDependencies
                  ? 'Không thể vô hiệu hóa khi đơn vị còn dữ liệu hoạt động. Vui lòng chuyển hoặc vô hiệu hóa các đơn vị con, nhân sự, tài khoản liên quan trước.'
                  : error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={
                isDeleting ||
                loading ||
                hasBlockingDependencies ||
                !confirmationMatches ||
                !unitName
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Vô hiệu hóa
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
