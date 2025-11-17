import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { NhatKyHeThongRepository } from '@/lib/db/repositories';
import { z } from 'zod';
import type { ActivityReportData } from '@/types/reports';
import { monitorPerformance, validateDateRange } from '@/lib/utils/performance';

// Validation schema for query parameters
const ActivityReportFiltersSchema = z.object({
  unitId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  activityType: z.enum(['KhoaHoc', 'HoiThao', 'NghienCuu', 'BaoCao']).optional(),
  approvalStatus: z.enum(['ChoDuyet', 'DaDuyet', 'TuChoi']).optional(),
  practitionerId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Role-based authorization (DonVi only)
    if (session.user.role !== 'DonVi') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = ActivityReportFiltersSchema.parse({
      unitId: searchParams.get('unitId') || session.user.unitId,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      activityType: searchParams.get('activityType') || undefined,
      approvalStatus: searchParams.get('approvalStatus') || undefined,
      practitionerId: searchParams.get('practitionerId') || undefined,
    });

    // 4. Tenant isolation check
    if (filters.unitId !== session.user.unitId) {
      return NextResponse.json({ error: 'Forbidden - Cannot access other units' }, { status: 403 });
    }

    // 4.5. Validate date range
    const dateValidation = validateDateRange(filters.startDate, filters.endDate);
    if (!dateValidation.isValid) {
      return NextResponse.json({ error: dateValidation.error }, { status: 400 });
    }

    // 5. Build optimized CTE query
    const query = `
      WITH activity_data AS (
        SELECT
          g."MaGhiNhan",
          g."TenHoatDong",
          g."NgayGhiNhan",
          g."NgayDuyet",
          g."TrangThaiDuyet",
          COALESCE(dm."LoaiHoatDong", 'KhoaHoc') as "LoaiHoatDong",
          CASE
            WHEN g."NgayDuyet" IS NOT NULL AND g."NgayGhiNhan" IS NOT NULL
            THEN EXTRACT(DAY FROM (g."NgayDuyet" - g."NgayGhiNhan"))
            ELSE NULL
          END as "ApprovalDays",
          TO_CHAR(g."NgayGhiNhan", 'YYYY-MM') as "Month"
        FROM "GhiNhanHoatDong" g
        JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
        LEFT JOIN "DanhMucHoatDong" dm ON g."MaDanhMuc" = dm."MaDanhMuc"
        WHERE n."MaDonVi" = $1
          ${filters.startDate ? `AND g."NgayGhiNhan" >= $2::date` : ''}
          ${filters.endDate ? `AND g."NgayGhiNhan" <= $${filters.startDate ? '3' : '2'}::date` : ''}
          ${filters.activityType ? `AND dm."LoaiHoatDong" = $${filters.startDate && filters.endDate ? '4' : filters.startDate || filters.endDate ? '3' : '2'}` : ''}
          ${filters.approvalStatus ? `AND g."TrangThaiDuyet" = $${
            filters.startDate && filters.endDate && filters.activityType ? '5' :
            (filters.startDate && filters.endDate) || (filters.startDate && filters.activityType) || (filters.endDate && filters.activityType) ? '4' :
            filters.startDate || filters.endDate || filters.activityType ? '3' : '2'
          }` : ''}
          ${filters.practitionerId ? `AND g."MaNhanVien" = $${
            [filters.startDate, filters.endDate, filters.activityType, filters.approvalStatus].filter(Boolean).length + 2
          }` : ''}
      ),
      status_summary AS (
        SELECT
          COUNT(*) as total_submissions,
          SUM(CASE WHEN "TrangThaiDuyet" = 'ChoDuyet' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN "TrangThaiDuyet" = 'DaDuyet' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN "TrangThaiDuyet" = 'TuChoi' THEN 1 ELSE 0 END) as rejected_count,
          AVG(CASE WHEN "TrangThaiDuyet" = 'DaDuyet' AND "ApprovalDays" IS NOT NULL THEN "ApprovalDays" ELSE NULL END) as avg_approval_days
        FROM activity_data
      ),
      type_distribution AS (
        SELECT
          "LoaiHoatDong" as type,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total_submissions FROM status_summary), 0)), 2) as percentage
        FROM activity_data
        GROUP BY "LoaiHoatDong"
        ORDER BY count DESC
      ),
      status_distribution AS (
        SELECT
          "TrangThaiDuyet" as status,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total_submissions FROM status_summary), 0)), 2) as percentage
        FROM activity_data
        GROUP BY "TrangThaiDuyet"
      ),
      monthly_timeline AS (
        SELECT
          "Month" as month,
          COUNT(*) as submitted,
          SUM(CASE WHEN "TrangThaiDuyet" = 'DaDuyet' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN "TrangThaiDuyet" = 'TuChoi' THEN 1 ELSE 0 END) as rejected
        FROM activity_data
        GROUP BY "Month"
        ORDER BY "Month" ASC
      ),
      approval_metrics AS (
        SELECT
          AVG("ApprovalDays") as avg_days,
          MIN("ApprovalDays") as fastest,
          MAX("ApprovalDays") as slowest
        FROM activity_data
        WHERE "TrangThaiDuyet" = 'DaDuyet' AND "ApprovalDays" IS NOT NULL
      )
      SELECT
        json_build_object(
          'totalSubmissions', COALESCE((SELECT total_submissions FROM status_summary), 0),
          'pendingCount', COALESCE((SELECT pending_count FROM status_summary), 0),
          'approvedCount', COALESCE((SELECT approved_count FROM status_summary), 0),
          'rejectedCount', COALESCE((SELECT rejected_count FROM status_summary), 0),
          'averageApprovalDays', COALESCE((SELECT avg_approval_days FROM status_summary), 0)
        ) as summary,
        COALESCE(
          (SELECT json_agg(json_build_object('type', type, 'count', count, 'percentage', percentage))
           FROM type_distribution),
          '[]'::json
        ) as "byActivityType",
        COALESCE(
          (SELECT json_agg(json_build_object('status', status, 'count', count, 'percentage', percentage))
           FROM status_distribution),
          '[]'::json
        ) as "byStatus",
        COALESCE(
          (SELECT json_agg(json_build_object('month', month, 'submitted', submitted, 'approved', approved, 'rejected', rejected))
           FROM monthly_timeline),
          '[]'::json
        ) as timeline,
        json_build_object(
          'avgDaysToApproval', COALESCE((SELECT avg_days FROM approval_metrics), 0),
          'fastestApproval', COALESCE((SELECT fastest FROM approval_metrics), 0),
          'slowestApproval', COALESCE((SELECT slowest FROM approval_metrics), 0)
        ) as "approvalMetrics"
    `;

    // 6. Build query parameters array
    const params: (string | Date)[] = [filters.unitId];
    if (filters.startDate) params.push(new Date(filters.startDate));
    if (filters.endDate) params.push(new Date(filters.endDate));
    if (filters.activityType) params.push(filters.activityType);
    if (filters.approvalStatus) params.push(filters.approvalStatus);
    if (filters.practitionerId) params.push(filters.practitionerId);

    // 7. Execute query with performance monitoring
    const result = await monitorPerformance(
      'activity-report-query',
      async () => db.queryOne<{
        summary: ActivityReportData['summary'];
        byActivityType: ActivityReportData['byActivityType'];
        byStatus: ActivityReportData['byStatus'];
        timeline: ActivityReportData['timeline'];
        approvalMetrics: ActivityReportData['approvalMetrics'];
      }>(query, params),
      { unitId: filters.unitId, filters }
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch activity report data' }, { status: 500 });
    }

    const reportData: ActivityReportData = {
      summary: result.summary,
      byActivityType: result.byActivityType,
      byStatus: result.byStatus,
      timeline: result.timeline,
      approvalMetrics: result.approvalMetrics,
    };

    // 8. Audit logging
    const auditRepo = new NhatKyHeThongRepository();
    await auditRepo.create({
      MaTaiKhoan: session.user.id,
      HanhDong: 'READ',
      Bang: 'GhiNhanHoatDong',
      KhoaChinh: null,
      NoiDung: {
        reportType: 'activity-submissions',
        unitId: filters.unitId,
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          activityType: filters.activityType,
          approvalStatus: filters.approvalStatus,
          practitionerId: filters.practitionerId,
        },
      },
      DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // 9. Return report data
    return NextResponse.json(reportData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error generating activity report:', error);
    return NextResponse.json(
      { error: 'Failed to generate activity report' },
      { status: 500 }
    );
  }
}
