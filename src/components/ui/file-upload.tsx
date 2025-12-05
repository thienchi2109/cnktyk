'use client';

import React, { useRef, useCallback } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from './glass-card';
import { Button } from './button';
import { formatFileSize } from '@/lib/utils';
import { useFileUpload, type UploadedFile, type FileWithStatus } from '@/hooks/useFileUpload';
import { formatCompressionRatio } from '@/lib/utils/fileProcessor';

export type { UploadedFile };

export interface FileUploadProps {
  onUpload?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  activityId?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onUpload,
  onError,
  maxFiles = 5,
  maxSize = 5,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  activityId,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const { files, addFiles, removeFile, isUploading } = useFileUpload({
    onSuccess: onUpload,
    onError,
    activityId,
    maxFiles,
    maxSize,
    acceptedTypes,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(Array.from(selectedFiles));
    }
    e.target.value = '';
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(Array.from(droppedFiles));
    }
  }, [disabled, addFiles]);

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const getStatusIcon = (file: FileWithStatus) => {
    switch (file.status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-medical-blue" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-medical-green" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-medical-red" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderCompressionStats = (file: FileWithStatus) => {
    if (!file.processedResult?.stats) return null;

    const { compressionRatio } = file.processedResult.stats;
    // Only show if there was actual compression (ratio > 0)
    if (compressionRatio <= 0) return null;

    return (
      <span className="text-medical-green text-xs ml-1">
        (Giảm {formatCompressionRatio(compressionRatio)})
      </span>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <GlassCard
        className={`
          relative border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragOver
            ? 'border-medical-blue bg-medical-blue/5'
            : 'border-gray-300 hover:border-medical-blue/50'
          }
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={!isUploading ? openFileDialog : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <Upload className={`
            mx-auto h-12 w-12 mb-4 transition-colors
            ${isDragOver ? 'text-medical-blue' : 'text-gray-400'}
          `} />

          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">
              {isDragOver ? 'Thả tệp vào đây' : 'Tải lên tệp minh chứng'}
            </p>
            <p className="text-sm text-gray-500">
              Kéo thả tệp hoặc nhấp để chọn
            </p>
            <p className="text-xs text-gray-400">
              Hỗ trợ: PDF, JPG, PNG, WebP • Tối đa {maxSize}MB • Tối đa {maxFiles} tệp
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </GlassCard>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Tệp đã chọn:</h4>

          {files.map((file) => (
            <GlassCard key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(file)}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatFileSize(file.file.size)}</span>
                      {file.status === 'processing' && (
                        <span className="text-blue-600">• Đang xử lý {file.progress}%</span>
                      )}
                      {file.status === 'uploading' && (
                        <span className="text-medical-blue">• Đang tải lên {file.progress}%</span>
                      )}
                      {file.status === 'error' && file.error && (
                        <span className="text-medical-red">• {file.error}</span>
                      )}
                      {file.status === 'success' && (
                        <>
                          <span className="text-medical-green">• Tải lên thành công</span>
                          {renderCompressionStats(file)}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file.status !== 'uploading' && file.status !== 'processing') {
                      removeFile(file.id);
                    }
                  }}
                  className="text-gray-400 hover:text-medical-red"
                  disabled={file.status === 'uploading' || file.status === 'processing'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              {(file.status === 'uploading' || file.status === 'processing') && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${file.status === 'processing' ? 'bg-blue-500' : 'bg-medical-blue'
                        }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
