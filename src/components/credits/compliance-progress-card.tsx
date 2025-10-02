/**
 * Compliance Progress Card Component
 * Displays practitioner's compliance cycle progress with circular indicator
 */

'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassCircularProgress } from '@/components/ui/glass-circular-progress';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ComplianceCycle } from '@/hooks/use-credit-cycle';

interface ComplianceProgressCardProps {
  cycle: ComplianceCycle | null;
  loading?: boolean;
}

export function ComplianceProgressCard({ cycle, loading }: ComplianceProgressCardProps) {
  if (loading) {
    return (
      <GlassCard className="p-6 animate-pulse">
        <div className="h-48 bg-white/20 rounded-lg"></div>
      </GlassCard>
    );
  }

  if (!cycle) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-medical-amber" />
          <p>Không tìm thấy thông tin chu kỳ tuân thủ</p>
        </div>
      </GlassCard>
    );
  }

  const getStatusColor = (status: ComplianceCycle['TrangThai']) => {
    switch (status) {
      case 'HoanThanh':
        return 'text-medical-green';
      case 'DangThucHien':
        return 'text-medical-blue';
      case 'SapHetHan':
        return 'text-medical-amber';
      case 'QuaHan':
        return 'text-medical-red';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: ComplianceCycle['TrangThai']) => {
    switch (status) {
      case 'HoanThanh':
        return 'Hoàn thành';
      case 'DangThucHien':
        return 'Đang thực hiện';
      case 'SapHetHan':
        return 'Sắp hết hạn';
      case 'QuaHan':
        return 'Quá hạn';
      default:
        return 'Không xác định';
    }
  };

  const getStatusIcon = (status: ComplianceCycle['TrangThai']) => {
    switch (status) {
      case 'HoanThanh':
        return <CheckCircle className="w-5 h-5" />;
      case 'DangThucHien':
        return <TrendingUp className="w-5 h-5" />;
      case 'SapHetHan':
      case 'QuaHan':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col items-center space-y-6">
        {/* Circular Progress */}
        <div className="relative">
          <GlassCircularProgress
            value={cycle.TyLeHoanThanh}
            size={180}
            strokeWidth={12}
            className="drop-shadow-lg"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-medical-blue">
              {Math.round(cycle.TyLeHoanThanh)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Hoàn thành</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/30 backdrop-blur-sm ${getStatusColor(cycle.TrangThai)}`}>
          {getStatusIcon(cycle.TrangThai)}
          <span className="font-semibold">{getStatusText(cycle.TrangThai)}</span>
        </div>

        {/* Credit Information */}
        <div className="w-full space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/20 rounded-lg">
            <span className="text-gray-700">Tín chỉ đạt được</span>
            <span className="text-xl font-bold text-medical-blue">
              {cycle.TongTinChiDatDuoc}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/20 rounded-lg">
            <span className="text-gray-700">Tín chỉ yêu cầu</span>
            <span className="text-xl font-bold text-gray-800">
              {cycle.TongTinChiYeuCau}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/20 rounded-lg">
            <span className="text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Số ngày còn lại
            </span>
            <span className={`text-xl font-bold ${cycle.SoNgayConLai < 180 ? 'text-medical-red' : 'text-medical-green'}`}>
              {cycle.SoNgayConLai} ngày
            </span>
          </div>
        </div>

        {/* Cycle Period */}
        <div className="w-full pt-4 border-t border-white/30">
          <div className="text-sm text-gray-600 text-center space-y-1">
            <div>Chu kỳ: {formatDate(cycle.NgayBatDau)}</div>
            <div>đến {formatDate(cycle.NgayKetThuc)}</div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
