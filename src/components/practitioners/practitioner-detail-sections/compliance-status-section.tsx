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

import { Award, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function ComplianceStatusSection({
  complianceStatus,
  variant = 'full',
}: ComplianceStatusSectionProps) {
  const progressHeight = variant === 'compact' ? 'h-2' : 'h-3';
  const contentPadding = variant === 'compact' ? 'p-4' : 'p-6';

  const remainingCredits = Math.max(
    0,
    complianceStatus.requiredCredits - complianceStatus.totalCredits
  );
  const progressValue = Math.min(complianceStatus.compliancePercentage, 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-4">
        <Award className="w-5 h-5 text-primary" />
        <CardTitle className="text-lg">Trạng thái tuân thủ</CardTitle>
      </CardHeader>

      <CardContent className={`${contentPadding} space-y-4`}>
        <div className="flex items-start justify-between gap-4">
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
          <div className="text-sm text-muted-foreground">
            Còn thiếu <span className="font-semibold text-foreground">{remainingCredits}</span> tín chỉ
          </div>
        </div>

        <div className="space-y-2">
          <Progress
            value={progressValue}
            className={progressHeight}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tín chỉ đạt</span>
            <span>{progressValue.toFixed(1)}%</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Tín chỉ hiện có</label>
            <p className={`font-semibold ${variant === 'compact' ? 'text-base' : 'text-xl'}`}>
              {complianceStatus.totalCredits}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Tín chỉ yêu cầu</label>
            <p className={`font-semibold ${variant === 'compact' ? 'text-base' : 'text-xl'}`}>
              {complianceStatus.requiredCredits}
            </p>
          </div>
        </div>

        {/* Contextual alerts */}
        {complianceStatus.status === 'non_compliant' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Mức tuân thủ dưới 70%. Cần thực hiện ngay.
            </AlertDescription>
          </Alert>
        )}

        {complianceStatus.status === 'at_risk' && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Mức tuân thủ 70–89%. Nên ghi nhận thêm hoạt động.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
