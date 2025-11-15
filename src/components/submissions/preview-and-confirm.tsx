'use client';

import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CohortSelection } from '@/components/cohorts/cohort-builder';
import { ActivityCatalogItem } from '@/hooks/use-activities';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export interface PreviewMetrics {
  createCount: number;
  skipCount: number;
  duplicateCount: number;
  totalCandidates: number;
  sampleIds: string[];
}

interface PreviewAndConfirmProps {
  activity: ActivityCatalogItem | null;
  selection: CohortSelection | null;
  selectedCount: number;
  loadingPreview: boolean;
  preview: PreviewMetrics | null;
  previewError: string | null;
  onRefreshPreview: () => void;
  onBack: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  applyLoading: boolean;
  applyError: string | null;
  applyResult: { created: number; skipped: number; total: number } | null;
  onNavigateToSubmissions: () => void;
  eventStart: string;
  eventEnd: string;
  onChangeEventStart: (value: string) => void;
  onChangeEventEnd: (value: string) => void;
  scopeLabel: string | null;
  eventValidationMessage?: string | null;
}

const activityTypeLabels: Record<ActivityCatalogItem['LoaiHoatDong'], string> = {
  KhoaHoc: 'Khóa học',
  HoiThao: 'Hội thảo',
  NghienCuu: 'Nghiên cứu',
  BaoCao: 'Báo cáo',
};

