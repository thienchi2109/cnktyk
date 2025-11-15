'use client';

import React, { useState } from 'react';
import { Download, Eye, Trash2, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { GlassCard } from './glass-card';
import { Button } from './button';
import { formatFileSize } from '@/lib/utils';
import { UploadedFile } from './file-upload';

export interface FileManagerProps {
  files: UploadedFile[];
  onDelete?: (filename: string) => void;
  onView?: (file: UploadedFile) => void;
  canDelete?: boolean;
  className?: string;
}

export function FileManager({
  files,
  onDelete,
  onView,
  canDelete = false,
  className = '',
}: FileManagerProps) {
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  const getFileIcon = (mimeType: string) => {
if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-medical-blue" />;
    }
    return <FileText className="h-5 w-5 text-medical-red" />;
  };

  const handleDelete = async (filename: string) => {
    if (!onDelete) return;

    setDeletingFiles(prev => new Set(prev).add(filename));
    
    try {
      await onDelete(filename);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(filename);
        return newSet;
      });
    }
  };

  const handleView = async (file: UploadedFile) => {
    if (onView) {
      onView(file);
      return;
    }

    // Default behavior: open in new tab using signed URL
    try {
      const response = await fetch(`/api/files/${file.filename}?action=signed-url`);
      const data = await response.json();
      
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('View error:', error);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const response = await fetch(`/api/files/${file.filename}?action=signed-url`);
      const data = await response.json();
      
      if (data.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = file.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (files.length === 0) {
    return (
      <GlassCard className={`p-6 text-center ${className}`}>
        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Chưa có tệp nào được tải lên</p>
      </GlassCard>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Tệp minh chứng ({files.length})
      </h4>
      
      {files.map((file) => (
        <GlassCard key={file.filename} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {getFileIcon(file.mimeType)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.originalName}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>
                    {new Date(file.uploadedAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* View Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(file)}
                className="text-gray-600 hover:text-medical-blue"
                title="Xem tệp"
              >
                <Eye className="h-4 w-4" />
              </Button>

              {/* Download Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(file)}
                className="text-gray-600 hover:text-medical-green"
                title="Tải xuống"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Delete Button */}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(file.filename)}
                  disabled={deletingFiles.has(file.filename)}
                  className="text-gray-600 hover:text-medical-red"
                  title="Xóa tệp"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
