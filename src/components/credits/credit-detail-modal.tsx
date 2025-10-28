'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText, Calendar } from 'lucide-react';
import type { CreditHistory } from '@/hooks/use-credit-cycle';

interface CreditDetailModalProps {
  credit: CreditHistory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  DaDuyet: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  TuChoi: { label: 'Từ chối', color: 'bg-red-100 text-red-800', icon: XCircle },
  ChoDuyet: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
};

export function CreditDetailModal({ credit, open, onOpenChange }: CreditDetailModalProps) {
  const Status = credit ? (statusConfig as any)[credit.TrangThaiDuyet] || statusConfig.ChoDuyet : statusConfig.ChoDuyet;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>Chi tiết tín chỉ</SheetTitle>
          <SheetDescription>Thông tin chi tiết hoạt động đã ghi nhận</SheetDescription>
        </SheetHeader>

        {!credit ? (
          <div className="mt-6 text-gray-500">Không có dữ liệu</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Activity */}
            <div className="space-y-1">
              <div className="text-sm text-gray-600">Hoạt động</div>
              <div className="text-lg font-semibold text-gray-900">{credit.TenHoatDong}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{credit.LoaiHoatDong || 'Khác'}</Badge>
                <Badge className={`${Status.color} border-0 flex items-center gap-1`}>
                  <Status.icon className="h-3 w-3" /> {Status.label}
                </Badge>
              </div>
            </div>

            {/* Credits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Tín chỉ</div>
                <div className="text-base font-semibold text-medical-blue">{credit.SoTinChi}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Ngày ghi nhận</div>
                <div className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(credit.NgayGhiNhan).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Notes */}
            {credit.GhiChu && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Ghi chú</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{credit.GhiChu}</div>
              </div>
            )}

            {/* Evidence placeholder (if available in future) */}
            <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Nếu có minh chứng, đường dẫn sẽ hiển thị tại đây.
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
