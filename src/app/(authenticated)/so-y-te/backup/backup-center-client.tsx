'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  CalendarRange,
  DownloadCloud,
  Info,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingNotice from '@/components/ui/loading-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassProgress } from '@/components/ui/glass-progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const formatBytesReadable = (bytes: number) => {
  if (bytes <= 0 || Number.isNaN(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;

  return `${value.toFixed(precision)} ${units[exponent]}`;
};

type StatusTone = 'success' | 'error' | 'info';

type DeleteDialogStep = 'overview' | 'confirmation' | 'final';

interface BackupCenterClientProps {
  adminName: string;
}

export function BackupCenterClient({ adminName }: BackupCenterClientProps) {
  const today = useMemo(() => new Date(), []);
  const initialRange = useMemo(
    () => buildPresetRange({ months: 3, anchor: today }),
    [today],
  );
  const initialDeletionRange = useMemo(
    () => buildPresetRange({ months: 1, anchor: today }),
    [today],
  );

  const [startDate, setStartDate] = useState<Date | null>(initialRange.start);
  const [endDate, setEndDate] = useState<Date | null>(initialRange.end);
  const [activePreset, setActivePreset] = useState<string | null>('3mo');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>('info');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [downloadTotalBytes, setDownloadTotalBytes] = useState<number | null>(null);
  const [downloadTotalFiles, setDownloadTotalFiles] = useState<number | null>(null);

  const [deleteStartDate, setDeleteStartDate] = useState<Date | null>(
    initialDeletionRange.start,
  );
  const [deleteEndDate, setDeleteEndDate] = useState<Date | null>(
    initialDeletionRange.end,
  );
  const [deleteActivePreset, setDeleteActivePreset] = useState<string | null>(
    '1mo',
  );
  const [deleteValidationError, setDeleteValidationError] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState<string | null>(
    null,
  );
  const [deleteStatusTone, setDeleteStatusTone] =
    useState<StatusTone>('info');
  const [hasConfirmedBackup, setHasConfirmedBackup] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteDialogStep, setDeleteDialogStep] =
    useState<DeleteDialogStep>('overview');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const deleteCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const todayISO = useMemo(() => formatISODate(today), [today]);
  const deleteRangeLabel = useMemo(() => {
    const startLabel = deleteStartDate
      ? deleteStartDate.toLocaleDateString('vi-VN')
      : '—';
    const endLabel = deleteEndDate
      ? deleteEndDate.toLocaleDateString('vi-VN')
      : '—';
    return `${startLabel} → ${endLabel}`;
  }, [deleteEndDate, deleteStartDate]);

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

  const handleDeleteStartChange = useCallback((value: string) => {
    const nextValue = value ? new Date(`${value}T00:00:00`) : null;
    setDeleteStartDate(nextValue);
    setDeleteActivePreset(null);
    setDeleteValidationError(null);
    setDeleteStatusMessage(null);
    setDeleteStatusTone('info');
    setHasConfirmedBackup(false);
  }, []);

  const handleDeleteEndChange = useCallback((value: string) => {
    const nextValue = value ? new Date(`${value}T00:00:00`) : null;
    setDeleteEndDate(nextValue);
    setDeleteActivePreset(null);
    setDeleteValidationError(null);
    setDeleteStatusMessage(null);
    setDeleteStatusTone('info');
    setHasConfirmedBackup(false);
  }, []);

  const applyDeletePreset = useCallback(
    (presetId: string, months: number) => {
      const range = buildPresetRange({
        months,
        anchor: deleteEndDate ?? today,
      });
      setDeleteStartDate(range.start);
      setDeleteEndDate(range.end);
      setDeleteActivePreset(presetId);
      setDeleteValidationError(null);
      setDeleteStatusMessage(null);
      setDeleteStatusTone('info');
      setHasConfirmedBackup(false);
    },
    [deleteEndDate, today],
  );

  const clearDeleteCountdown = useCallback(() => {
    if (deleteCountdownTimerRef.current) {
      clearInterval(deleteCountdownTimerRef.current);
      deleteCountdownTimerRef.current = null;
    }
  }, []);

  const validateRange = useCallback(() => {
    if (!startDate || !endDate) {
      setValidationError('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.');
      return false;
    }

    if (startDate > endDate) {
      setValidationError('Ngày bắt đầu phải đứng trước ngày kết thúc.');
      return false;
    }

    if (!isRangeWithinYear(startDate, endDate)) {
      setValidationError('Khoảng thời gian không được vượt quá 1 năm.');
      return false;
    }

    setValidationError(null);
    return true;
  }, [endDate, startDate]);

  const validateDeletionRange = useCallback(() => {
    if (!deleteStartDate || !deleteEndDate) {
      setDeleteValidationError('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.');
      return false;
    }

    if (deleteStartDate > deleteEndDate) {
      setDeleteValidationError('Ngày bắt đầu phải đứng trước ngày kết thúc.');
      return false;
    }

    if (!isRangeWithinYear(deleteStartDate, deleteEndDate)) {
      setDeleteValidationError('Khoảng thời gian không được vượt quá 1 năm.');
      return false;
    }

    setDeleteValidationError(null);
    return true;
  }, [deleteEndDate, deleteStartDate]);

  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setDeleteDialogStep('overview');
        setDeleteConfirmationInput('');
        setDeleteCountdown(0);
        clearDeleteCountdown();
      }
      setIsDeleteDialogOpen(open);
    },
    [clearDeleteCountdown],
  );

  useEffect(() => {
    if (!isDeleteDialogOpen || deleteDialogStep !== 'final') {
      setDeleteCountdown(0);
      clearDeleteCountdown();
      return;
    }

    clearDeleteCountdown();
    setDeleteCountdown(5);

    const timer = setInterval(() => {
      setDeleteCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          deleteCountdownTimerRef.current = null;
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    deleteCountdownTimerRef.current = timer;

    return () => {
      clearInterval(timer);
      deleteCountdownTimerRef.current = null;
    };
  }, [clearDeleteCountdown, deleteDialogStep, isDeleteDialogOpen]);

  const openDeleteDialog = useCallback(() => {
    if (!hasConfirmedBackup) {
      return;
    }

    if (!validateDeletionRange()) {
      return;
    }

    setDeleteStatusMessage(null);
    setDeleteStatusTone('info');
    setDeleteDialogStep('overview');
    setDeleteConfirmationInput('');
    setDeleteCountdown(0);
    clearDeleteCountdown();
    setIsDeleteDialogOpen(true);
  }, [clearDeleteCountdown, validateDeletionRange]);

  const handleConfirmDeletion = useCallback(async () => {
    if (!validateDeletionRange()) {
      return;
    }

    if (!deleteStartDate || !deleteEndDate) {
      return;
    }

    setIsDeleting(true);
    setDeleteStatusTone('info');
    setDeleteStatusMessage('Hệ thống đang xóa minh chứng, vui lòng đợi...');

    try {
      const response = await fetch('/api/backup/delete-archived', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formatISODate(deleteStartDate),
          endDate: formatISODate(deleteEndDate),
          confirmationToken: 'DELETE',
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === 'string'
            ? payload.error
            : 'Không thể xóa minh chứng. Vui lòng thử lại.';
        throw new Error(errorMessage);
      }

      const parts: string[] = [];
      if (typeof payload?.deletedCount === 'number') {
        parts.push(`${payload.deletedCount} tệp đã xóa`);
      }
      if (typeof payload?.failedCount === 'number') {
        parts.push(`${payload.failedCount} tệp lỗi`);
      }
      if (typeof payload?.spaceMB === 'number') {
        parts.push(`giải phóng ${payload.spaceMB} MB`);
      }

      const detailSuffix =
        parts.length > 0 ? parts.join(' · ') : undefined;
      const summaryMessage =
        typeof payload?.message === 'string' && payload.message.trim().length > 0
          ? detailSuffix
            ? `${payload.message} (${detailSuffix})`
            : payload.message
          : detailSuffix
          ? `Hoàn tất xóa: ${detailSuffix}.`
          : 'Đã xóa minh chứng đã chọn.';

      setDeleteStatusTone('success');
      setDeleteStatusMessage(summaryMessage);
    } catch (error) {
      console.error('Delete archived files error:', error);
      setDeleteStatusTone('error');
      setDeleteStatusMessage(
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra khi xóa minh chứng. Vui lòng thử lại sau.',
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setDeleteDialogStep('overview');
      setDeleteConfirmationInput('');
      setDeleteCountdown(0);
      clearDeleteCountdown();
      setHasConfirmedBackup(false);
    }
  }, [
    clearDeleteCountdown,
    deleteEndDate,
    deleteStartDate,
    validateDeletionRange,
  ]);

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
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setDownloadTotalBytes(null);
    setDownloadTotalFiles(null);

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

      if (!response.body) {
        throw new Error('Trình duyệt của bạn không hỗ trợ tải xuống dạng streaming. Vui lòng thử lại bằng trình duyệt mới hơn.');
      }

      const totalBytesHeader = response.headers.get('X-Backup-Total-Bytes');
      const parsedTotalBytes = totalBytesHeader
        ? Number.parseInt(totalBytesHeader, 10)
        : Number.NaN;
      const totalBytes = Number.isFinite(parsedTotalBytes) && parsedTotalBytes > 0
        ? parsedTotalBytes
        : null;
      setDownloadTotalBytes(totalBytes);

      const totalFilesHeader = response.headers.get('X-Backup-Total-Files');
      const parsedTotalFiles = totalFilesHeader
        ? Number.parseInt(totalFilesHeader, 10)
        : Number.NaN;
      setDownloadTotalFiles(
        Number.isFinite(parsedTotalFiles) && parsedTotalFiles >= 0
          ? parsedTotalFiles
          : null,
      );

      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          const chunkCopy = value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
          );
          chunks.push(chunkCopy);
          receivedBytes += value.length;
          setDownloadedBytes(receivedBytes);

          if (totalBytes) {
            const percentage = Math.min(
              100,
              (receivedBytes / totalBytes) * 100,
            );
            setDownloadProgress(percentage);
          }
        }
      }

      reader.releaseLock();

      if (totalBytes) {
        setDownloadProgress(100);
      }

      const blob = new Blob(chunks, { type: 'application/zip' });
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^\";]+)"?/i);
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
      setDownloadProgress(0);
      setDownloadedBytes(0);
      setDownloadTotalBytes(null);
      setDownloadTotalFiles(null);
    }
  }, [endDate, startDate, validateRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
                  <span className="text-sm font-medium text-slate-600">
                    Từ ngày
                  </span>
                  <input
                    type="date"
                    value={formatISODate(startDate)}
                    max={endDate ? formatISODate(endDate) : undefined}
                    onChange={(event) => handleStartChange(event.target.value)}
                    className="rounded-lg border border-white/40 bg-white/60 px-4 py-3 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-medical-blue/60"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    Đến ngày
                  </span>
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
                {startDate ? startDate.toLocaleDateString('vi-VN') : '—'} →{' '}
                {endDate ? endDate.toLocaleDateString('vi-VN') : '—'}
              </p>
              {validationError && (
                <p className="text-sm font-medium text-red-600">
                  {validationError}
                </p>
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
              Chọn phạm vi thời gian để tải xuống bản sao lưu minh chứng đã được duyệt. Mỗi tệp chứa manifest chi tiết và các minh chứng trong khoảng thời gian đã chọn.
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
            downloadTotalBytes ? (
              <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/80 p-4">
                <GlassProgress value={downloadProgress} variant="solid" color="primary" />
                <p className="text-sm text-slate-600">
                  Đã tải {formatBytesReadable(downloadedBytes)}
                  {downloadTotalBytes ? ` / ${formatBytesReadable(downloadTotalBytes)}` : ''}
                  {downloadTotalFiles !== null ? ` · ${downloadTotalFiles} minh chứng` : ''}
                </p>
              </div>
            ) : (
              <LoadingNotice message="Hệ thống đang tổng hợp minh chứng và tạo tệp ZIP..." />
            )
          )}
        </GlassCard>

        <GlassCard className="space-y-6 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-500/15 p-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-800">
                Dọn dẹp minh chứng đã sao lưu
              </h2>
              <p className="text-slate-600">
                Sau khi lưu trữ bản sao an toàn, bạn có thể xóa minh chứng cũ để giải phóng dung lượng lưu trữ. Hành động này vĩnh viễn và không thể hoàn tác.
              </p>
            </div>
          </div>

          <div aria-live="polite" aria-atomic="true">
            {deleteStatusMessage && (
              <Alert
                variant={
                  deleteStatusTone === 'error' ? 'destructive' : 'default'
                }
                className={cn(
                  'border-l-4',
                  deleteStatusTone === 'success' &&
                    'border-green-400 bg-green-50',
                  deleteStatusTone === 'info' && 'border-blue-400 bg-blue-50',
                  deleteStatusTone === 'error' && 'border-red-400 bg-red-50',
                )}
              >
                <AlertTitle>
                  {deleteStatusTone === 'success'
                    ? 'Đã xóa minh chứng'
                    : deleteStatusTone === 'error'
                    ? 'Không thể xóa'
                    : 'Đang xử lý'}
                </AlertTitle>
                <AlertDescription>{deleteStatusMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700">
            <strong>Chỉ tiếp tục sau khi đã sao lưu thành công.</strong> Hãy đảm bảo bản sao lưu đã được kiểm tra và lưu trữ an toàn (Google Drive, NAS, ổ cứng ngoại...) trước khi xóa khỏi hệ thống.
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-white/70 p-4 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 rounded border-slate-300 accent-medical-blue focus:outline-none focus:ring-2 focus:ring-medical-blue/60"
              checked={hasConfirmedBackup}
              onChange={(event) => setHasConfirmedBackup(event.target.checked)}
            />
            <span>
              <strong>Tôi xác nhận đã tải xuống và lưu trữ bản sao lưu an toàn.</strong>{' '}
              Sao lưu phải được lưu ở ít nhất một vị trí ngoài hệ thống trước khi xóa minh chứng gốc.
            </span>
          </label>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    Từ ngày
                  </span>
                  <input
                    type="date"
                    value={formatISODate(deleteStartDate)}
                    max={deleteEndDate ? formatISODate(deleteEndDate) : undefined}
                    onChange={(event) =>
                      handleDeleteStartChange(event.target.value)
                    }
                    className="rounded-lg border border-white/40 bg-white/60 px-4 py-3 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-red-500/60"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    Đến ngày
                  </span>
                  <input
                    type="date"
                    value={formatISODate(deleteEndDate)}
                    min={
                      deleteStartDate ? formatISODate(deleteStartDate) : undefined
                    }
                    max={todayISO}
                    onChange={(event) =>
                      handleDeleteEndChange(event.target.value)
                    }
                    className="rounded-lg border border-white/40 bg-white/60 px-4 py-3 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-red-500/60"
                  />
                </label>
              </div>
              <p className="text-sm text-slate-500">
                Phạm vi đang chọn: {deleteRangeLabel}
              </p>
              {deleteValidationError && (
                <p className="text-sm font-medium text-red-600">
                  {deleteValidationError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
              {datePresets.map((preset) => (
                <GlassButton
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={
                    deleteActivePreset === preset.id ? 'danger' : 'ghost'
                  }
                  onClick={() => applyDeletePreset(preset.id, preset.months)}
                  disabled={isDeleting}
                >
                  {preset.label}
                </GlassButton>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Chỉ nên xóa sau khi đã sao lưu và kiểm tra tệp an toàn. Tác vụ sẽ loại bỏ hoàn toàn minh chứng khỏi Cloudflare R2 và ẩn liên kết tải xuống trong hệ thống.
            </div>
            <GlassButton
              size="lg"
              variant="danger"
              className="min-w-[240px]"
              onClick={openDeleteDialog}
              disabled={isDeleting || !hasConfirmedBackup}
            >
              <Trash2 className="mr-2 h-5 w-5" />
              {isDeleting ? 'Đang xóa minh chứng...' : 'Xóa minh chứng đã sao lưu'}
            </GlassButton>
          </div>

          {isDeleting && (
            <LoadingNotice message="Hệ thống đang xóa minh chứng đã sao lưu, vui lòng đợi..." />
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
                Thực hiện các bước dưới đây ngay sau khi tải xuống gói sao lưu để đảm bảo tuân thủ và bảo mật thông tin.
              </p>
            </div>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-slate-600">
            <li>Di chuyển tệp ZIP vào kho lưu trữ bảo mật nội bộ của Sở Y tế.</li>
            <li>Đặt tên thư mục theo cấu trúc <code>Backup/YYYY-MM-DD</code> để dễ tra cứu.</li>
            <li>Tạo bản sao dự phòng ít nhất một vị trí lưu trữ khác (NAS, ổ cứng ngoài).</li>
            <li>Ghi chép lịch sử sao lưu trong sổ theo dõi nội bộ hoặc hệ thống quản trị.</li>
          </ol>
          <div>
            <h3 className="font-semibold text-slate-700">Đề xuất nơi lưu trữ:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Google Drive/OneDrive với quyền truy cập hạn chế (chỉ đọc).</li>
              <li>Thiết bị NAS nội bộ cấu hình RAID và sao lưu định kỳ.</li>
              <li>Ổ cứng gắn ngoài được niêm phong và lưu tại tủ bảo mật.</li>
            </ul>
          </div>
        </GlassCard>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent className="max-w-lg">
          {deleteDialogStep === 'overview' && (
            <>
              <DialogHeader>
                <DialogTitle>Xác nhận phạm vi xóa minh chứng</DialogTitle>
                <DialogDescription>
                  Các minh chứng đã sao lưu trong khoảng <strong>{deleteRangeLabel}</strong> sẽ bị xóa vĩnh viễn khỏi Cloudflare R2.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50/70 p-4 text-sm text-red-700">
                  Thao tác này không thể hoàn tác. Đảm bảo bạn đã lưu bản sao vào kho lưu trữ an toàn trước khi tiếp tục.
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  <li>Tệp minh chứng sẽ bị xóa khỏi Cloudflare R2.</li>
                  <li>Liên kết tải minh chứng trong hệ thống bị vô hiệu hóa.</li>
                  <li>Hệ thống sẽ ghi lại đầy đủ thao tác trong nhật ký kiểm toán.</li>
                </ul>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDeleteDialogOpenChange(false)}
                  disabled={isDeleting}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogStep('confirmation')}
                  disabled={isDeleting}
                >
                  Tiếp tục
                </Button>
              </DialogFooter>
            </>
          )}

          {deleteDialogStep === 'confirmation' && (
            <>
              <DialogHeader>
                <DialogTitle>Nhập DELETE để tiếp tục</DialogTitle>
                <DialogDescription>
                  Nhập chính xác từ khóa <strong>DELETE</strong> để bật nút xác nhận.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  autoFocus
                  value={deleteConfirmationInput}
                  onChange={(event) =>
                    setDeleteConfirmationInput(event.target.value.toUpperCase())
                  }
                  placeholder="DELETE"
                  aria-label="Nhập DELETE để xác nhận"
                />
                <p className="text-sm text-slate-600">
                  Vui lòng nhập chữ hoa để xác nhận bạn hiểu hành động xóa vĩnh viễn.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogStep('overview')}
                  disabled={isDeleting}
                >
                  Quay lại
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogStep('final')}
                  disabled={deleteConfirmationInput !== 'DELETE' || isDeleting}
                >
                  Tiếp tục
                </Button>
              </DialogFooter>
            </>
          )}

          {deleteDialogStep === 'final' && (
            <>
              <DialogHeader>
                <DialogTitle>Xóa vĩnh viễn minh chứng?</DialogTitle>
                <DialogDescription>
                  Thao tác này sẽ xóa toàn bộ minh chứng đã sao lưu trong khoảng <strong>{deleteRangeLabel}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 p-4">
                  <AlertTriangle className="mt-1 h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-700">
                    Khi xác nhận, các tệp sẽ bị loại bỏ khỏi Cloudflare R2 và không thể khôi phục. Hãy chắc chắn rằng bản sao lưu đã được lưu trữ an toàn nhiều nơi.
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  {deleteCountdown > 0
                    ? `Bạn có thể xác nhận sau ${deleteCountdown} giây.`
                    : 'Bạn có thể xác nhận ngay bây giờ.'}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearDeleteCountdown();
                    setDeleteCountdown(0);
                    setDeleteDialogStep('confirmation');
                  }}
                  disabled={isDeleting}
                >
                  Quay lại
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDeletion}
                  disabled={deleteCountdown > 0 || isDeleting}
                >
                  {isDeleting ? 'Đang xóa...' : 'Xóa minh chứng'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
