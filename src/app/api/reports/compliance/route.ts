import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { NhatKyHeThongRepository } from '@/lib/db/repositories';
import type { ComplianceReportData } from '@/types/reports';
import { z } from 'zod';
import { monitorPerformance, validateDateRange } from '@/lib/utils/performance';

// Query parameter validation schema
const QuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
  employmentStatus: z.enum(['DangLamViec', 'DaNghi', 'TamHoan']).array().optional(),
  position: z.string().optional(),
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
      dateFilter += `AND g."NgayThucHien" >= $${paramIndex++}`;
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      dateFilter += ` AND g."NgayThucHien" <= $${paramIndex++}`;
      queryParams.push(params.endDate);
    }

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
      )
      -- Final SELECT: Return all data
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
          ) ORDER BY total_credits DESC)
          FROM categorized_practitioners
        ) as practitioners
      FROM summary_stats ss`,
      queryParams
    ),
      { unitId, filters: params }
    );

    const result = complianceResult[0] || {};

    // 7. Parse and format results
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

    // 8. Audit log
    const auditRepo = new NhatKyHeThongRepository();
    await auditRepo.create({
      MaTaiKhoan: session.user.id,
      HanhDong: 'VIEW_REPORT',
      Bang: 'Reports',
      KhoaChinh: 'compliance',
      NoiDung: {
        reportType: 'compliance',
        filters: params,
      },
      DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // 9. Return success response
    return NextResponse.json({
      success: true,
      data: responseData,
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
