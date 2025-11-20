/**
 * TypeScript types for DonVi Reporting System
 */

// Report types enum
export type ReportType = 'performance' | 'compliance' | 'activities' | 'practitioner';

// Date range presets
export type DateRangePreset =
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'current_cycle'
  | 'custom';

// Time period for performance summary
export type TimePeriod =
  | 'current_month'
  | 'last_month'
  | 'current_quarter'
  | 'last_quarter'
  | 'custom';

// Compliance status categories
export type ComplianceStatus = 'compliant' | 'at_risk' | 'critical';

// Report filters
export interface ReportFilters {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  preset?: DateRangePreset;
}

export interface ComplianceReportFilters extends ReportFilters {
  employmentStatus?: ('DangLamViec' | 'DaNghi' | 'TamHoan')[];
  position?: string;
}

export interface ActivityReportFilters extends ReportFilters {
  activityType?: ('KhoaHoc' | 'HoiThao' | 'NghienCuu' | 'BaoCao')[];
  approvalStatus?: 'ChoDuyet' | 'DaDuyet' | 'TuChoi' | 'all';
  practitionerId?: string;
}

export interface PractitionerDetailFilters extends ReportFilters {
  practitionerId: string;
}

// Performance Summary Report Data
export interface PerformanceSummaryMetrics {
  totalPractitioners: number;
  activePractitioners: number;
  complianceRate: number;
  pendingApprovals: number;
  approvedActivities: number;
  rejectedActivities: number;
  atRiskPractitioners: number;
}

export interface PerformanceTrends {
  complianceRateChange: number; // Percentage change
  approvalVolumeChange: number; // Percentage change
  atRiskChange: number; // Absolute change
}

export interface PerformanceSummaryData {
  currentPeriod: PerformanceSummaryMetrics;
  comparisonPeriod?: PerformanceSummaryMetrics;
  trends?: PerformanceTrends;
}

// Compliance Overview Report Data
export interface ComplianceDistribution {
  status: ComplianceStatus;
  count: number;
  percentage: number;
}

export interface PractitionerComplianceSummary {
  id: string;
  name: string;
  licenseId: string;
  credits: number;
  creditsRequired: number;
  status: ComplianceStatus;
  compliancePercent: number;
}

export interface ComplianceReportData {
  summary: {
    totalPractitioners: number;
    compliantCount: number;
    atRiskCount: number;
    criticalCount: number;
    averageCredits: number;
    complianceRate: number;
  };
  distribution: ComplianceDistribution[];
  practitioners: PractitionerComplianceSummary[];
  trend?: Array<{
    month: string;
    complianceRate: number;
  }>;
}

// Activity Submissions Report Data
export interface ActivityTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface ActivityStatusDistribution {
  status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  count: number;
  percentage: number;
}

export interface ActivityTimeline {
  month: string;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface ApprovalMetrics {
  avgDaysToApproval: number;
  fastestApproval: number;
  slowestApproval: number;
}

export interface ActivityListItem {
  id: string;
  name: string;
  type: string;
  status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  submittedAt: string;
  approvedAt: string | null;
  credits: number;
}

export interface ActivityReportData {
  summary: {
    totalSubmissions: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    averageApprovalDays: number;
  };
  byActivityType: ActivityTypeDistribution[];
  byStatus: ActivityStatusDistribution[];
  timeline: ActivityTimeline[];
  approvalMetrics: ApprovalMetrics;
  recentActivities: ActivityListItem[];
}

// Practitioner Detail Report Data
export interface PractitionerMetadata {
  id: string;
  name: string;
  licenseId: string;
  position: string;
  employmentStatus: string;
  licenseIssueDate: string;
  cycleEndDate: string;
}

export interface PractitionerCredits {
  earned: number;
  required: number;
  remaining: number;
  percentComplete: number;
}

export interface CreditsBreakdown {
  type: string;
  credits: number;
  count: number;
}

export interface PractitionerSubmission {
  id: string;
  activityName: string;
  type: string;
  credits: number;
  status: string;
  submittedDate: string;
  approvedDate?: string;
}

export interface CreditTimeline {
  date: string;
  cumulativeCredits: number;
}

export interface PractitionerDetailReportData {
  practitioner: PractitionerMetadata;
  credits: PractitionerCredits;
  byActivityType: CreditsBreakdown[];
  submissions: PractitionerSubmission[];
  timeline: CreditTimeline[];
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface MultiSeriesDataPoint {
  name: string;
  [key: string]: string | number;
}
