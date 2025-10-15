'use client';

/**
 * Import Client Component
 * Handles file upload, validation, and import execution
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { ValidationResult, ValidationError } from '@/lib/import/excel-processor';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function ImportClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi nhập dữ liệu');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Người hành nghề', href: '/practitioners' },
          { label: 'Nhập dữ liệu hàng loạt' }
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Nhập dữ liệu hàng loạt
        </h1>
        <p className="text-gray-600">
          Nhập thông tin nhân viên và hoạt động CNKT từ file Excel
        </p>
      </div>

      {/* Download Template Button */}
      <div className="mb-6">
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Tải mẫu Excel
        </button>
      </div>

      {/* File Upload Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">Thả file vào đây...</p>
        ) : (
          <>
            <p className="text-lg text-gray-700 mb-2">
              Kéo thả file Excel vào đây hoặc click để chọn file
            </p>
            <p className="text-sm text-gray-500">
              Chỉ chấp nhận file .xlsx, tối đa 10MB
            </p>
          </>
        )}
      </div>

      {/* Selected File */}
      {file && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? 'Đang kiểm tra...' : 'Kiểm tra file'}
            </button>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && (
        <div className="mt-6 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Nhân viên</p>
              <p className="text-2xl font-bold text-blue-900">
                {validationResult.practitionersCount}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 mb-1">Hoạt động</p>
              <p className="text-2xl font-bold text-green-900">
                {validationResult.activitiesCount}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600 mb-1">Cảnh báo</p>
              <p className="text-2xl font-bold text-yellow-900">
                {validationResult.warnings.length}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 mb-1">Lỗi</p>
              <p className="text-2xl font-bold text-red-900">
                {validationResult.errors.length}
              </p>
            </div>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">
                  Lỗi cần sửa ({validationResult.errors.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {validationResult.errors.map((err, idx) => (
                  <div key={idx} className="text-sm text-red-800">
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
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-900">
                  Cảnh báo ({validationResult.warnings.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {validationResult.warnings.map((warn, idx) => (
                  <div key={idx} className="text-sm text-yellow-800">
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
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-900 font-medium">
                    File hợp lệ, sẵn sàng nhập dữ liệu
                  </p>
                </div>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isImporting ? 'Đang nhập...' : 'Nhập dữ liệu'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Success */}
      {importResult && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">
              Nhập dữ liệu thành công!
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-green-600">Nhân viên mới</p>
              <p className="text-2xl font-bold text-green-900">
                {importResult.practitionersCreated}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-600">Nhân viên cập nhật</p>
              <p className="text-2xl font-bold text-green-900">
                {importResult.practitionersUpdated}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-600">Hoạt động</p>
              <p className="text-2xl font-bold text-green-900">
                {importResult.activitiesCreated}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-600">Kỳ CNKT</p>
              <p className="text-2xl font-bold text-green-900">
                {importResult.cyclesCreated}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-900">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
