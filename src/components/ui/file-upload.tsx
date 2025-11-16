'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from './glass-card';
import { Button } from './button';
import { formatFileSize } from '@/lib/utils';

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

export interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  checksum: string;
  url: string;
  uploadedAt: string;
  activityId?: string;
}

interface FileWithProgress extends File {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export function FileUpload({
  onUpload,
  onError,
  maxFiles = 5,
  maxSize = 5,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'],
  activityId,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'Loại tệp không được hỗ trợ. Chỉ chấp nhận PDF, JPG, PNG.';
    }
    if (file.size > maxSize * 1024 * 1024) {
      return `Kích thước tệp vượt quá ${maxSize}MB.`;
    }
    return null;
  }, [acceptedTypes, maxSize]);

  const uploadFile = async (file: FileWithProgress): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    if (activityId) {
      formData.append('activityId', activityId);
    }

    try {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'success', progress: 100, uploadedFile: result.file }
          : f
      ));

      // Notify parent component
      if (onUpload) {
        const uploadedFiles = files
          .filter(f => f.status === 'success' && f.uploadedFile)
          .map(f => f.uploadedFile!);
        uploadedFiles.push(result.file);
        onUpload(uploadedFiles);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      if (onError) {
        onError(`Chỉ có thể tải lên tối đa ${maxFiles} tệp.`);
      }
      return;
    }

    const validFiles: FileWithProgress[] = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        if (onError) {
          onError(`${file.name}: ${error}`);
        }
        continue;
      }

      const fileWithProgress: FileWithProgress = Object.assign(file, {
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        progress: 0,
        status: 'pending' as const,
      });

      validFiles.push(fileWithProgress);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      
      // Start uploading files
      validFiles.forEach(file => {
        uploadFile(file);
      });
    }
  }, [files.length, maxFiles, validateFile, onError]);

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
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const getStatusIcon = (file: FileWithProgress) => {
    switch (file.status) {
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
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={openFileDialog}
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
              Hỗ trợ: PDF, JPG, PNG • Tối đa {maxSize}MB • Tối đa {maxFiles} tệp
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
          disabled={disabled}
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
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'uploading' && (
                        <span>• Đang tải lên {file.progress}%</span>
                      )}
                      {file.status === 'error' && file.error && (
                        <span className="text-medical-red">• {file.error}</span>
                      )}
                      {file.status === 'success' && (
                        <span className="text-medical-green">• Tải lên thành công</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="text-gray-400 hover:text-medical-red"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              {file.status === 'uploading' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-medical-blue h-1 rounded-full transition-all duration-300"
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
