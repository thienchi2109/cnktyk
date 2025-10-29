'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { GlassModal } from './glass-modal';
import { GlassButton } from './glass-button';
import { UploadedFile } from './file-upload';

export interface FileViewerProps {
  file: UploadedFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FileViewer({ file, isOpen, onClose }: FileViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSignedUrl = React.useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/files/${file.filename}?action=signed-url`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load file');
      }

      setSignedUrl(data.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (file && isOpen) {
      loadSignedUrl();
    } else {
      setSignedUrl(null);
      setError(null);
    }
  }, [file, isOpen, loadSignedUrl]);

  const handleDownload = () => {
    if (!file || !signedUrl) return;

    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const renderFileContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-medical-blue mx-auto mb-2" />
            <p className="text-gray-600">Đang tải tệp...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-medical-red mb-2">Lỗi tải tệp</p>
            <p className="text-sm text-gray-600">{error}</p>
            <GlassButton
              onClick={loadSignedUrl}
              className="mt-4"
              variant="outline"
            >
              Thử lại
            </GlassButton>
          </div>
        </div>
      );
    }

    if (!signedUrl || !file) {
      return null;
    }

    // Render based on file type
if (file.mimeType.startsWith('image/')) {
      return (
        <div className="relative w-full h-[70vh] p-4">
          <Image
            src={signedUrl}
            alt={file.originalName}
            fill
            unoptimized
            className="object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    }

    if (file.mimeType === 'application/pdf') {
      return (
        <div className="h-[70vh]">
          <iframe
            src={signedUrl}
            className="w-full h-full rounded-lg"
            title={file.originalName}
          />
        </div>
      );
    }

    // For other file types, show download option
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Không thể xem trước loại tệp này
          </p>
          <GlassButton onClick={handleDownload}>
            Tải xuống để xem
          </GlassButton>
        </div>
      </div>
    );
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} size="xl">
      {file && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {file.originalName}
              </h3>
              <p className="text-sm text-gray-600">
                {file.mimeType} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {signedUrl && (
                <>
                  <GlassButton
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    title="Tải xuống"
                  >
                    <Download className="h-4 w-4" />
                  </GlassButton>

                  <GlassButton
                    variant="outline"
                    size="sm"
                    onClick={handleOpenExternal}
                    title="Mở trong tab mới"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </GlassButton>
                </>
              )}

              <GlassButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </GlassButton>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {renderFileContent()}
          </div>
        </>
      )}
    </GlassModal>
  );
}