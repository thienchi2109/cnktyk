export interface UnitMetrics {
  totalPractitioners: number;
  activePractitioners: number;
  complianceRate: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  atRiskPractitioners: number;
  /** Optional fields derived from client-side aggregates */
  totalCredits?: number;
  compliantPractitioners?: number;
}

export interface UnitComparisonSummary {
  id: string;
  name: string;
  type: string;
  totalPractitioners: number;
  activePractitioners: number;
  compliantPractitioners: number;
  complianceRate: number;
  pendingApprovals: number;
  totalCredits: number;
}
