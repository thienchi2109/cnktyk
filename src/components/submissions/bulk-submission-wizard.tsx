'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GlassProgress } from '@/components/ui/glass-progress';
import { CohortBuilder, CohortSelection } from '@/components/cohorts/cohort-builder';
import { cn } from '@/lib/utils';
import { ActivitySelector } from '@/components/submissions/activity-selector';
import { ActivityCatalogItem } from '@/hooks/use-activities';
import { PreviewAndConfirm } from '@/components/submissions/preview-and-confirm';

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
  { id: 2, title: 'Nhóm đối tượng', subtitle: 'Xác định nhóm đối tượng áp dụng' },
  { id: 3, title: 'Xem trước & xác nhận', subtitle: 'Kiểm tra kết quả trước khi tạo' },
];

export function BulkSubmissionWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedActivityId = searchParams.get('activityId');

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
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');

  const selectedActivityId = selectedActivity?.MaDanhMuc ?? '';
  const selectedActivityScope = selectedActivity ? (selectedActivity.MaDonVi ? 'unit' : 'global') : null;
  const scopeLabel = selectedActivityScope === 'global' ? 'Hệ thống' : selectedActivityScope === 'unit' ? 'Đơn vị' : null;

  const selectedCount = useMemo(() => {
    if (!selection) return 0;
    if (selection.mode === 'all') {
      return Math.max(0, selection.totalFiltered - selection.excludedIds.length);
    }
    return selection.selectedIds.length;
  }, [selection]);

  const eventValidationMessage = useMemo(() => {
    if (!eventStart || !eventEnd) return null;
    const start = new Date(eventStart);
    const end = new Date(eventEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    if (end < start) {
      return 'Ngày kết thúc phải sau ngày bắt đầu.';
    }
    return null;
  }, [eventStart, eventEnd]);

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

  const cohortValidationMessage = !hasCohortSelection && selection ? 'Vui lòng chọn ít nhất một nhân sự để tiếp tục.' : null;

  const handleContinueFromCohort = () => {
    if (!hasCohortSelection) {
      return;
    }
    setStep(3);
  };

  useEffect(() => {
    setSelection(null);
    setEventStart('');
    setEventEnd('');
  }, [selectedActivityId]);

  useEffect(() => {
    if ((step === 2 || step === 3) && !selectedActivity) {
      setStep(1);
    }
  }, [step, selectedActivity]);

  const fetchPreview = useCallback(async () => {
    if (!selection || !selectedActivity) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
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
  }, [selection, selectedActivity]);

  useEffect(() => {
    if (step !== 3) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    void fetchPreview();
  }, [step, fetchPreview]);

  useEffect(() => {
    setApplyResult(null);
    setApplyError(null);
  }, [selection, selectedActivity, eventStart, eventEnd]);

  const applyNow = async () => {
    if (!selection || !selectedActivity) return;
    if (eventValidationMessage) return;
    setApplyLoading(true);
    setApplyError(null);
    setApplyResult(null);
    try {
      const selectionPayload = {
        mode: selection.mode,
        selectedIds: selection.selectedIds,
        excludedIds: selection.excludedIds,
        totalFiltered: selection.totalFiltered,
        filters: selection.filters,
      };
      const conversionRate =
        typeof selectedActivity.TyLeQuyDoi === 'number'
          ? selectedActivity.TyLeQuyDoi
          : Number(selectedActivity.TyLeQuyDoi ?? 0) || 0;

      const activityPayload = {
        MaDanhMuc: selectedActivity.MaDanhMuc,
        TenHoatDong: selectedActivity.TenDanhMuc,
        LoaiHoatDong: selectedActivity.LoaiHoatDong,
        YeuCauMinhChung: selectedActivity.YeuCauMinhChung,
        NgayBatDau: eventStart ? new Date(eventStart).toISOString() : null,
        NgayKetThuc: eventEnd ? new Date(eventEnd).toISOString() : null,
        SoGioTinChiQuyDoi: conversionRate,
      };

      const res = await fetch('/api/cohorts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection: selectionPayload,
          activity: activityPayload,
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

  const handleNavigateToSubmissions = useCallback(() => {
    if (!selectedActivity) return;
    const params = new URLSearchParams();
    params.set('activityId', selectedActivity.MaDanhMuc);
    params.set('activityName', selectedActivity.TenDanhMuc);
    router.push(`/submissions?${params.toString()}`);
  }, [router, selectedActivity]);

  const currentStepIndex = wizardSteps.findIndex(item => item.id === step);
  const progressValue = ((currentStepIndex + 1) / wizardSteps.length) * 100;

  return (
    <div className="space-y-4 sm:space-y-6" role="main" aria-labelledby="wizard-title">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <GlassButton
            variant="outline"
            size="sm"
            onClick={() => router.push('/submissions')}
            className="flex w-fit items-center gap-2"
            aria-label="Quay lại danh sách ghi nhận"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Quay lại danh sách</span>
          </GlassButton>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 page-title" id="wizard-title">
              Ghi nhận hoạt động cho nhóm
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Hoàn tất 3 bước để tạo bản ghi hàng loạt cho nhóm đối tượng đã chọn.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3" role="navigation" aria-label="Tiến trình wizard">
        <GlassProgress
          value={progressValue}
          max={100}
          size="sm"
          aria-label={`Tiến trình: ${Math.round(progressValue)}%`}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          {wizardSteps.map((item, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = item.id === step;
            return (
              <GlassCard
                key={item.id}
                className={cn(
                  'p-3 sm:p-4 transition-colors',
                  isActive && 'border-medical-blue/60 bg-medical-blue/10 shadow-sm shadow-medical-blue/10',
                  isCompleted && 'border-green-500/40 bg-green-500/10'
                )}
                role="status"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Bước ${item.id}: ${item.title}. ${isCompleted ? 'Đã hoàn thành' : isActive ? 'Đang thực hiện' : 'Chưa hoàn thành'}`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={cn(
                      'flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                      isCompleted && 'border-green-500 bg-green-500 text-white',
                      isActive && !isCompleted && 'border-medical-blue bg-medical-blue text-white',
                      !isCompleted && !isActive && 'border-white/50 bg-white/20 text-gray-600'
                    )}
                    aria-hidden="true"
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : item.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-semibold truncate', isActive ? 'text-medical-blue' : 'text-gray-700')}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {step === 1 && (
        <GlassCard className="space-y-4 sm:space-y-6 p-4 sm:p-6" role="region" aria-labelledby="step1-title">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900" id="step1-title">
              Bước 1 · Chọn hoạt động
            </h2>
            <p className="text-sm text-gray-600">
              Tìm kiếm trong danh mục hoạt động được phân quyền cho đơn vị của bạn và chọn hoạt động cần ghi nhận.
            </p>
          </div>

          <ActivitySelector
            selectedActivityId={selectedActivityId}
            preselectedActivityId={preselectedActivityId || undefined}
            onSelect={activity => {
              setSelectedActivity(activity);
              setActivityValidationError(null);
            }}
          />

          {selectedActivity && (
            <GlassCard className="p-3 sm:p-4" role="status" aria-label="Hoạt động đã chọn">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{selectedActivity.TenDanhMuc}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Loại hoạt động: {activityTypeLabels[selectedActivity.LoaiHoatDong]}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
            <Alert className="border-red-200 bg-red-50" role="alert">
              <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <AlertDescription className="text-sm text-red-700">{activityValidationError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <GlassButton
              onClick={handleContinueFromActivity}
              disabled={!selectedActivity}
              aria-label="Tiếp tục đến bước chọn nhóm đối tượng"
            >
              Tiếp tục · Chọn nhóm đối tượng
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {step === 2 && (
        <div className="space-y-4" role="region" aria-labelledby="step2-title">
          {selectedActivity && (
            <GlassCard
              className="flex flex-col gap-3 sm:gap-4 border border-medical-blue/30 bg-medical-blue/5 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between"
              role="status"
              aria-label="Hoạt động đã chọn"
            >
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold text-medical-blue">Hoạt động đã chọn</p>
                <p className="text-base font-semibold text-gray-900">{selectedActivity.TenDanhMuc}</p>
                <p className="text-xs text-gray-600">
                  <span className="inline-block">Loại: {activityTypeLabels[selectedActivity.LoaiHoatDong]}</span>
                  <span className="mx-1 hidden sm:inline">·</span>
                  <span className="inline-block">{selectedActivity.YeuCauMinhChung ? 'Yêu cầu minh chứng' : 'Không yêu cầu minh chứng'}</span>
                  <span className="mx-1 hidden sm:inline">·</span>
                  <span className="inline-block">Phạm vi: {selectedActivityScope === 'global' ? 'Hệ thống' : 'Đơn vị'}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selectedActivityScope === 'global' ? 'secondary' : 'outline'}>
                  {selectedActivityScope === 'global' ? 'Hệ thống' : 'Đơn vị'}
                </Badge>
                <Badge variant={selectedActivity.YeuCauMinhChung ? 'default' : 'outline'}>
                  {selectedActivity.YeuCauMinhChung ? 'Cần minh chứng' : 'Không cần minh chứng'}
                </Badge>
                <GlassButton
                  size="sm"
                  variant="outline"
                  onClick={() => setStep(1)}
                  aria-label="Quay lại thay đổi hoạt động"
                >
                  Thay đổi hoạt động
                </GlassButton>
              </div>
            </GlassCard>
          )}

          <GlassCard className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900" id="step2-title">
                Bước 2 · Xây dựng nhóm đối tượng
              </h2>
              <p className="text-sm text-gray-600">
                Sử dụng bộ lọc để xác định đối tượng cần áp dụng. Bạn có thể chọn thủ công từng người hoặc áp dụng cho toàn bộ kết quả lọc.
              </p>
            </div>
            <CohortBuilder onChange={setSelection} />
          </GlassCard>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2" role="status" aria-label="Tóm tắt lựa chọn nhóm đối tượng">
              <Badge variant={selectedCount > 0 ? 'secondary' : 'outline'} aria-label={`Số lượng đã chọn: ${selectedCount}`}>
                Đã chọn: <span className="ml-1 font-semibold">{selectedCount}</span>
              </Badge>
              {selection && (
                <Badge variant="outline" aria-label={`Chế độ: ${selection.mode === 'all' ? 'Toàn bộ theo bộ lọc' : 'Chọn thủ công'}`}>
                  Chế độ: {selection.mode === 'all' ? 'Toàn bộ theo bộ lọc' : 'Chọn thủ công'}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" role="group" aria-label="Điều hướng">
              <GlassButton
                variant="secondary"
                onClick={() => setStep(1)}
                aria-label="Quay lại bước chọn hoạt động"
              >
                ← Quay lại
              </GlassButton>
              <GlassButton
                disabled={!hasCohortSelection}
                onClick={handleContinueFromCohort}
                aria-label={hasCohortSelection ? 'Tiếp tục đến xem trước' : 'Vui lòng chọn ít nhất một nhân sự'}
              >
                Tiếp tục · Xem trước
              </GlassButton>
            </div>
          </div>

          {cohortValidationMessage && (
            <Alert className="border-red-200 bg-red-50" role="alert">
              <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <AlertDescription className="text-sm text-red-700">{cohortValidationMessage}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {step === 3 && (
        <PreviewAndConfirm
          activity={selectedActivity}
          selection={selection}
          selectedCount={selectedCount}
          loadingPreview={loadingPreview}
          preview={preview}
          previewError={previewError}
          onRefreshPreview={() => {
            void fetchPreview();
          }}
          onBack={() => setStep(2)}
          onConfirm={() => {
            void applyNow();
          }}
          confirmDisabled={!selectedActivity || !hasCohortSelection || !!eventValidationMessage || applyLoading}
          applyLoading={applyLoading}
          applyError={applyError}
          applyResult={applyResult}
          onNavigateToSubmissions={handleNavigateToSubmissions}
          eventStart={eventStart}
          eventEnd={eventEnd}
          onChangeEventStart={setEventStart}
          onChangeEventEnd={setEventEnd}
          scopeLabel={scopeLabel}
          eventValidationMessage={eventValidationMessage}
        />
      )}
    </div>
  );
}
