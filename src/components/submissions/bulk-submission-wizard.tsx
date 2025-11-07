'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GlassProgress } from '@/components/ui/glass-progress';
import { CohortBuilder, CohortSelection } from '@/components/cohorts/cohort-builder';
import { cn } from '@/lib/utils';
import { ActivitySelector } from '@/components/submissions/activity-selector';
import { ActivityCatalogItem } from '@/hooks/use-activities';

type WizardStep = 1 | 2 | 3;

interface PreviewResponse {
  createCount: number;
  skipCount: number;
  duplicateCount: number;
  totalCandidates: number;
  sampleIds: string[];
}

const activityTypeLabels: Record<ActivityCatalogItem['LoaiHoatDong'], string> = {
  KhoaHoc: 'Khóa học',
  HoiThao: 'Hội thảo',
  NghienCuu: 'Nghiên cứu',
  BaoCao: 'Báo cáo',
};

const wizardSteps: Array<{ id: WizardStep; title: string; subtitle: string }> = [
  { id: 1, title: 'Hoạt động', subtitle: 'Chọn hoạt động cần ghi nhận' },
  { id: 2, title: 'Nhóm đối tượng', subtitle: 'Xác định cohort áp dụng' },
  { id: 3, title: 'Xem trước & xác nhận', subtitle: 'Kiểm tra kết quả trước khi tạo' },
];

