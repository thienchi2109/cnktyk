/**
 * Credit History Table Component
 * Displays practitioner's credit history with approval status
 */

'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import type { CreditHistory } from '@/hooks/use-credit-cycle';
import { useState } from 'react';
import { CreditDetailModal } from './credit-detail-modal';

interface CreditHistoryTableProps {
  creditHistory: CreditHistory[];
  loading?: boolean;
}

const statusConfig = {
  'DaDuyet': {
    label: 'Đã duyệt',
    color: 'bg-medical-green/20 text-medical-green border-medical-green/30',
    icon: CheckCircle
  },
  'TuChoi': {
    label: 'Từ chối',
    color: 'bg-medical-red/20 text-medical-red border-medical-red/30',
    icon: XCircle
  },
  'ChoDuyet': {
    label: 'Chờ duyệt',
    color: 'bg-medical-amber/20 text-medical-amber border-medical-amber/30',
    icon: Clock
  }
};

export function CreditHistoryTable({ creditHistory, loading }: CreditHistoryTableProps) {
  const [selectedCredit, setSelectedCredit] = useState<CreditHistory | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  if (loading) {
    return (
      <GlassCard className="p-6 animate-pulse">
        <div className="h-96 bg-white/20 rounded-lg"></div>
      </GlassCard>
    );
  }

  if (creditHistory.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Lịch sử tín chỉ
        </h3>
        <div className="text-center text-gray-500 py-8">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Chưa có lịch sử hoạt động</p>
        </div>
      </GlassCard>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <>
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        Lịch sử tín chỉ
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/30">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Ngày ghi nhận
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Tên hoạt động
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Loại
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Tín chỉ
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {creditHistory.map((item, index) => {
              const status = statusConfig[item.TrangThaiDuyet as keyof typeof statusConfig] || statusConfig['ChoDuyet'];
              const StatusIcon = status.icon;

              return (
                <tr 
                  key={item.MaGhiNhan} 
                  className={`border-b border-white/20 hover:bg-white/10 transition-colors cursor-pointer ${
                    index % 2 === 0 ? 'bg-white/5' : ''
                  }`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Xem chi tiết ${item.TenHoatDong}`}
                  onClick={() => { setSelectedCredit(item); setOpenDetail(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedCredit(item); setOpenDetail(true); } }}
                >
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDate(item.NgayGhiNhan)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-gray-800">
                      {item.TenHoatDong}
                    </div>
                    {item.GhiChu && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.GhiChu}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {item.LoaiHoatDong || 'Khác'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-bold text-medical-blue">
                      {item.SoTinChi}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <Badge className={`${status.color} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t border-white/30 flex justify-between items-center">
        <span className="text-sm text-gray-600">
          Tổng số: {creditHistory.length} hoạt động
        </span>
        <span className="text-sm font-medium text-medical-blue">
          Tổng tín chỉ: {creditHistory.reduce((sum, item) => 
            item.TrangThaiDuyet === 'DaDuyet' ? sum + item.SoTinChi : sum, 0
          )}
        </span>
      </div>
    </GlassCard>
    <CreditDetailModal credit={selectedCredit} open={openDetail} onOpenChange={setOpenDetail} />
    </>
  );
}