export function PreviewAndConfirm({
  activity,
  selection,
  selectedCount,
  loadingPreview,
  preview,
  previewError,
  onRefreshPreview,
  onBack,
  onConfirm,
  confirmDisabled,
  applyLoading,
  applyError,
  applyResult,
  onNavigateToSubmissions,
  eventStart,
  eventEnd,
  onChangeEventStart,
  onChangeEventEnd,
  scopeLabel,
  eventValidationMessage,
}: PreviewAndConfirmProps) {
  const filterChips = useMemo(() => {
    if (!selection?.filters) return [] as Array<{ label: string; value: string }>;
    const chips: Array<{ label: string; value: string }> = [];
    const { search, trangThai, chucDanh, khoaPhong } = selection.filters;
    if (search) chips.push({ label: 'Tìm kiếm', value: search });
    if (trangThai && trangThai !== 'all') chips.push({ label: 'Trạng thái', value: trangThai });
    if (chucDanh) chips.push({ label: 'Chức danh', value: chucDanh });
    if (khoaPhong) chips.push({ label: 'Khoa/Phòng', value: khoaPhong });
    return chips;
  }, [selection?.filters]);

  const sampleNames = useMemo(() => {
    if (!preview?.sampleIds?.length) return [] as Array<{ id: string; label: string }>;
    const store = selection?.nameMap ?? {};
    return preview.sampleIds.map((id) => ({
      id,
      label: store[id] ?? id,
    }));
  }, [preview?.sampleIds, selection?.nameMap]);

  return (
    <GlassCard className="space-y-6 p-4 sm:p-6" role="region" aria-label="Xem trước và xác nhận bản ghi hàng loạt">
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900" id="preview-confirm-heading">
            Bước 3 · Xem trước & xác nhận
          </h2>
          <p className="text-sm text-gray-600">
            Kiểm tra lại hoạt động, nhóm đối tượng được áp dụng và kết quả dự kiến trước khi tạo bản ghi hàng loạt.
          </p>
        </div>

        {activity && (
          <GlassCard
            className="space-y-2 border border-medical-blue/30 bg-medical-blue/5 p-3 sm:p-4"
            role="article"
            aria-labelledby="selected-activity-title"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-medical-blue" id="selected-activity-title">
                  {activity.TenDanhMuc}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="inline-block">Loại: {activityTypeLabels[activity.LoaiHoatDong]}</span>
                  <span className="mx-1 hidden sm:inline">·</span>
                  <span className="inline-block">{activity.YeuCauMinhChung ? 'Yêu cầu minh chứng' : 'Không yêu cầu minh chứng'}</span>
                  <span className="mx-1 hidden sm:inline">·</span>
                  <span className="inline-block">Phạm vi: {scopeLabel ?? '—'}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={scopeLabel === 'Hệ thống' ? 'secondary' : 'outline'} aria-label={`Phạm vi: ${scopeLabel ?? 'Không xác định'}`}>
                  {scopeLabel ?? 'Không xác định'}
                </Badge>
                <Badge
                  variant={activity.YeuCauMinhChung ? 'default' : 'outline'}
                  aria-label={activity.YeuCauMinhChung ? 'Yêu cầu minh chứng' : 'Không yêu cầu minh chứng'}
                >
                  {activity.YeuCauMinhChung ? 'Cần minh chứng' : 'Không cần minh chứng'}
                </Badge>
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard
          className="space-y-4 border border-slate-200/60 bg-white/40 p-3 sm:p-4"
          role="region"
          aria-labelledby="cohort-summary-title"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900" id="cohort-summary-title">
                Tóm tắt nhóm đối tượng
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {selection?.mode === 'all' ? 'Áp dụng cho toàn bộ kết quả theo bộ lọc' : 'Áp dụng cho các nhân sự được chọn thủ công'}
              </p>
            </div>
            <Badge variant={selectedCount > 0 ? 'secondary' : 'outline'} aria-label={`Số lượng đã chọn: ${selectedCount}`}>
              Đã chọn: <span className="ml-1 font-semibold">{selectedCount}</span>
            </Badge>
          </div>
          {filterChips.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="list" aria-label="Các bộ lọc đã áp dụng">
              {filterChips.map((chip) => (
                <span
                  key={`${chip.label}-${chip.value}`}
                  role="listitem"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                >
                  <span className="font-medium text-slate-800">{chip.label}:</span>
                  <span>{chip.value}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500" role="status">
              Không có bộ lọc bổ sung nào được áp dụng.
            </p>
          )}
        </GlassCard>

        <GlassCard
          className="space-y-4 border border-slate-200/60 bg-white/40 p-3 sm:p-4"
          role="region"
          aria-labelledby="event-time-title"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900" id="event-time-title">
              Thời gian hoạt động (tùy chọn)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Nếu để trống, hệ thống sẽ sử dụng thời điểm hiện tại.
            </p>
          </div>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600" htmlFor="bulk-event-start">
                Ngày bắt đầu
              </label>
              <Input
                id="bulk-event-start"
                type="datetime-local"
                value={eventStart}
                onChange={(event) => onChangeEventStart(event.target.value)}
                aria-describedby={eventValidationMessage ? 'event-validation-error' : undefined}
                aria-invalid={!!eventValidationMessage}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600" htmlFor="bulk-event-end">
                Ngày kết thúc
              </label>
              <Input
                id="bulk-event-end"
                type="datetime-local"
                value={eventEnd}
                onChange={(event) => onChangeEventEnd(event.target.value)}
                aria-describedby={eventValidationMessage ? 'event-validation-error' : undefined}
                aria-invalid={!!eventValidationMessage}
              />
            </div>
          </div>
          {eventValidationMessage && (
            <Alert className="border-red-200 bg-red-50" role="alert">
              <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <AlertDescription className="text-sm text-red-700" id="event-validation-error">
                {eventValidationMessage}
              </AlertDescription>
            </Alert>
          )}
        </GlassCard>

        <GlassCard
          className="space-y-4 border border-slate-200/60 bg-white/40 p-3 sm:p-4"
          role="region"
          aria-labelledby="preview-results-title"
          aria-live="polite"
          aria-busy={loadingPreview}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900" id="preview-results-title">
                Kết quả dự kiến
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Chạy thử xem trước để kiểm tra trùng lặp trước khi tạo.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefreshPreview}
              disabled={loadingPreview}
              aria-label={loadingPreview ? 'Đang tải xem trước' : 'Làm mới xem trước'}
            >
              {loadingPreview && <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />}
              {loadingPreview ? 'Đang chạy...' : 'Làm mới xem trước'}
            </Button>
          </div>
          {loadingPreview ? (
            <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Đang tải dữ liệu xem trước">
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <span className="sr-only">Đang tính toán xem trước…</span>
            </div>
          ) : previewError ? (
            <Alert className="border-red-200 bg-red-50" role="alert">
              <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <AlertDescription className="text-sm text-red-700">{previewError}</AlertDescription>
            </Alert>
          ) : preview ? (
            <div className="grid gap-3 sm:grid-cols-2" role="list" aria-label="Các chỉ số dự kiến">
              <MetricTile label="Tổng mục tiêu" value={preview.totalCandidates} accent="text-slate-900" />
              <MetricTile label="Sẽ tạo mới" value={preview.createCount} accent="text-green-700" />
              <MetricTile label="Trùng lặp" value={preview.duplicateCount} accent="text-amber-700" />
              <MetricTile label="Sẽ bỏ qua" value={preview.skipCount} accent="text-amber-800" />
            </div>
          ) : (
            <p className="text-sm text-gray-600" role="status">
              Chưa có dữ liệu xem trước.
            </p>
          )}
        </GlassCard>

        {sampleNames.length > 0 && (
          <GlassCard
            className="space-y-3 border border-slate-200/60 bg-white/40 p-3 sm:p-4"
            role="region"
            aria-labelledby="sample-names-title"
          >
            <p className="text-sm font-semibold text-gray-900" id="sample-names-title">
              Mẫu nhân sự (tối đa 10)
            </p>
            <div className="flex flex-wrap gap-2" role="list" aria-label="Danh sách mẫu nhân sự">
              {sampleNames.map((item) => (
                <span
                  key={item.id}
                  role="listitem"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs',
                    item.label === item.id ? 'text-slate-600' : 'text-slate-800'
                  )}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.label !== item.id && <span className="text-slate-400">({item.id})</span>}
                </span>
              ))}
            </div>
          </GlassCard>
        )}

        {applyError && (
          <Alert className="border-red-200 bg-red-50" role="alert">
            <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
            <AlertDescription className="text-sm text-red-700">{applyError}</AlertDescription>
          </Alert>
        )}

        {applyResult && (
          <Alert className="border-green-200 bg-green-50" role="status">
            <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            <AlertDescription className="space-y-2 text-sm text-green-800">
              <div>
                Đã tạo: <strong>{applyResult.created}</strong> · Bỏ qua: <strong>{applyResult.skipped}</strong> · Tổng: <strong>{applyResult.total}</strong>
              </div>
              <Button
                size="sm"
                variant="medical-secondary"
                onClick={onNavigateToSubmissions}
                aria-label="Mở danh sách ghi nhận theo hoạt động"
              >
                Mở danh sách ghi nhận theo hoạt động
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="group" aria-label="Điều hướng">
        <Button variant="outline" onClick={onBack} aria-label="Quay lại bước trước">
          ← Quay lại
        </Button>
        <Button
          onClick={onConfirm}
          disabled={confirmDisabled}
          aria-label={applyLoading ? 'Đang tạo bản ghi' : 'Xác nhận và tạo bản ghi hàng loạt'}
          aria-busy={applyLoading}
          variant="medical"
        >
          {applyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {applyLoading ? 'Đang tạo bản ghi…' : 'Xác nhận & tạo bản ghi'}
        </Button>
      </div>
    </GlassCard>
  );
}

interface MetricTileProps {
  label: string;
  value: number;
  accent: string;
}

function MetricTile({ label, value, accent }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 p-3 shadow-sm" role="listitem">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500" id={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        {label}
      </p>
      <p
        className={cn('mt-1 text-xl sm:text-2xl font-semibold', accent)}
        aria-labelledby={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {value.toLocaleString('vi-VN')}
      </p>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 p-3 shadow-sm">
      <Skeleton className="h-3 w-20 bg-slate-200" />
      <Skeleton className="mt-2 h-7 w-16 bg-slate-300" />
    </div>
  );
}
