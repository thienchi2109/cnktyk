'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CohortBuilder, CohortSelection } from '@/components/cohorts/cohort-builder';

export function BulkAssignmentWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selection, setSelection] = useState<CohortSelection | null>(null);

  const canProceed = !!selection && (selection.mode === 'all' ? selection.totalFiltered - selection.excludedIds.length > 0 : selection.selectedIds.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gán hoạt động cho nhóm</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className={step === 1 ? 'font-semibold text-medical-blue' : ''}>1. Chọn Cohort</span>
          <span>›</span>
          <span className={step === 2 ? 'font-semibold text-medical-blue' : ''}>2. Xem trước</span>
        </div>
      </div>

      {step === 1 && (
        <>
          <CohortBuilder onChange={setSelection} />
          <div className="flex justify-end">
            <GlassButton disabled={!canProceed} onClick={() => setStep(2)}>
              Tiếp tục → Xem trước
            </GlassButton>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <GlassCard className="p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Xem trước (tạm thời)</h3>
            <p className="text-gray-700 text-sm">
              Sẽ áp dụng cho {selection?.mode === 'all' ? (selection.totalFiltered - (selection.excludedIds?.length || 0)) : (selection?.selectedIds?.length || 0)} người theo bộ lọc đã chọn.
            </p>
            <Alert className="mt-4 border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-800">Bước xem trước chi tiết sẽ được triển khai ở hạng mục 1.6 và 2.2.</AlertDescription>
            </Alert>
          </GlassCard>
          <div className="flex justify-between">
            <GlassButton variant="secondary" onClick={() => setStep(1)}>← Quay lại</GlassButton>
            <GlassButton disabled>Tiếp tục (chưa khả dụng)</GlassButton>
          </div>
        </>
      )}
    </div>
  );
}