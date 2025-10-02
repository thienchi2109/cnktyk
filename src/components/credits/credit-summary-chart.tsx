/**
 * Credit Summary Chart Component
 * Displays credit distribution by activity type
 */

'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassProgress } from '@/components/ui/glass-progress';
import type { CreditSummary } from '@/hooks/use-credit-cycle';

interface CreditSummaryChartProps {
  creditSummary: CreditSummary[];
  loading?: boolean;
}

const activityTypeColors: Record<string, string> = {
  'KhoaHoc': 'bg-blue-500',
  'HoiThao': 'bg-green-500',
  'NghienCuu': 'bg-purple-500',
  'BaoCao': 'bg-orange-500',
  'Khac': 'bg-gray-500'
};

const activityTypeLabels: Record<string, string> = {
  'KhoaHoc': 'Khóa học',
  'HoiThao': 'Hội thảo',
  'NghienCuu': 'Nghiên cứu',
  'BaoCao': 'Báo cáo',
  'Khac': 'Khác'
};

export function CreditSummaryChart({ creditSummary, loading }: CreditSummaryChartProps) {
  if (loading) {
    return (
      <GlassCard className="p-6 animate-pulse">
        <div className="h-64 bg-white/20 rounded-lg"></div>
      </GlassCard>
    );
  }

  if (creditSummary.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Phân bổ tín chỉ theo loại hoạt động
        </h3>
        <div className="text-center text-gray-500 py-8">
          Chưa có hoạt động nào được phê duyệt
        </div>
      </GlassCard>
    );
  }

  const totalCredits = creditSummary.reduce((sum, item) => sum + item.TongTinChi, 0);

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        Phân bổ tín chỉ theo loại hoạt động
      </h3>

      <div className="space-y-6">
        {creditSummary.map((item, index) => {
          const percentage = totalCredits > 0 ? (item.TongTinChi / totalCredits) * 100 : 0;
          const color = activityTypeColors[item.LoaiHoatDong] || activityTypeColors['Khac'];
          const label = activityTypeLabels[item.LoaiHoatDong] || item.LoaiHoatDong;

          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                  <span className="font-medium text-gray-700">{label}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-medical-blue">
                    {item.TongTinChi} tín chỉ
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.SoHoatDong} hoạt động
                  </div>
                </div>
              </div>

              <GlassProgress value={percentage} className="h-2" />

              {item.TranToiDa && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Giới hạn: {item.TranToiDa} tín chỉ</span>
                  {item.ConLai !== undefined && (
                    <span className={item.ConLai > 0 ? 'text-medical-green' : 'text-medical-red'}>
                      Còn lại: {item.ConLai} tín chỉ
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Summary */}
      <div className="mt-6 pt-6 border-t border-white/30">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Tổng cộng</span>
          <span className="text-2xl font-bold text-medical-blue">
            {totalCredits} tín chỉ
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
