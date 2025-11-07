'use client';

import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { CohortSelection } from '@/components/cohorts/cohort-builder';
import { ActivityCatalogItem } from '@/hooks/use-activities';
import { cn } from '@/lib/utils';

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
    <GlassCard className="space-y-6 p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-gray-900">Bước 3 · Xem trước & xác nhận</h2>
          <p className="text-sm text-gray-600">
            Kiểm tra lại hoạt động, cohort được áp dụng và kết quả dự kiến trước khi tạo bản ghi hàng loạt.
          </p>
        </div>

        {activity && (
          <GlassCard className="space-y-2 border border-medical-blue/30 bg-medical-blue/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-medical-blue">{activity.TenDanhMuc}</p>
                <p className="text-xs text-gray-600">
                  Loại: {activityTypeLabels[activity.LoaiHoatDong]} · {activity.YeuCauMinhChung ? 'Yêu cầu minh chứng' : 'Không yêu cầu minh chứng'} · Phạm vi: {scopeLabel ?? '—'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={scopeLabel === 'Hệ thống' ? 'secondary' : 'outline'}>{scopeLabel ?? 'Không xác định'}</Badge>
                <Badge variant={activity.YeuCauMinhChung ? 'default' : 'outline'}>
                  {activity.YeuCauMinhChung ? 'Cần minh chứng' : 'Không cần minh chứng'}
                </Badge>
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard className="space-y-4 border border-slate-200/60 bg-white/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Tóm tắt cohort</p>
              <p className="text-xs text-gray-600">
                {selection?.mode === 'all' ? 'Áp dụng cho toàn bộ kết quả theo bộ lọc' : 'Áp dụng cho các nhân sự được chọn thủ công'}
              </p>
            </div>
            <Badge variant={selectedCount > 0 ? 'secondary' : 'outline'}>
              Đã chọn: <span className="ml-1 font-semibold">{selectedCount}</span>
            </Badge>
          </div>
          {filterChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filterChips.map((chip) => (
                <span
                  key={`${chip.label}-${chip.value}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                >
                  <span className="font-medium text-slate-800">{chip.label}:</span>
                  <span>{chip.value}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Không có bộ lọc bổ sung nào được áp dụng.</p>
          )}
        </GlassCard>

        <GlassCard className="space-y-4 border border-slate-200/60 bg-white/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Thời gian hoạt động (tùy chọn)</p>
              <p className="text-xs text-gray-500">Nếu để trống, hệ thống sẽ sử dụng thời điểm hiện tại.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600" htmlFor="bulk-event-start">
                Ngày bắt đầu
              </label>
              <Input
                id="bulk-event-start"
                type="datetime-local"
                value={eventStart}
                onChange={(event) => onChangeEventStart(event.target.value)}
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
              />
            </div>
          </div>
          {eventValidationMessage && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-700">{eventValidationMessage}</AlertDescription>
            </Alert>
          )}
        </GlassCard>

        <GlassCard className="space-y-4 border border-slate-200/60 bg-white/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Kết quả dự kiến</p>
              <p className="text-xs text-gray-500">Chạy thử xem trước để kiểm tra trùng lặp trước khi tạo.</p>
            </div>
            <GlassButton size="sm" variant="outline" onClick={onRefreshPreview} disabled={loadingPreview}>
              {loadingPreview ? 'Đang chạy...' : 'Làm mới xem trước'}
            </GlassButton>
          </div>
          {loadingPreview ? (
            <p className="text-sm text-gray-600">Đang tính toán xem trước…</p>
          ) : previewError ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-700">{previewError}</AlertDescription>
            </Alert>
          ) : preview ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile label="Tổng mục tiêu" value={preview.totalCandidates} accent="text-slate-900" />
              <MetricTile label="Sẽ tạo mới" value={preview.createCount} accent="text-green-700" />
              <MetricTile label="Trùng lặp" value={preview.duplicateCount} accent="text-amber-700" />
              <MetricTile label="Sẽ bỏ qua" value={preview.skipCount} accent="text-amber-800" />
            </div>
          ) : (
            <p className="text-sm text-gray-600">Chưa có dữ liệu xem trước.</p>
          )}
        </GlassCard>

        {sampleNames.length > 0 && (
          <GlassCard className="space-y-3 border border-slate-200/60 bg-white/40 p-4">
            <p className="text-sm font-semibold text-gray-900">Mẫu nhân sự (tối đa 10)</p>
            <div className="flex flex-wrap gap-2">
              {sampleNames.map((item) => (
                <span
                  key={item.id}
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
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-sm text-red-700">{applyError}</AlertDescription>
          </Alert>
        )}

        {applyResult && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="space-y-2 text-sm text-green-800">
              <div>
                Đã tạo: <strong>{applyResult.created}</strong> · Bỏ qua: <strong>{applyResult.skipped}</strong> · Tổng: <strong>{applyResult.total}</strong>
              </div>
              <GlassButton size="sm" variant="outline" onClick={onNavigateToSubmissions}>
                Mở danh sách ghi nhận theo hoạt động
              </GlassButton>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GlassButton variant="secondary" onClick={onBack}>
          ← Quay lại
        </GlassButton>
        <GlassButton onClick={onConfirm} disabled={confirmDisabled}>
          {applyLoading ? 'Đang tạo bản ghi…' : 'Xác nhận & tạo bản ghi'}
        </GlassButton>
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
    <div className="rounded-lg border border-slate-200 bg-white/70 p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold', accent)}>{value}</p>
    </div>
  );
}
