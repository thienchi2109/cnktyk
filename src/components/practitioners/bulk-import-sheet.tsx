'use client';

/**
 * Bulk Import Sheet Component
 * Allows DonVi users to import practitioners via Excel in an off-canvas sheet
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Info, Eye, Upload, Loader2 } from 'lucide-react';
import { ValidationResult } from '@/lib/import/excel-processor';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ProgressPhase } from '@/lib/import/import-service';

interface BulkImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

// Helper functions
const getPhaseLabel = (phase: ProgressPhase): string => {
  const labels: Record<ProgressPhase, string> = {
    validation: 'Đang kiểm tra dữ liệu...',
    practitioners: 'Đang nhập nhân viên...',
    audit: 'Đang lưu nhật ký...'
  };
  return labels[phase];
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return '< 1 giây';
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes} phút`;
  return `${minutes} phút ${remainingSeconds} giây`;
};

export function BulkImportSheet({ open, onOpenChange, onImportSuccess }: BulkImportSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{
    phase: ProgressPhase;
    processed: number;
    total: number;
    percentage: number;
    estimatedTimeRemaining?: number;
    currentBatch?: number;
    totalBatches?: number;
  } | null>(null);

  // Reset state when sheet opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset on close
      setFile(null);
      setValidationResult(null);
      setImportResult(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/import/template');
      if (!response.ok) {
        throw new Error('Không thể tải file mẫu');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CNKTYKLT_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải file mẫu');
    }
  };

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setValidationResult(null);
      setImportResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  // Validate file
  const handleValidate = async () => {
    if (!file) return;

    setIsValidating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/validate', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Lỗi khi xác thực file');
      }

      setValidationResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xác thực file');
    } finally {
      setIsValidating(false);
    }
  };

  // Execute import with SSE progress tracking
  const handleImport = async () => {
    if (!file || !validationResult?.isValid) return;

    setIsImporting(true);
    setError(null);
    setImportProgress(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/execute', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Lỗi khi nhập dữ liệu');
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Không thể đọc dữ liệu phản hồi');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Timeout handler
      const timeoutMs = 180000; // 3 minutes
      const timeoutId = setTimeout(() => {
        reader.cancel();
        setError('Quá thời gian chờ - file có thể quá lớn');
        setIsImporting(false);
      }, timeoutMs);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === 'progress') {
                  setImportProgress(event.data);
                } else if (event.type === 'complete') {
                  clearTimeout(timeoutId);
                  setImportResult(event.data.result);
                  setFile(null);
                  setValidationResult(null);
                  setImportProgress(null);
                  
                  // Call success callback
                  if (onImportSuccess) {
                    onImportSuccess();
                  }
                } else if (event.type === 'error') {
                  clearTimeout(timeoutId);
                  throw new Error(event.data.error || 'Lỗi khi nhập dữ liệu');
                }
              } catch (parseError) {
                console.error('Failed to parse SSE event:', parseError);
              }
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi nhập dữ liệu');
      setImportProgress(null);
    } finally {
      setIsImporting(false);
    }
  };

  const showPreviewActions = !!file && !validationResult;
  const showImportActions = Boolean(validationResult?.isValid);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-2xl"
        side="right"
      >
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <SheetHeader>
            <SheetTitle>Nhập danh sách nhân viên</SheetTitle>
            <SheetDescription>
              Nhập thông tin nhân viên y tế từ file Excel
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 pb-12">
            {/* Template Reminder */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <h4 className="font-semibold mb-1">Luôn tải mẫu Excel mới nhất</h4>
                    <p className="text-xs sm:text-sm text-amber-800">
                      Vui lòng tải lại file mẫu trước mỗi lần nhập. Hệ thống sẽ từ chối các phiên bản cũ.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Tải mẫu Excel
                </Button>
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              `}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              {isDragActive ? (
                <p className="text-blue-600">Thả file vào đây...</p>
              ) : (
                <>
                  <p className="text-gray-700 mb-1">
                    Kéo thả file Excel vào đây hoặc click để chọn
                  </p>
                  <p className="text-sm text-gray-500">
                    Chỉ chấp nhận file .xlsx, tối đa 5MB
                  </p>
                </>
              )}
            </div>

            {/* Selected File */}
            {file && !validationResult && (
              <div className="space-y-4">
                {/* File Info */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>

                {/* Preview Tips */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-blue-900 mb-2">
                        Bước tiếp theo:
                      </h4>
                      <ul className="text-xs text-blue-800 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Hệ thống sẽ kiểm tra định dạng và nội dung file Excel</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Xem trước số lượng nhân viên sẽ được nhập</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Phát hiện và hiển thị các lỗi (nếu có) trước khi nhập</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Nhấn &quot;Xem trước&quot; để kiểm tra trước khi lưu vào hệ thống</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Results */}
            {validationResult && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Nhân viên</p>
                    <p className="text-xl font-bold text-blue-900">
                      {validationResult.practitionersCount}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-600 mb-1">Cảnh báo</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {validationResult.warnings.length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 mb-1">Lỗi</p>
                    <p className="text-xl font-bold text-red-900">
                      {validationResult.errors.length}
                    </p>
                  </div>
                </div>

                {/* Errors */}
                {validationResult.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <h3 className="font-semibold text-sm text-red-900">
                        Lỗi cần sửa ({validationResult.errors.length})
                      </h3>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {validationResult.errors.map((err, idx) => (
                        <div key={idx} className="text-xs text-red-800">
                          <span className="font-medium">
                            {err.sheet} - Dòng {err.row}, Cột {err.column}:
                          </span>{' '}
                          {err.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <h3 className="font-semibold text-sm text-yellow-900">
                        Cảnh báo ({validationResult.warnings.length})
                      </h3>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {validationResult.warnings.map((warn, idx) => (
                        <div key={idx} className="text-xs text-yellow-800">
                          <span className="font-medium">
                            {warn.sheet} - Dòng {warn.row}, Cột {warn.column}:
                          </span>{' '}
                          {warn.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success State */}
                {validationResult.isValid && (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-green-900 font-semibold text-sm">
                          File hợp lệ!
                        </p>
                      </div>
                      <p className="text-xs text-green-700 ml-7">
                        Dữ liệu đã được xác thực thành công. Nhấn nút bên dưới để lưu vào hệ thống.
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    {isImporting && importProgress && (
                      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-blue-900">
                            {getPhaseLabel(importProgress.phase)}
                          </span>
                          <span className="text-blue-700">
                            {importProgress.processed} / {importProgress.total}
                          </span>
                        </div>

                        <Progress value={importProgress.percentage} className="h-2" />

                        <div className="flex items-center justify-between text-xs text-blue-700">
                          <span>{importProgress.percentage}%</span>
                          {importProgress.estimatedTimeRemaining && (
                            <span>
                              Còn khoảng {formatDuration(importProgress.estimatedTimeRemaining)}
                            </span>
                          )}
                        </div>

                        {importProgress.totalBatches && (
                          <div className="text-xs text-blue-600">
                            Batch {importProgress.currentBatch} / {importProgress.totalBatches}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Import Success */}
            {importResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">
                    Nhập danh sách nhân viên thành công!
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-green-600">Nhân viên mới</p>
                    <p className="text-xl font-bold text-green-900">
                      {importResult.practitionersCreated}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Nhân viên cập nhật</p>
                    <p className="text-xl font-bold text-green-900">
                      {importResult.practitionersUpdated}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Kỳ CNKT</p>
                    <p className="text-xl font-bold text-green-900">
                      {importResult.cyclesCreated}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-900">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {(showPreviewActions || showImportActions) && (
          <div className="bg-white/95 px-6 py-4 backdrop-blur-sm">
            <div className="flex w-full flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              {showPreviewActions && (
                <>
                  <Button
                    type="button"
                    variant="outline-accent"
                    onClick={() => {
                      setFile(null);
                      setValidationResult(null);
                      setError(null);
                    }}
                    disabled={isValidating}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Hủy
                  </Button>
                  <Button
                    className="border border-primary/30 shadow-sm"
                    type="button"
                    onClick={handleValidate}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang kiểm tra...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Xem trước & Kiểm tra
                      </>
                    )}
                  </Button>
                </>
              )}

              {showImportActions && (
                <>
                  <Button
                    type="button"
                    variant="outline-accent"
                    onClick={() => {
                      setFile(null);
                      setValidationResult(null);
                      setError(null);
                    }}
                    disabled={isImporting}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting}
                    className="border border-emerald-400/40 bg-green-600 hover:bg-green-700 shadow-sm"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang nhập dữ liệu...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Xác nhận & Nhập dữ liệu
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
