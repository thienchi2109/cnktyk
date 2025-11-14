/**
 * Credits Page
 * Display credit cycle and compliance information
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ComplianceProgressCard } from '@/components/credits/compliance-progress-card';
import { CreditSummaryChart } from '@/components/credits/credit-summary-chart';
import { CreditHistoryTable } from '@/components/credits/credit-history-table';
import { useCreditCycle } from '@/hooks/use-credit-cycle';
import { GlassCard } from '@/components/ui/glass-card';
import { Award, TrendingUp } from 'lucide-react';

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const [practitionerId, setPractitionerId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    if (session?.user) {
      // For practitioners, use their own ID
      // For other roles, they would need to select a practitioner
      if (session.user.role === 'NguoiHanhNghe') {
        setPractitionerId(session.user.id);
      }
    }
  }, [session, status]);

  const { cycle, creditSummary, creditHistory, loading, error } = useCreditCycle(
    practitionerId,
    true // Include history
  );

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
        <div className="max-w-7xl mx-auto">
          <GlassCard className="p-6 animate-pulse">
            <div className="h-96 bg-white/20 rounded-lg"></div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Only practitioners can view this page directly
  // Other roles would access this through practitioner profiles
  if (session.user.role !== 'NguoiHanhNghe') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
        <div className="max-w-7xl mx-auto">
          <GlassCard className="p-6">
            <div className="text-center text-gray-600">
              <p>Trang này chỉ dành cho người hành nghề.</p>
              <p className="mt-2">Vui lòng truy cập thông tin tín chỉ qua trang hồ sơ người hành nghề.</p>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
        <div className="max-w-7xl mx-auto">
          <GlassCard className="p-6">
            <div className="text-center text-red-600">
              <p>Lỗi: {error}</p>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-medical-blue" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800 page-title">
              Quản lý tín chỉ
            </h1>
            <p className="text-gray-600 mt-1">
              Theo dõi tiến độ tuân thủ và lịch sử tín chỉ của bạn
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress Card */}
          <div className="lg:col-span-1">
            <ComplianceProgressCard cycle={cycle} loading={loading} />
          </div>

          {/* Right Column - Summary and History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credit Summary Chart */}
            <CreditSummaryChart creditSummary={creditSummary} loading={loading} />

            {/* Quick Stats */}
            {cycle && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-medical-blue/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-medical-blue" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Tỷ lệ hoàn thành</div>
                      <div className="text-2xl font-bold text-medical-blue">
                        {Math.round(cycle.TyLeHoanThanh)}%
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-medical-green/20 rounded-lg">
                      <Award className="w-6 h-6 text-medical-green" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Tín chỉ đạt được</div>
                      <div className="text-2xl font-bold text-medical-green">
                        {cycle.TongTinChiDatDuoc}
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-medical-amber/20 rounded-lg">
                      <Award className="w-6 h-6 text-medical-amber" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Còn thiếu</div>
                      <div className="text-2xl font-bold text-medical-amber">
                        {Math.max(0, cycle.TongTinChiYeuCau - cycle.TongTinChiDatDuoc)}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </div>

        {/* Credit History Table */}
        <CreditHistoryTable creditHistory={creditHistory} loading={loading} />
    </div>
  );
}
