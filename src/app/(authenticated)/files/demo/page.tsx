'use client';

import React, { useState } from 'react';
import { FileUpload, UploadedFile } from '@/components/ui/file-upload';
import { FileManager } from '@/components/ui/file-manager';
import { FileViewer } from '@/components/ui/file-viewer';
import { StorageMetrics } from '@/components/storage/storage-metrics';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { useAuth } from '@/lib/auth/hooks';
import { Upload, FileText, Shield } from 'lucide-react';

export default function FileUploadDemo() {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`/api/files/${filename}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      // Remove from local state
      setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleView = (file: UploadedFile) => {
    setViewingFile(file);
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    setError(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <GlassCard className="p-8 text-center max-w-md">
          <Shield className="h-12 w-12 text-medical-blue mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Yêu cầu đăng nhập
          </h2>
          <p className="text-gray-600">
            Vui lòng đăng nhập để sử dụng tính năng tải lên tệp.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <GlassCard className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Upload className="h-8 w-8 text-medical-blue" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800 page-title">
                Hệ thống tải lên tệp
              </h1>
              <p className="text-gray-600">
                Demo tính năng tải lên và quản lý tệp minh chứng
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-medical-blue" />
              <span>Hỗ trợ: PDF, JPG, PNG</span>
            </div>
            <div className="flex items-center space-x-2">
              <Upload className="h-4 w-4 text-medical-green" />
              <span>Tối đa: 10MB mỗi tệp</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-medical-amber" />
              <span>Lưu trữ: Cloudflare R2</span>
            </div>
          </div>
        </GlassCard>

        {/* Error Display */}
        {error && (
          <GlassCard className="p-4 border-l-4 border-medical-red bg-red-50/50">
            <p className="text-medical-red font-medium">Lỗi:</p>
            <p className="text-red-700">{error}</p>
          </GlassCard>
        )}

        {/* File Upload */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Tải lên tệp mới
          </h2>
          
          <FileUpload
            onUpload={handleUpload}
            onError={handleError}
            maxFiles={5}
            maxSize={10}
            activityId="demo-activity"
          />
        </GlassCard>

        {/* File Management */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Quản lý tệp
            </h2>
            
            {uploadedFiles.length > 0 && (
              <GlassButton
                variant="outline"
                size="sm"
                onClick={clearFiles}
              >
                Xóa tất cả
              </GlassButton>
            )}
          </div>

          <FileManager
            files={uploadedFiles}
            onDelete={handleDelete}
            onView={handleView}
            canDelete={['SoYTe', 'DonVi'].includes(user.role)}
          />
        </GlassCard>

        {/* Storage Metrics - SoYTe Only */}
        {user.role === 'SoYTe' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <span className="text-sm font-medium text-gray-600">Thống kê lưu trữ</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            </div>
            <StorageMetrics autoLoad={false} />
          </div>
        )}

        {/* Usage Instructions */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Hướng dẫn sử dụng
          </h2>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="font-medium text-medical-blue">1.</span>
              <span>Kéo thả tệp vào vùng tải lên hoặc nhấp để chọn tệp</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-medical-blue">2.</span>
              <span>Hệ thống sẽ tự động kiểm tra định dạng và kích thước tệp</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-medical-blue">3.</span>
              <span>Tệp được tải lên Cloudflare R2 với mã hóa SHA-256</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-medical-blue">4.</span>
              <span>Sử dụng các nút để xem, tải xuống hoặc xóa tệp</span>
            </div>
          </div>
        </GlassCard>

      {/* File Viewer Modal */}
      <FileViewer
        file={viewingFile}
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
      />
    </div>
  );
}