export function BulkSubmissionWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityCatalogItem | null>(null);
  const [selection, setSelection] = useState<CohortSelection | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<null | { created: number; skipped: number; total: number }>(null);
  const [activityValidationError, setActivityValidationError] = useState<string | null>(null);

  const selectedActivityId = selectedActivity?.MaDanhMuc ?? '';
  const selectedActivityScope = selectedActivity ? (selectedActivity.MaDonVi ? 'unit' : 'global') : null;

  const handleContinueFromActivity = () => {
    if (!selectedActivity) {
      setActivityValidationError('Vui lòng chọn hoạt động trước khi tiếp tục.');
      return;
    }
    setActivityValidationError(null);
    setStep(2);
  };

  const hasCohortSelection = !!selectedActivity && !!selection && (
    selection.mode === 'all'
      ? selection.totalFiltered - selection.excludedIds.length > 0
      : selection.selectedIds.length > 0
  );

  useEffect(() => {
    setSelection(null);
  }, [selectedActivityId]);

  useEffect(() => {
    if ((step === 2 || step === 3) && !selectedActivity) {
      setStep(1);
    }
  }, [step, selectedActivity]);

  useEffect(() => {
    if (step !== 3) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const runPreview = async () => {
      if (!selection || !selectedActivity) return;
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
              filters: selection.filters,
            },
            activity: {
              MaDanhMuc: selectedActivity.MaDanhMuc,
              TenHoatDong: selectedActivity.TenDanhMuc,
              LoaiHoatDong: selectedActivity.LoaiHoatDong,
              YeuCauMinhChung: selectedActivity.YeuCauMinhChung,
            },
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
  }, [step, selection, selectedActivity]);

  useEffect(() => {
    setApplyResult(null);
    setApplyError(null);
  }, [selection, selectedActivity]);

  const applyNow = async () => {
    if (!selection || !selectedActivity) return;
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
          activity: {
            MaDanhMuc: selectedActivity.MaDanhMuc,
            TenHoatDong: selectedActivity.TenDanhMuc,
            LoaiHoatDong: selectedActivity.LoaiHoatDong,
            YeuCauMinhChung: selectedActivity.YeuCauMinhChung,
          },
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

  const currentStepIndex = wizardSteps.findIndex(item => item.id === step);
  const progressValue = ((currentStepIndex + 1) / wizardSteps.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <GlassButton
            variant="outline"
            size="sm"
            onClick={() => router.push('/submissions')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </GlassButton>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ghi nhận hoạt động cho nhóm</h1>
            <p className="text-sm text-gray-600">Hoàn tất 3 bước để tạo bản ghi hàng loạt cho cohort đã chọn.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <GlassProgress value={progressValue} max={100} size="sm" />
        <div className="grid gap-2 sm:grid-cols-3">
          {wizardSteps.map((item, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = item.id === step;
            return (
              <GlassCard
                key={item.id}
                className={cn(
                  'p-4 transition-colors',
                  isActive && 'border-medical-blue/60 bg-medical-blue/10 shadow-sm shadow-medical-blue/10',
                  isCompleted && 'border-green-500/40 bg-green-500/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                      isCompleted && 'border-green-500 bg-green-500 text-white',
                      isActive && !isCompleted && 'border-medical-blue bg-medical-blue text-white',
                      !isCompleted && !isActive && 'border-white/50 bg-white/20 text-gray-600'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : item.id}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', isActive ? 'text-medical-blue' : 'text-gray-700')}>{item.title}</p>
                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {step === 1 && (
        <GlassCard className="space-y-6 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-gray-900">Bước 1 · Chọn hoạt động</h2>
            <p className="text-sm text-gray-600">Tìm kiếm trong danh mục hoạt động được phân quyền cho đơn vị của bạn và chọn hoạt động cần ghi nhận.</p>
          </div>

          <ActivitySelector
            selectedActivityId={selectedActivityId}
            onSelect={activity => {
              setSelectedActivity(activity);
              setActivityValidationError(null);
            }}
          />

          {selectedActivity && (
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedActivity.TenDanhMuc}</p>
                  <p className="text-xs text-gray-600">
                    Loại hoạt động: {activityTypeLabels[selectedActivity.LoaiHoatDong]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedActivityScope === 'global' ? 'secondary' : 'outline'}>
                    {selectedActivityScope === 'global' ? 'Hệ thống' : 'Đơn vị'}
                  </Badge>
                  <Badge variant={selectedActivity.YeuCauMinhChung ? 'default' : 'outline'}>
                    {selectedActivity.YeuCauMinhChung ? 'Yêu cầu minh chứng' : 'Không yêu cầu minh chứng'}
                  </Badge>
                </div>
              </div>
            </GlassCard>
          )}

          {activityValidationError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-700">{activityValidationError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <GlassButton onClick={handleContinueFromActivity}>
              Tiếp tục · Chọn cohort
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <GlassCard className="p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Bước 2 · Xây dựng cohort</h2>
              <p className="text-sm text-gray-600">Sử dụng bộ lọc để xác định đối tượng cần áp dụng.</p>
            </div>
            <div className="mt-4">
              <CohortBuilder onChange={setSelection} />
            </div>
          </GlassCard>
          <div className="flex items-center justify-between">
            <GlassButton variant="secondary" onClick={() => setStep(1)}>
              ← Quay lại
            </GlassButton>
            <GlassButton disabled={!hasCohortSelection} onClick={() => setStep(3)}>
              Tiếp tục · Xem trước
            </GlassButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <GlassCard className="space-y-5 p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-gray-900">Bước 3 · Xem trước & xác nhận</h2>
              <p className="text-sm text-gray-600">Kiểm tra số lượng bản ghi sẽ tạo và các bản ghi bị bỏ qua.</p>
            </div>

            {selectedActivity && (
              <GlassCard className="space-y-2 border border-medical-blue/20 bg-medical-blue/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-medical-blue">{selectedActivity.TenDanhMuc}</p>
                    <p className="text-xs text-gray-600">Loại: {activityTypeLabels[selectedActivity.LoaiHoatDong]}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{selectedActivity.YeuCauMinhChung ? 'Cần minh chứng' : 'Không cần minh chứng'}</span>
                    <span>•</span>
                    <span>{selectedActivityScope === 'global' ? 'Phạm vi: Hệ thống' : 'Phạm vi: Đơn vị'}</span>
                  </div>
                </div>
              </GlassCard>
            )}

            <GlassCard className="p-5">
              {!selection ? (
                <p className="text-sm text-gray-600">Chưa có dữ liệu cohort.</p>
              ) : loadingPreview ? (
                <p className="text-sm text-gray-600">Đang tính toán xem trước…</p>
              ) : previewError ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{previewError}</AlertDescription>
                </Alert>
              ) : preview ? (
                <div className="space-y-3 text-sm text-gray-800">
                  <p>
                    Tổng mục tiêu: <strong>{preview.totalCandidates}</strong>
                  </p>
                  <p>
                    Sẽ tạo mới: <strong className="text-green-700">{preview.createCount}</strong>
                  </p>
                  <p>
                    Bỏ qua (trùng): <strong className="text-yellow-700">{preview.skipCount}</strong>
                  </p>
                  <p>
                    Mẫu ID (tối đa 10):{' '}
                    <span className="text-gray-600">{preview.sampleIds.join(', ') || '—'}</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Không có dữ liệu xem trước.</p>
              )}
            </GlassCard>

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

          <div className="flex items-center justify-between">
            <GlassButton variant="secondary" onClick={() => setStep(2)}>
              ← Quay lại
            </GlassButton>
            <GlassButton onClick={applyNow} disabled={!hasCohortSelection || !selectedActivity || applyLoading}>
              {applyLoading ? 'Đang tạo bản ghi…' : 'Xác nhận & tạo bản ghi'}
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  );
}
