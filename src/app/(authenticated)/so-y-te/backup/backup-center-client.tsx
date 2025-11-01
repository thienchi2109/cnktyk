'use client';

import { useCallback, useMemo, useState } from 'react';
import { CalendarRange, DownloadCloud, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingNotice from '@/components/ui/loading-notice';
import { cn } from '@/lib/utils/cn';
import {
  buildPresetRange,
  formatISODate,
  isRangeWithinYear,
} from './date-range-utils';

const datePresets = [
  { id: '1mo', label: '1 tháng', months: 1 },
  { id: '3mo', label: '3 tháng', months: 3 },
  { id: '6mo', label: '6 tháng', months: 6 },
  { id: '12mo', label: '1 năm', months: 12 },
] as const;

type StatusTone = 'success' | 'error' | 'info';

interface BackupCenterClientProps {
  adminName: string;
}

export function BackupCenterClient({ adminName }: BackupCenterClientProps) {
  const today = useMemo(() => new Date(), []);
  const initialRange = useMemo(
    () => buildPresetRange({ months: 3, anchor: today }),
    [today],
  );

  const [startDate, setStartDate] = useState<Date | null>(initialRange.start);
  const [endDate, setEndDate] = useState<Date | null>(initialRange.end);
  const [activePreset, setActivePreset] = useState<string | null>('3mo');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>('info');

  const todayISO = useMemo(() => formatISODate(today), [today]);

  const handleStartChange = useCallback((value: string) => {
    const nextValue = value ? new Date(`${value}T00:00:00`) : null;
    setStartDate(nextValue);
    setActivePreset(null);
    setValidationError(null);
    setStatusMessage(null);
  }, []);

  const handleEndChange = useCallback((value: string) => {
    const nextValue = value ? new Date(`${value}T00:00:00`) : null;
    setEndDate(nextValue);
    setActivePreset(null);
    setValidationError(null);
    setStatusMessage(null);
  }, []);

  const applyPreset = useCallback(
    (presetId: string, months: number) => {
      const range = buildPresetRange({
        months,
        anchor: endDate ?? today,
      });
      setStartDate(range.start);
      setEndDate(range.end);
      setActivePreset(presetId);
      setValidationError(null);
      setStatusMessage(null);
    },
    [endDate, today],
  );

  const validateRange = useCallback(() => {
    if (!startDate || !endDate) {
      setValidationError('Vui lòng chọn đủ ngày bắt đầu và kết thúc.');
      return false;
    }

    if (startDate > endDate) {
      setValidationError('Ngày bắt đầu phải trước ngày kết thúc.');
      return false;
    }

    if (!isRangeWithinYear(startDate, endDate)) {
      setValidationError('Khoảng thời gian không được vượt quá 1 năm.');
      return false;
    }

    setValidationError(null);
    return true;
  }, [startDate, endDate]);

  const handleDownload = useCallback(async () => {
    if (!validateRange()) {
      return;
    }

    if (!startDate || !endDate) {
      return;
    }

    setIsDownloading(true);
    setStatusTone('info');
    setStatusMessage('Đang tạo tệp sao lưu, vui lòng đợi...');

    try {
      const response = await fetch('/api/backup/evidence-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formatISODate(startDate),
          endDate: formatISODate(endDate),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errorMessage =
          typeof payload?.error === 'string'
            ? payload.error
            : 'Không thể tạo sao lưu. Vui lòng thử lại.';
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const fallbackFilename = `CNKTYKLT_Backup_${formatISODate(
        startDate,
      )}_to_${formatISODate(endDate)}.zip`;
      const filename = match?.[1] ?? fallbackFilename;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatusTone('success');
      setStatusMessage(
        'Sao lưu hoàn tất! Vui lòng kiểm tra thư mục tải xuống và lưu trữ tệp an toàn.',
      );
    } catch (error) {
      console.error('Backup download error:', error);
      setStatusTone('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra khi tạo sao lưu. Vui lòng thử lại sau.',
      );
    } finally {
      setIsDownloading(false);
    }
  }, [endDate, startDate, validateRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-medical-blue/20 p-3">
              <CalendarRange className="h-8 w-8 text-medical-blue" />
            </div>
            <div>
              <h1 className="text-balance text-3xl font-bold text-slate-900">
                Trung tâm Sao lưu minh chứng
              </h1>
              <p className="text-slate-600">
                Tạo bản sao lưu minh chứng đã được duyệt để lưu trữ ngoại tuyến.
              </p>
            </div>
          </div>
          <GlassButton variant="ghost" size="sm" disabled>
            {adminName}
          </GlassButton>
        </div>

        <GlassCard className="space-y-6 p-6">
          <div aria-live="polite" aria-atomic="true">
            {statusMessage && (
              <Alert
                variant={statusTone === 'error' ? 'destructive' : 'default'}
                className={cn(
                  'border-l-4',
                  statusTone === 'success' && 'border-green-400 bg-green-50',
                  statusTone === 'info' && 'border-blue-400 bg-blue-50',
                  statusTone === 'error' && 'border-red-400 bg-red-50',
                )}
              >
                <AlertTitle>
                  {statusTone === 'success'
                    ? 'Hoàn tất'
                    : statusTone === 'error'
                    ? 'Không thành công'
                    : 'Đang xử lý'}
                </AlertTitle>
                <AlertDescription>{statusMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-600">Từ ngày</span>
                  <input
                    type="date"
                    value={formatISODate(startDate)}
                    max={endDate ? formatISODate(endDate) : undefined}
                    onChange={(event) => handleStartChange(event.target.value)}
                    className="rounded-lg border border-white/40 bg-white/60 px-4 py-3 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-medical-blue/60"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-600">Đến ngày</span>
                  <input
                    type="date"
                    value={formatISODate(endDate)}
                    min={startDate ? formatISODate(startDate) : undefined}
                    max={todayISO}
                    onChange={(event) => handleEndChange(event.target.value)}
                    className="rounded-lg border border-white/40 bg-white/60 px-4 py-3 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-medical-blue/60"
                  />
                </label>
              </div>
              <p className="text-sm text-slate-500">
                Phạm vi đang chọn:{' '}
                {startDate ? startDate.toLocaleDateString('vi-VN') : '—'} &rarr;{' '}
                {endDate ? endDate.toLocaleDateString('vi-VN') : '—'}
              </p>
              {validationError && (
                <p className="text-sm font-medium text-red-600">{validationError}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
              {datePresets.map((preset) => (
                <GlassButton
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={activePreset === preset.id ? 'default' : 'ghost'}
                  onClick={() => applyPreset(preset.id, preset.months)}
                  disabled={isDownloading}
                >
                  {preset.label}
                </GlassButton>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Chọn phạm vi thời gian để tải xuống bản sao lưu minh chứng đã được duyệt. Mỗi tệp
              chứa manifest chi tiết và các tệp minh chứng trong khoảng thời gian đã chọn.
            </div>
            <GlassButton
              size="lg"
              className="min-w-[220px]"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <DownloadCloud className="mr-2 h-5 w-5" />
              {isDownloading ? 'Đang tạo sao lưu...' : 'Tải xuống sao lưu'}
            </GlassButton>
          </div>

          {isDownloading && (
            <LoadingNotice message="Hệ thống đang tổng hợp minh chứng và tạo tệp ZIP..." />
          )}
        </GlassCard>

        <GlassCard className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-medical-amber/20 p-2">
              <Info className="h-5 w-5 text-medical-amber" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-800">
                Hướng dẫn lưu trữ và đảm bảo an toàn dữ liệu
              </h2>
              <p className="text-slate-600">
                Thực hiện các bước dưới đây ngay sau khi tải xuống gói sao lưu để đảm bảo tuân thủ
                và bảo mật thông tin.
              </p>
            </div>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-slate-600">
            <li>Di chuyển tệp ZIP vào kho lưu trữ bảo mật nội bộ của Sở Y tế.</li>
            <li>Đặt tên thư mục theo cấu trúc <code>Backup/YYYY-MM-DD</code> để dễ tra cứu.</li>
            <li>Tạo bản sao dự phòng ở ít nhất một vị trí lưu trữ khác (NAS, ổ cứng ngoài).</li>
            <li>Ghi chú lịch sử sao lưu trong sổ theo dõi nội bộ hoặc hệ thống quản trị.</li>
          </ol>
          <div>
            <h3 className="font-semibold text-slate-700">Đề xuất nơi lưu trữ:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Google Drive/OneDrive với quyền truy cập hạn chế (chỉ đọc).</li>
              <li>Thiết bị NAS nội bộ được cấu hình RAID và sao lưu định kỳ.</li>
              <li>Ổ cứng gắn ngoài được niêm phong và lưu tại tủ bảo mật.</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
