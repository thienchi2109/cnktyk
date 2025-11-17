/**
 * ComplianceStatusSection Component
 *
 * Displays practitioner's CPD compliance status including progress visualization,
 * credits earned vs required, and contextual alerts for non-compliant statuses.
 *
 * @example
 * ```tsx
 * <ComplianceStatusSection
 *   complianceStatus={data.complianceStatus}
 *   variant="full"
 * />
 * ```
 */

import { Award, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import type { ComplianceStatusData, SectionVariant } from './types';

export interface ComplianceStatusSectionProps {
  complianceStatus: ComplianceStatusData;
  variant?: SectionVariant;
}

/**
 * Get compliance status icon based on status
 */
function getComplianceIcon(status: 'compliant' | 'at_risk' | 'non_compliant') {
  switch (status) {
    case 'compliant':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'at_risk':
      return <Clock className="w-5 h-5 text-yellow-600" />;
    case 'non_compliant':
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
  }
}

/**
 * Get compliance status color class
 */
function getComplianceStatusColor(status: 'compliant' | 'at_risk' | 'non_compliant'): string {
  switch (status) {
    case 'compliant':
      return 'text-green-600';
    case 'at_risk':
      return 'text-yellow-600';
    case 'non_compliant':
      return 'text-red-600';
  }
}

/**
 * Get progress bar color based on compliance percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function ComplianceStatusSection({
  complianceStatus,
  variant = 'full',
}: ComplianceStatusSectionProps) {
  const spacing = variant === 'compact' ? 'space-y-2' : 'space-y-4';
  const progressHeight = variant === 'compact' ? 'h-2' : 'h-3';

  const remainingCredits = Math.max(
    0,
    complianceStatus.requiredCredits - complianceStatus.totalCredits
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Award className="w-5 h-5" />
        Trạng thái tuân thủ
      </h3>

      <div className={`p-4 bg-gray-50 rounded-lg ${spacing}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getComplianceIcon(complianceStatus.status)}
            <span
              className={`font-medium ${getComplianceStatusColor(
                complianceStatus.status
              )}`}
            >
              {complianceStatus.compliancePercentage.toFixed(1)}% Hoàn thành
            </span>
          </div>
        </div>

        <div className="relative w-full bg-gray-200 rounded-full overflow-hidden" style={{ height: progressHeight === 'h-2' ? '8px' : '12px' }}>
          <div
            className={`${getProgressColor(
              complianceStatus.compliancePercentage
            )} ${progressHeight} rounded-full transition-all duration-300`}
            style={{
              width: `${Math.min(complianceStatus.compliancePercentage, 100)}%`,
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <label className="text-gray-500">Tín chỉ hiện có</label>
            <p className="font-semibold text-lg">
              {complianceStatus.totalCredits}
            </p>
          </div>
          <div>
            <label className="text-gray-500">Tín chỉ yêu cầu</label>
            <p className="font-semibold text-lg">
              {complianceStatus.requiredCredits}
            </p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <strong>Còn thiếu:</strong> {remainingCredits} tín chỉ
          </div>
        </div>

        {/* Contextual alerts */}
        {complianceStatus.status === 'non_compliant' && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Mức tuân thủ dưới 70%. Cần thực hiện ngay.
            </AlertDescription>
          </Alert>
        )}

        {complianceStatus.status === 'at_risk' && (
          <Alert className="mt-3 border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Mức tuân thủ 70–89%. Nên ghi nhận thêm hoạt động.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
