import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { NhatKyHeThongRepository } from '@/lib/db/repositories';
import { asyncAuditLog, createReportAuditData } from '@/lib/utils/async-audit';
import type { ComplianceReportData } from '@/types/reports';
import { z } from 'zod';
import { monitorPerformance, validateDateRange } from '@/lib/utils/performance';

const DateParamSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isNaN(Date.parse(value)),
    { message: 'Invalid date format. Expected YYYY-MM-DD or ISO datetime string' }
  );

// Query parameter validation schema
const QuerySchema = z.object({
  // Accept either YYYY-MM-DD or full ISO datetime to match current UI requests
  startDate: DateParamSchema.optional(),
  endDate: DateParamSchema.optional(),
  employmentStatus: z.enum(['DangLamViec', 'DaNghi', 'TamHoan']).array().optional(),
  position: z.string().optional(),
  // Pagination parameters
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
});

// GET /api/reports/compliance
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await requireAuth();

    // 2. Role authorization - only DonVi role
    if (session.user.role !== 'DonVi') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 3. Validate query parameters
    const { searchParams } = new URL(request.url);
    const params = QuerySchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      employmentStatus: searchParams.get('employmentStatus')?.split(',') as any,
      position: searchParams.get('position') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // 4. Tenant isolation - use user's unit ID
    const unitId = session.user.unitId;
    if (!unitId) {
      return NextResponse.json(
        { success: false, error: 'User is not assigned to a unit' },
        { status: 400 }
      );
    }

    // 4.5. Validate date range
    const dateValidation = validateDateRange(params.startDate, params.endDate);
    if (!dateValidation.isValid) {
      return NextResponse.json(
        { success: false, error: dateValidation.error },
        { status: 400 }
      );
    }

    // 5. Build WHERE clause filters
    const queryParams: any[] = [unitId];
    let paramIndex = 2;
    let employmentFilter = '';
    let positionFilter = '';
    let dateFilter = '';

    if (params.employmentStatus && params.employmentStatus.length > 0) {
      const placeholders = params.employmentStatus.map(() => `$${paramIndex++}`).join(', ');
      employmentFilter = `AND n."TrangThaiLamViec" IN (${placeholders})`;
      queryParams.push(...params.employmentStatus);
    }

    if (params.position) {
      positionFilter = `AND n."ChucDanh" = $${paramIndex++}`;
      queryParams.push(params.position);
    }

    // Add date range filters for activities
    if (params.startDate) {
      dateFilter += `AND g."NgayGhiNhan" >= $${paramIndex++}`;
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      dateFilter += ` AND g."NgayGhiNhan" <= $${paramIndex++}`;
      queryParams.push(params.endDate);
    }

    // 5.5. Calculate pagination offset
    const offset = (params.page - 1) * params.limit;

    // 6. Fetch compliance data using optimized CTE query with performance monitoring
    const complianceResult: any = await monitorPerformance(
      'compliance-report-query',
      async () => db.query(
      `WITH
      -- CTE 1: Calculate total credits per practitioner
      practitioner_credits AS (
        SELECT
          n."MaNhanVien",
          n."HoVaTen",
          n."SoCCHN",
          n."ChucDanh",
          n."TrangThaiLamViec",
          COALESCE(SUM(
            CASE
              WHEN (
                g."MaDanhMuc" IS NULL
                OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
              THEN g."SoGioTinChiQuyDoi"
              ELSE 0
            END
          ), 0) as total_credits
        FROM "NhanVien" n
        LEFT JOIN "GhiNhanHoatDong" g ON n."MaNhanVien" = g."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        WHERE n."MaDonVi" = $1
          ${employmentFilter}
          ${positionFilter}
          ${dateFilter}
        GROUP BY n."MaNhanVien", n."HoVaTen", n."SoCCHN", n."ChucDanh", n."TrangThaiLamViec"
      ),
      -- CTE 2: Categorize by compliance status
      categorized_practitioners AS (
        SELECT
          "MaNhanVien",
          "HoVaTen",
          "SoCCHN",
          "ChucDanh",
          "TrangThaiLamViec",
          total_credits,
          120 as credits_required,
          CASE
            WHEN total_credits >= 108 THEN 'compliant'
            WHEN total_credits >= 84 THEN 'at_risk'
            ELSE 'critical'
          END as status,
          CASE
            WHEN total_credits >= 108 THEN ROUND((total_credits / 120.0) * 100)
            WHEN total_credits >= 84 THEN ROUND((total_credits / 120.0) * 100)
            ELSE ROUND((total_credits / 120.0) * 100)
          END as compliance_percent
        FROM practitioner_credits
      ),
      -- CTE 3: Aggregate counts by status
      status_distribution AS (
        SELECT
          status,
          COUNT(*) as count
        FROM categorized_practitioners
        GROUP BY status
      ),
      -- CTE 4: Calculate summary statistics
      summary_stats AS (
        SELECT
          COUNT(*) as total_practitioners,
          COUNT(*) FILTER (WHERE status = 'compliant') as compliant_count,
          COUNT(*) FILTER (WHERE status = 'at_risk') as at_risk_count,
          COUNT(*) FILTER (WHERE status = 'critical') as critical_count,
          COALESCE(AVG(total_credits), 0) as average_credits,
          CASE
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'compliant')::numeric / COUNT(*)::numeric) * 100)
            ELSE 0
          END as compliance_rate
        FROM categorized_practitioners
      ),
      -- CTE 5: Paginated practitioners
      paginated_practitioners AS (
        SELECT
          "MaNhanVien",
          "HoVaTen",
          "SoCCHN",
          total_credits,
          credits_required,
          status,
          compliance_percent
        FROM categorized_practitioners
        ORDER BY total_credits DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
      )
      -- Final SELECT: Return all data with pagination
      SELECT
        json_build_object(
          'totalPractitioners', ss.total_practitioners,
          'compliantCount', ss.compliant_count,
          'atRiskCount', ss.at_risk_count,
          'criticalCount', ss.critical_count,
          'averageCredits', ROUND(ss.average_credits::numeric, 2),
          'complianceRate', ss.compliance_rate
        ) as summary,
        (
          SELECT json_agg(json_build_object(
            'status', status,
            'count', count,
            'percentage', ROUND((count::numeric / NULLIF(ss.total_practitioners, 0)::numeric) * 100, 1)
          ))
          FROM status_distribution
        ) as distribution,
        (
          SELECT json_agg(json_build_object(
            'id', "MaNhanVien",
            'name', "HoVaTen",
            'licenseId', COALESCE("SoCCHN", 'N/A'),
            'credits', total_credits,
            'creditsRequired', credits_required,
            'status', status,
            'compliancePercent', compliance_percent
          ))
          FROM paginated_practitioners
        ) as practitioners,
        ss.total_practitioners as total_count
      FROM summary_stats ss`,
      [...queryParams, params.limit, offset]
    ),
      { unitId, filters: params }
    );

    const result = complianceResult[0] || {};

    // 7. Parse and format results
    const totalCount = result.total_count || 0;
    const totalPages = Math.ceil(totalCount / params.limit);

    const responseData: ComplianceReportData = {
      summary: result.summary || {
        totalPractitioners: 0,
        compliantCount: 0,
        atRiskCount: 0,
        criticalCount: 0,
        averageCredits: 0,
        complianceRate: 0,
      },
      distribution: result.distribution || [],
      practitioners: result.practitioners || [],
    };

    // 8. Async audit log (non-blocking)
    const auditRepo = new NhatKyHeThongRepository();
    asyncAuditLog(auditRepo, createReportAuditData(
      session.user.id,
      'compliance',
      params,
      request.headers.get('x-forwarded-for') || 'unknown'
    ));

    // 9. Return success response with pagination metadata
    return NextResponse.json({
      success: true,
      data: responseData,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalCount,
        totalPages,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching compliance report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
