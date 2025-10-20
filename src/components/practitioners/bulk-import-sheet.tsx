'use client';

/**
 * Bulk Import Sheet Component
 * Allows DonVi users to import practitioners and activities via Excel in an off-canvas sheet
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Info, Eye, Upload } from 'lucide-react';
import { ValidationResult } from '@/lib/import/excel-processor';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface BulkImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

export function BulkImportSheet({ open, onOpenChange, onImportSuccess }: BulkImportSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    maxSize: 10 * 1024 * 1024 // 10MB
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

  // Execute import
  const handleImport = async () => {
    if (!file || !validationResult?.isValid) return;

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/execute', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Lỗi khi nhập dữ liệu');
      }

      setImportResult(result.data);
      setFile(null);
      setValidationResult(null);
      
      // Call success callback to refresh the list
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi nhập dữ liệu');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>Nhập dữ liệu hàng loạt</SheetTitle>
          <SheetDescription>
            Nhập thông tin nhân viên và hoạt động CNKT từ file Excel
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Download Template Button */}
          <Button
            onClick={handleDownloadTemplate}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Tải mẫu Excel
          </Button>

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
                  Chỉ chấp nhận file .xlsx, tối đa 10MB
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
                        <span>Xem trước số lượng nhân viên và hoạt động sẽ được nhập</span>
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {isValidating ? 'Đang kiểm tra...' : 'Xem trước & Kiểm tra'}
                </Button>
                <Button
                  onClick={() => {
                    setFile(null);
                    setValidationResult(null);
                    setError(null);
                  }}
                  variant="outline"
                  disabled={isValidating}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Hủy
                </Button>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Nhân viên</p>
                  <p className="text-xl font-bold text-blue-900">
                    {validationResult.practitionersCount}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 mb-1">Hoạt động</p>
                  <p className="text-xl font-bold text-green-900">
                    {validationResult.activitiesCount}
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

              {/* Success & Import Button */}
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
                  <div className="flex gap-3">
                    <Button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isImporting ? 'Đang nhập dữ liệu...' : 'Xác nhận & Nhập dữ liệu'}
                    </Button>
                    <Button
                      onClick={() => {
                        setFile(null);
                        setValidationResult(null);
                        setError(null);
                      }}
                      variant="outline"
                      disabled={isImporting}
                    >
                      Hủy
                    </Button>
                  </div>
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
                  Nhập dữ liệu thành công!
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <p className="text-xs text-green-600">Hoạt động</p>
                  <p className="text-xl font-bold text-green-900">
                    {importResult.activitiesCreated}
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
      </SheetContent>
    </Sheet>
  );
}
