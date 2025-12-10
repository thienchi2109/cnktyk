/**
 * API Route: Export Dashboard Report to Excel
 * GET /api/dashboard/export
 * Role: SoYTe only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DashboardExcelExporter } from '@/lib/dashboard/dashboard-excel-exporter';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check role - only SoYTe can export dashboard report
        if (session.user.role !== 'SoYTe') {
            return NextResponse.json(
                { success: false, error: 'Chỉ Sở Y Tế mới có quyền xuất báo cáo' },
                { status: 403 }
            );
        }

        //Fetch metrics data using the same pattern as /api/system/metrics
        const [
            totalUnitsResult,
            totalPractitionersResult,
            activePractitionersResult,
            totalSubmissionsResult,
            pendingApprovalsResult,
            approvedThisMonthResult,
            rejectedThisMonthResult,
            totalCreditsResult,
            completedFullResult,
            incompleteResult,
            partialCompleteResult,
            atRiskResult
        ] = await Promise.all([
            // Total units
            db.query(
                'SELECT COUNT(*) as count FROM "DonVi" WHERE "TrangThai" = $1 AND "CapQuanLy" != $2',
                ['HoatDong', 'SoYTe'],
            ),

            // Total practitioners
            db.query('SELECT COUNT(*) as count FROM "NhanVien"'),

            // Active practitioners
            db.query('SELECT COUNT(*) as count FROM "NhanVien" WHERE "TrangThaiLamViec" = $1', ['DangLamViec']),

            // Total submissions
            db.query('SELECT COUNT(*) as count FROM "GhiNhanHoatDong"'),

            // Pending approvals
            db.query('SELECT COUNT(*) as count FROM "GhiNhanHoatDong" WHERE "TrangThaiDuyet" = $1', ['ChoDuyet']),

            // Approved this month
            db.query(`
        SELECT COUNT(*) as count 
        FROM "GhiNhanHoatDong" 
        WHERE "TrangThaiDuyet" = $1 
        AND "NgayDuyet" >= date_trunc('month', CURRENT_DATE)
      `, ['DaDuyet']),

            // Rejected this month
            db.query(`
        SELECT COUNT(*) as count 
        FROM "GhiNhanHoatDong" 
        WHERE "TrangThaiDuyet" = $1 
        AND "NgayDuyet" >= date_trunc('month', CURRENT_DATE)
      `, ['TuChoi']),

            // Total credits awarded
            db.query(
                `SELECT COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
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
          ), 0) as total
         FROM "GhiNhanHoatDong" g
         LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
         WHERE g."TrangThaiDuyet" = $1`,
                ['DaDuyet']
            ),

            // Practitioners who completed >= 120 hours
            db.query(`
        SELECT COUNT(DISTINCT nv."MaNhanVien") as count
        FROM "NhanVien" nv
        INNER JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
        WHERE kc."TrangThai" = 'DangDienRa'
        AND (
          SELECT COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
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
          ), 0)
          FROM "GhiNhanHoatDong" g
          LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
          WHERE g."MaNhanVien" = nv."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
          AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
        ) >= kc."SoTinChiYeuCau"
      `),

            // Practitioners with < 120 hours (incomplete)
            db.query(`
        SELECT COUNT(DISTINCT nv."MaNhanVien") as count
        FROM "NhanVien" nv
        INNER JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
        WHERE kc."TrangThai" = 'DangDienRa'
        AND (
          SELECT COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
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
          ), 0)
          FROM "GhiNhanHoatDong" g
          LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
          WHERE g."MaNhanVien" = nv."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
          AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
        ) < kc."SoTinChiYeuCau"
      `),

            // Practitioners with 60-119 hours (partial)
            db.query(`
        SELECT COUNT(DISTINCT nv."MaNhanVien") as count
        FROM "NhanVien" nv
        INNER JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
        WHERE kc."TrangThai" = 'DangDienRa'
        AND (
          SELECT COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
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
          ), 0)
          FROM "GhiNhanHoatDong" g
          LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
          WHERE g."MaNhanVien" = nv."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
          AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
        ) >= (kc."SoTinChiYeuCau" * 0.5)
        AND (
          SELECT COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
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
          ), 0)
          FROM "GhiNhanHoatDong" g
          LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
          WHERE g."MaNhanVien" = nv."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
          AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
        ) < kc."SoTinChiYeuCau"
      `),

            // At-risk practitioners
            db.query(`
        SELECT COUNT(DISTINCT nv."MaNhanVien") as count
        FROM "NhanVien" nv
        INNER JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
        WHERE kc."TrangThai" = 'DangDienRa'
        AND kc."NgayKetThuc" <= CURRENT_DATE + INTERVAL '6 months'
        AND (
          SELECT COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
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
          ), 0)
          FROM "GhiNhanHoatDong" g
          LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
          WHERE g."MaNhanVien" = nv."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
          AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
        ) < (kc."SoTinChiYeuCau" * 0.7)
      `)
        ]);

        // Parse results
        const totalActive = parseInt((activePractitionersResult[0] as any)?.count || '0');
        const completedFull = parseInt((completedFullResult[0] as any)?.count || '0');
        const incomplete = parseInt((incompleteResult[0] as any)?.count || '0');
        const partialComplete = parseInt((partialCompleteResult[0] as any)?.count || '0');

        // Calculate rates
        const completionRate = totalActive > 0 ? Math.round((completedFull / totalActive) * 100) : 0;
        const partialCompletionRate = totalActive > 0 ? Math.round((partialComplete / totalActive) * 100) : 0;
        const complianceRate = totalActive > 0 ? Math.round((completedFull / totalActive) * 100) : 0;

        // Generate Excel report
        const exporter = new DashboardExcelExporter();
        const buffer = await exporter.generateReport({
            totalUnits: parseInt((totalUnitsResult[0] as any)?.count || '0'),
            totalPractitioners: parseInt((totalPractitionersResult[0] as any)?.count || '0'),
            activePractitioners: totalActive,
            complianceRate,
            totalSubmissions: parseInt((totalSubmissionsResult[0] as any)?.count || '0'),
            pendingApprovals: parseInt((pendingApprovalsResult[0] as any)?.count || '0'),
            approvedThisMonth: parseInt((approvedThisMonthResult[0] as any)?.count || '0'),
            rejectedThisMonth: parseInt((rejectedThisMonthResult[0] as any)?.count || '0'),
            totalCreditsAwarded: parseFloat((totalCreditsResult[0] as any)?.total || '0'),
            atRiskPractitioners: parseInt((atRiskResult[0] as any)?.count || '0'),
            practitionersCompletedFull: completedFull,
            practitionersIncomplete: incomplete,
            practitionersPartialComplete: partialComplete,
            completionRate,
            partialCompletionRate
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `BaoCao_CNKYKLT_${timestamp}.xlsx`;

        // Return file
        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length.toString()
            }
        });
    } catch (error) {
        console.error('Error exporting dashboard report:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi khi xuất báo cáo' },
            { status: 500 }
        );
    }
}
