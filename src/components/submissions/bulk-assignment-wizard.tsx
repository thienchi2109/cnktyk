'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CohortBuilder, CohortSelection } from '@/components/cohorts/cohort-builder';

export function BulkAssignmentWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selection, setSelection] = useState<CohortSelection | null>(null);
  const [preview, setPreview] = useState<null | { createCount: number; skipCount: number; duplicateCount: number; totalCandidates: number; sampleIds: string[] }>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<null | { created: number; skipped: number; total: number }>(null);

  const canProceed = !!selection && (selection.mode === 'all' ? selection.totalFiltered - selection.excludedIds.length > 0 : selection.selectedIds.length > 0);

  useEffect(() => {
    const runPreview = async () => {
      if (step !== 2 || !selection) return;
      setLoadingPreview(true);
      setPreviewError(null);
      try {
        const res = await fetch('/api/cohorts/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              search: selection.filters?.search,
              trangThai: selection.filters?.trangThai,
              chucDanh: selection.filters?.chucDanh,
              khoaPhong: selection.filters?.khoaPhong,
            },
            selection: {
              mode: selection.mode,
              selectedIds: selection.selectedIds,
              excludedIds: selection.excludedIds,
              totalFiltered: selection.totalFiltered,
            },
            activity: { TenHoatDong: 'Gán hoạt động hàng loạt' },
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Không thể xem trước');
        setPreview(json);
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      } finally {
        setLoadingPreview(false);
      }
    };
    runPreview();
  }, [step, selection]);

  const applyNow = async () => {
    if (!selection) return;
    setApplyLoading(true);
    setApplyError(null);
    setApplyResult(null);
    try {
      const res = await fetch('/api/cohorts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection: {
            mode: selection.mode,
            selectedIds: selection.selectedIds,
            excludedIds: selection.excludedIds,
            totalFiltered: selection.totalFiltered,
            filters: selection.filters,
          },
          activity: { TenHoatDong: 'Gán hoạt động hàng loạt' },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Không thể áp dụng');
      setApplyResult(json);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GlassButton
            variant="outline"
            size="sm"
            onClick={() => router.push('/submissions')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </GlassButton>
          <h1 className="text-2xl font-bold text-gray-900">Gán hoạt động cho nhóm</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className={step === 1 ? 'font-semibold text-medical-blue' : ''}>1. Chọn nhóm</span>
          <span>›</span>
          <span className={step === 2 ? 'font-semibold text-medical-blue' : ''}>2. Xem trước</span>
        </div>
      </div>

      {step === 1 && (
        <>
          <CohortBuilder onChange={setSelection} />
          <div className="flex justify-end">
            <GlassButton disabled={!canProceed} onClick={() => setStep(2)}>
              Tiếp tục → Xem trước
            </GlassButton>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <GlassCard className="p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Xem trước</h3>
            {!selection ? (
              <p className="text-gray-700 text-sm">Chưa có lựa chọn.</p>
            ) : loadingPreview ? (
              <p className="text-gray-700 text-sm">Đang tính toán xem trước…</p>
            ) : previewError ? (
              <Alert className="mt-2 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{previewError}</AlertDescription>
              </Alert>
            ) : preview ? (
              <div className="text-sm text-gray-800 space-y-2">
                <p>Tổng mục tiêu: <strong>{preview.totalCandidates}</strong></p>
                <p>Sẽ tạo mới: <strong className="text-green-700">{preview.createCount}</strong></p>
                <p>Bỏ qua (trùng): <strong className="text-yellow-700">{preview.skipCount}</strong></p>
                <p>Mẫu ID (tối đa 10): <span className="text-gray-600">{preview.sampleIds.join(', ') || '—'}</span></p>
              </div>
            ) : (
              <p className="text-gray-700 text-sm">Không có dữ liệu xem trước.</p>
            )}

            {applyError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{applyError}</AlertDescription>
              </Alert>
            )}
            {applyResult && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  Đã tạo: <strong>{applyResult.created}</strong> · Bỏ qua: <strong>{applyResult.skipped}</strong> · Tổng: <strong>{applyResult.total}</strong>
                </AlertDescription>
              </Alert>
            )}
          </GlassCard>
          <div className="flex justify-between">
            <GlassButton variant="secondary" onClick={() => setStep(1)}>← Quay lại</GlassButton>
            <GlassButton onClick={applyNow} disabled={!canProceed || applyLoading}>
              {applyLoading ? 'Đang áp dụng…' : 'Áp dụng ngay'}
            </GlassButton>
          </div>
        </>
      )}
    </div>
  );
}
