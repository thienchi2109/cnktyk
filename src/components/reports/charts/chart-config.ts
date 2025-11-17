/**
 * Shared chart configurations for reporting system
 * Healthcare color palette with glassmorphism-friendly colors
 */

import type { ChartConfig } from '@/components/ui/chart';

// Healthcare color palette (matching design system)
export const colors = {
  medicalBlue: '#0066CC',
  medicalGreen: '#00A86B',
  medicalAmber: '#F59E0B',
  medicalRed: '#DC2626',
  medicalPurple: '#9333EA',
  medicalTeal: '#14B8A6',
  medicalOrange: '#F97316',
  medicalIndigo: '#6366F1',
} as const;

// Compliance status colors
export const complianceColors = {
  compliant: colors.medicalGreen,
  at_risk: colors.medicalAmber,
  critical: colors.medicalRed,
} as const;

// Approval status colors
export const approvalColors = {
  pending: colors.medicalAmber,    // ChoDuyet
  approved: colors.medicalGreen,   // DaDuyet
  rejected: colors.medicalRed,     // TuChoi
} as const;

// Activity type colors
export const activityTypeColors = {
  KhoaHoc: colors.medicalBlue,
  HoiThao: colors.medicalPurple,
  NghienCuu: colors.medicalTeal,
  BaoCao: colors.medicalOrange,
} as const;

// Chart configurations

export const complianceChartConfig: ChartConfig = {
  compliant: {
    label: 'Đạt chuẩn',
    color: complianceColors.compliant,
  },
  at_risk: {
    label: 'Cần theo dõi',
    color: complianceColors.at_risk,
  },
  critical: {
    label: 'Rủi ro cao',
    color: complianceColors.critical,
  },
};

export const approvalStatusChartConfig: ChartConfig = {
  pending: {
    label: 'Chờ duyệt',
    color: approvalColors.pending,
  },
  approved: {
    label: 'Đã duyệt',
    color: approvalColors.approved,
  },
  rejected: {
    label: 'Từ chối',
    color: approvalColors.rejected,
  },
};

export const activityTypeChartConfig: ChartConfig = {
  KhoaHoc: {
    label: 'Khóa học',
    color: activityTypeColors.KhoaHoc,
  },
  HoiThao: {
    label: 'Hội thảo',
    color: activityTypeColors.HoiThao,
  },
  NghienCuu: {
    label: 'Nghiên cứu',
    color: activityTypeColors.NghienCuu,
  },
  BaoCao: {
    label: 'Báo cáo',
    color: activityTypeColors.BaoCao,
  },
};

// Helper function to get color by compliance status
export function getComplianceColor(percent: number): string {
  if (percent >= 90) return complianceColors.compliant;
  if (percent >= 70) return complianceColors.at_risk;
  return complianceColors.critical;
}

// Helper function to get color by compliance status category
export function getComplianceStatusColor(status: 'compliant' | 'at_risk' | 'critical'): string {
  return complianceColors[status];
}

// Helper function to get color by approval status
export function getApprovalStatusColor(status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi'): string {
  const statusMap = {
    ChoDuyet: approvalColors.pending,
    DaDuyet: approvalColors.approved,
    TuChoi: approvalColors.rejected,
  };
  return statusMap[status];
}

// Helper function to get color by activity type
export function getActivityTypeColor(type: 'KhoaHoc' | 'HoiThao' | 'NghienCuu' | 'BaoCao'): string {
  return activityTypeColors[type] || colors.medicalBlue;
}

// KPI colors for performance summary
export const kpiColors = {
  totalPractitioners: colors.medicalBlue,
  activePractitioners: colors.medicalGreen,
  complianceRate: colors.medicalGreen,
  pendingApprovals: colors.medicalAmber,
  approvedActivities: colors.medicalGreen,
  rejectedActivities: colors.medicalRed,
  atRiskPractitioners: colors.medicalRed,
} as const;
