/**
 * Credit Rules Management Page
 * For SoYTe administrators to manage credit rules
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { QuyTacTinChi } from '@/lib/db/schemas';

export default function CreditRulesPage() {
  const { data: session, status } = useSession();
  const [rules, setRules] = useState<QuyTacTinChi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    if (session?.user?.role !== 'SoYTe') {
      redirect('/dashboard');
    }

    fetchRules();
  }, [session, status]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/credits/rules');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Lỗi khi tải danh sách quy tắc');
      }

      setRules(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Không giới hạn';
    return new Date(date).toLocaleDateString('vi-VN');
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-medical-blue" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Quy tắc Tín chỉ
              </h1>
              <p className="text-gray-600 mt-1">
                Quản lý quy tắc tính toán và yêu cầu tín chỉ
              </p>
            </div>
          </div>
          <GlassButton variant="default" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Thêm quy tắc mới
          </GlassButton>
        </div>

        {/* Error Message */}
        {error && (
          <GlassCard className="p-4 bg-red-50/50">
            <p className="text-red-600">{error}</p>
          </GlassCard>
        )}

        {/* Rules List */}
        {loading ? (
          <GlassCard className="p-6 animate-pulse">
            <div className="h-64 bg-white/20 rounded-lg"></div>
          </GlassCard>
        ) : rules.length === 0 ? (
          <GlassCard className="p-6">
            <div className="text-center text-gray-500 py-8">
              <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Chưa có quy tắc tín chỉ nào</p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {rules.map((rule) => (
              <GlassCard key={rule.MaQuyTac} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {rule.TenQuyTac}
                      </h3>
                      <Badge className={rule.TrangThai ? 'bg-medical-green/20 text-medical-green' : 'bg-gray-200 text-gray-600'}>
                        {rule.TrangThai ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Đang áp dụng
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Không hoạt động
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-white/20 rounded-lg">
                        <div className="text-sm text-gray-600">Tổng tín chỉ yêu cầu</div>
                        <div className="text-2xl font-bold text-medical-blue">
                          {rule.TongTinChiYeuCau}
                        </div>
                      </div>
                      <div className="p-3 bg-white/20 rounded-lg">
                        <div className="text-sm text-gray-600">Thời hạn</div>
                        <div className="text-2xl font-bold text-medical-green">
                          {rule.ThoiHanNam} năm
                        </div>
                      </div>
                      <div className="p-3 bg-white/20 rounded-lg">
                        <div className="text-sm text-gray-600">Hiệu lực</div>
                        <div className="text-sm font-medium text-gray-700">
                          {formatDate(rule.HieuLucTu)} - {formatDate(rule.HieuLucDen)}
                        </div>
                      </div>
                    </div>

                    {rule.TranTheoLoai && Object.keys(rule.TranTheoLoai).length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Giới hạn theo loại hoạt động:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(rule.TranTheoLoai as Record<string, number>).map(([type, limit]) => (
                            <Badge key={type} className="bg-blue-100 text-blue-800">
                              {type}: {limit} tín chỉ
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <GlassButton variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </GlassButton>
                    <GlassButton variant="ghost" size="sm" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
