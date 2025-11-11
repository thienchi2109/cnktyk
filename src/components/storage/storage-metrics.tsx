'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Database, HardDrive, FileText, RefreshCw, TrendingUp, PieChart } from 'lucide-react';

interface FileTypeData {
  extension: string;
  count: number;
  size: number;
  sizeFormatted: string;
  percentage: string;
}

interface StorageMetricsData {
  totalObjects: number;
  totalSize: number;
  totalSizeFormatted: string;
  fileTypes: FileTypeData[];
  lastCalculated: string;
}

interface StorageMetricsProps {
  autoLoad?: boolean;
}

export function StorageMetrics({ autoLoad = false }: StorageMetricsProps) {
  const [metrics, setMetrics] = useState<StorageMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/storage/metrics');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch storage metrics');
      }

      if (data.success) {
        setMetrics(data.data);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      fetchMetrics();
    }
  }, [autoLoad]);

  const getFileTypeIcon = (extension: string) => {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📁';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-8 w-8 text-medical-blue" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Thông tin lưu trữ R2
              </h2>
              <p className="text-gray-600">
                Chi tiết dung lượng và thống kê tập tin
              </p>
            </div>
          </div>

          <GlassButton
            onClick={fetchMetrics}
            disabled={loading}
            variant="default"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </GlassButton>
        </div>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <GlassCard className="p-4 border-l-4 border-medical-red bg-red-50/50">
          <p className="text-medical-red font-medium">Lỗi:</p>
          <p className="text-red-700">{error}</p>
        </GlassCard>
      )}

      {/* Metrics Display */}
      {metrics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-medical-blue/10 rounded-lg">
                  <FileText className="h-8 w-8 text-medical-blue" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tổng số tệp</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {metrics.totalObjects.toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-medical-green/10 rounded-lg">
                  <HardDrive className="h-8 w-8 text-medical-green" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dung lượng sử dụng</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {metrics.totalSizeFormatted}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* File Types Breakdown */}
          <GlassCard className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <PieChart className="h-6 w-6 text-medical-blue" />
              <h3 className="text-lg font-semibold text-gray-800">
                Phân loại theo định dạng
              </h3>
            </div>

            <div className="space-y-3">
              {metrics.fileTypes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Chưa có tệp nào trong hệ thống
                </p>
              ) : (
                metrics.fileTypes.map((fileType) => (
                  <div
                    key={fileType.extension}
                    className="flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/80 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {getFileTypeIcon(fileType.extension)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">
                          .{fileType.extension.toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {fileType.count} tệp
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        {fileType.sizeFormatted}
                      </p>
                      <p className="text-sm text-gray-600">
                        {fileType.percentage}% tổng dung lượng
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Additional Info */}
          <GlassCard className="p-4 bg-blue-50/50">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-medical-blue" />
              <span>
                Cập nhật lần cuối:{' '}
                {new Date(metrics.lastCalculated).toLocaleString('vi-VN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Cloudflare R2 cung cấp dung lượng lưu trữ không giới hạn.
              Bạn chỉ trả phí cho dung lượng thực tế sử dụng và băng thông.
            </p>
          </GlassCard>
        </>
      )}

      {/* Empty State */}
      {!metrics && !loading && !error && (
        <GlassCard className="p-12 text-center">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Chưa tải thông tin lưu trữ
          </h3>
          <p className="text-gray-600 mb-6">
            Nhấn nút "Làm mới" để xem thống kê chi tiết về dung lượng R2
          </p>
          <GlassButton onClick={fetchMetrics} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tải thông tin
          </GlassButton>
        </GlassCard>
      )}
    </div>
  );
}
