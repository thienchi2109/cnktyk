import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { NhatKyHeThongRepository } from '@/lib/db/repositories';
import type { PractitionerDetailReportData } from '@/types/reports';
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
    practitionerId: z.string().min(1, 'Practitioner ID is required'),
    startDate: DateParamSchema.optional(),
    endDate: DateParamSchema.optional(),
});

// GET /api/reports/practitioner-details
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
            practitionerId: searchParams.get('practitionerId') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
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

        // 5. Verify practitioner belongs to unit
        const practitionerExists = await db.queryOne(
            `SELECT "MaNhanVien" FROM "NhanVien" WHERE "MaNhanVien" = $1 AND "MaDonVi" = $2`,
            [params.practitionerId, unitId]
        );

        if (!practitionerExists) {
            return NextResponse.json(
                { success: false, error: 'Practitioner not found or not in your unit' },
                { status: 404 }
            );
        }

        // 6. Build WHERE clause filters for activities
        const queryParams: any[] = [params.practitionerId];
        let paramIndex = 2;
        let dateFilter = '';

        if (params.startDate) {
            dateFilter += `AND g."NgayGhiNhan" >= $${paramIndex++}`;
            queryParams.push(params.startDate);
        }

        if (params.endDate) {
            dateFilter += ` AND g."NgayGhiNhan" <= $${paramIndex++}`;
            queryParams.push(params.endDate);
        }

        // 7. Fetch practitioner detail data using optimized CTE query
        const reportResult: any = await monitorPerformance(
            'practitioner-detail-report-query',
            async () => db.query(
                `WITH
      -- CTE 1: Practitioner Metadata
      practitioner_info AS (
        SELECT
          n."MaNhanVien",
          n."HoVaTen",
          n."SoCCHN",
          n."ChucDanh",
          n."TrangThaiLamViec",
          n."NgayCapCCHN",
          (n."NgayCapCCHN" + INTERVAL '5 years')::date as cycle_end_date
        FROM "NhanVien" n
        WHERE n."MaNhanVien" = $1
      ),
      -- CTE 2: Approved Activities
      approved_activities AS (
        SELECT
          g."MaGhiNhan",
          dm."TenDanhMuc" as activity_name,
          dm."LoaiHoatDong" as activity_type,
          g."NgayGhiNhan",
          g."ThoiGianDuyet",
          COALESCE(
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
          , 0) as credits
        FROM "GhiNhanHoatDong" g
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        WHERE g."MaNhanVien" = $1
          AND g."TrangThaiDuyet" = 'DaDuyet'
          ${dateFilter}
      ),
      -- CTE 3: All Submissions (for history list)
      all_submissions AS (
        SELECT
          g."MaGhiNhan",
          dm."TenDanhMuc" as activity_name,
          dm."LoaiHoatDong" as activity_type,
          g."NgayGhiNhan",
          g."ThoiGianDuyet",
          g."TrangThaiDuyet",
          COALESCE(g."SoGioTinChiQuyDoi", 0) as credits
        FROM "GhiNhanHoatDong" g
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        WHERE g."MaNhanVien" = $1
          ${dateFilter}
        ORDER BY g."NgayGhiNhan" DESC
      ),
      -- CTE 4: Credits Breakdown by Type
      credits_by_type AS (
        SELECT
          activity_type,
          SUM(credits) as total_credits,
          COUNT(*) as count
        FROM approved_activities
        GROUP BY activity_type
      ),
      -- CTE 5: Timeline Data (Cumulative Credits)
      timeline_data AS (
        SELECT
          "NgayGhiNhan" as date,
          SUM(credits) OVER (ORDER BY "NgayGhiNhan" ASC) as cumulative_credits
        FROM approved_activities
      )
      
      -- Final Selection
      SELECT
        -- Practitioner Info
        (SELECT json_build_object(
          'id', "MaNhanVien",
          'name', "HoVaTen",
          'licenseId', COALESCE("SoCCHN", 'N/A'),
          'position', COALESCE("ChucDanh", 'N/A'),
          'employmentStatus', "TrangThaiLamViec",
          'licenseIssueDate', "NgayCapCCHN",
          'cycleEndDate', cycle_end_date
        ) FROM practitioner_info) as practitioner,
        
        -- Credits Summary
        (SELECT json_build_object(
          'earned', COALESCE(SUM(credits), 0),
          'required', 120,
          'remaining', GREATEST(0, 120 - COALESCE(SUM(credits), 0)),
          'percentComplete', LEAST(100, ROUND((COALESCE(SUM(credits), 0) / 120.0) * 100))
        ) FROM approved_activities) as credits,
        
        -- Breakdown by Type
        (SELECT COALESCE(json_agg(json_build_object(
          'type', activity_type,
          'credits', total_credits,
          'count', count
        )), '[]'::json) FROM credits_by_type) as by_activity_type,
        
        -- Submissions List
        (SELECT COALESCE(json_agg(json_build_object(
          'id', "MaGhiNhan",
          'activityName', COALESCE(activity_name, 'Unknown Activity'),
          'type', COALESCE(activity_type, 'Other'),
          'credits', credits,
          'status', "TrangThaiDuyet",
          'submittedDate', "NgayGhiNhan",
          'approvedDate', "ThoiGianDuyet"
        )), '[]'::json) FROM all_submissions) as submissions,
        
        -- Timeline
        (SELECT COALESCE(json_agg(json_build_object(
          'date', date,
          'cumulativeCredits', cumulative_credits
        )), '[]'::json) FROM timeline_data) as timeline
      `,
                queryParams
            ),
            { unitId, filters: params }
        );

        const result = reportResult[0] || {};

        // 8. Parse and format results
        const responseData: PractitionerDetailReportData = {
            practitioner: result.practitioner,
            credits: result.credits,
            byActivityType: result.by_activity_type,
            submissions: result.submissions,
            timeline: result.timeline,
        };

        // 9. Audit log
        const auditRepo = new NhatKyHeThongRepository();
        await auditRepo.create({
            MaTaiKhoan: session.user.id,
            HanhDong: 'VIEW_REPORT',
            Bang: 'Reports',
            KhoaChinh: 'practitioner-details',
            NoiDung: {
                reportType: 'practitioner-details',
                filters: params,
            },
            DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
        });

        // 10. Return success response
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

        console.error('Error fetching practitioner detail report:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
