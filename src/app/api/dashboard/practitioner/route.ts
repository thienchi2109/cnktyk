import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { perfMonitor } from '@/lib/performance';

/**
 * Consolidated Practitioner Dashboard API
 * Combines 4 separate API calls into a single optimized query:
 * 1. Practitioner info (from /api/practitioners?userId=X)
 * 2. Credit cycle data (from /api/credits/cycle?practitionerId=X)
 * 3. Recent activities (from /api/submissions?practitionerId=X)
 * 4. Notifications (from /api/notifications)
 * 
 * Performance: Reduces 4 HTTP requests to 1, ~75% reduction
 */
export async function GET(request: NextRequest) {
  const timer = perfMonitor.startTimer();
  
  try {
    const session = await requireAuth();
    
    // Only practitioners can access their own dashboard
    if (session.user.role !== 'NguoiHanhNghe') {
      return NextResponse.json(
        { success: false, error: 'Only practitioners can access this endpoint' },
        { status: 403 }
      );
    }

    const account = await db.queryOne<{
      MaTaiKhoan: string;
      TenDangNhap: string;
      MaDonVi: string | null;
    }>(
      `
        SELECT 
          tk."MaTaiKhoan",
          tk."TenDangNhap",
          tk."MaDonVi"
        FROM "TaiKhoan" tk
        WHERE tk."MaTaiKhoan" = $1
        LIMIT 1
      `,
      [session.user.id]
    );

    if (!account) {
      const totalDuration = timer();
      perfMonitor.log({
        endpoint: '/api/dashboard/practitioner',
        method: 'GET',
        duration: totalDuration,
        timestamp: new Date(),
        status: 404,
        metadata: { 
          error: 'Account not found for session',
          accountId: session.user.id
        }
      });

      return NextResponse.json(
        { 
          success: false,
          error: "Practitioner not found",
          message: "No practitioner record linked to this account. Please contact the system administrator to verify your practitioner profile."
        },
        { status: 404 }
      );
    }

    const username = account.TenDangNhap?.trim();

    let practitionerId: string | null = null;
    let practitionerLookupSource: string | null = null;

    try {
      const linkedPractitioner = await db.queryOne<{ MaNhanVien: string }>(
        `
          SELECT "MaNhanVien"
          FROM "TaiKhoan"
          WHERE "MaTaiKhoan" = $1
            AND "MaNhanVien" IS NOT NULL
          LIMIT 1
        `,
        [session.user.id]
      );

      if (linkedPractitioner?.MaNhanVien) {
        practitionerId = linkedPractitioner.MaNhanVien;
        practitionerLookupSource = 'account_column';
      }
    } catch (error) {
      // Column may not exist in this environment; ignore and continue with fallback strategies
      console.warn('[dashboard/practitioner] Direct account-practitioner lookup failed:', error);
    }

    const practitionerLookupStrategies: Array<{
      name: string;
      query: string;
      params: any[];
      skip?: boolean;
    }> = [
      {
        name: 'direct_id_match',
        query: `SELECT "MaNhanVien" FROM "NhanVien" WHERE "MaNhanVien" = $1 LIMIT 1`,
        params: [account.MaTaiKhoan]
      },
      {
        name: 'internal_code_match',
        query: `
          SELECT "MaNhanVien" 
          FROM "NhanVien" 
          WHERE "MaNhanVienNoiBo" IS NOT NULL 
            AND LOWER("MaNhanVienNoiBo") = LOWER($1)
          LIMIT 1
        `,
        params: [username],
        skip: !username
      },
      {
        name: 'email_match',
        query: `
          SELECT "MaNhanVien" 
          FROM "NhanVien" 
          WHERE "Email" IS NOT NULL 
            AND LOWER("Email") = LOWER($1)
          LIMIT 1
        `,
        params: [username],
        skip: !username
      },
      {
        name: 'license_match',
        query: `
          SELECT "MaNhanVien"
          FROM "NhanVien"
          WHERE "SoCCHN" IS NOT NULL
            AND LOWER("SoCCHN") = LOWER($1)
          LIMIT 1
        `,
        params: [username],
        skip: !username
      },
      {
        name: 'recent_submission_match',
        query: `
          SELECT g."MaNhanVien"
          FROM "GhiNhanHoatDong" g
          JOIN "NhanVien" nv ON nv."MaNhanVien" = g."MaNhanVien"
          WHERE g."NguoiNhap" = $1
            ${account.MaDonVi ? 'AND nv."MaDonVi" = $2' : ''}
          ORDER BY g."NgayGhiNhan" DESC
          LIMIT 1
        `,
        params: account.MaDonVi ? [account.MaTaiKhoan, account.MaDonVi] : [account.MaTaiKhoan]
      }
    ];

    if (!practitionerId) {
      for (const strategy of practitionerLookupStrategies) {
        if (strategy.skip) {
          continue;
        }

        const result = await db.queryOne<{ MaNhanVien: string }>(strategy.query, strategy.params);
        if (result?.MaNhanVien) {
          practitionerId = result.MaNhanVien;
          practitionerLookupSource = strategy.name;
          break;
        }
      }
    }

    const queryStartTime = performance.now();

    if (!practitionerId) {
      const totalDuration = timer();
      perfMonitor.log({
        endpoint: '/api/dashboard/practitioner',
        method: 'GET',
        duration: totalDuration,
        timestamp: new Date(),
        status: 404,
        metadata: { 
          error: 'Practitioner not resolved from account',
          accountId: session.user.id,
          lookupStrategies: practitionerLookupStrategies.map((strategy) => strategy.name)
        }
      });

      return NextResponse.json(
        { 
          success: false,
          error: "Practitioner not found",
          message: "No practitioner record linked to this account. Please contact the system administrator to verify your practitioner profile."
        },
        { status: 404 }
      );
    }
    
    // Single consolidated query using CTEs
    const dashboardData: any = await db.query(
      `WITH 
      -- CTE 1: Practitioner basic info
      practitioner_info AS (
        SELECT 
          nv."MaNhanVien",
          nv."HoVaTen",
          nv."SoCCHN",
          nv."ChucDanh",
          nv."MaDonVi",
          dv."TenDonVi"
        FROM "NhanVien" nv
        LEFT JOIN "DonVi" dv ON nv."MaDonVi" = dv."MaDonVi"
        WHERE nv."MaNhanVien" = $1
        LIMIT 1
      ),
      -- CTE 2: Active credit cycle
      active_cycle AS (
        SELECT 
          kc."MaKy",
          kc."NgayBatDau",
          kc."NgayKetThuc",
          kc."SoTinChiYeuCau",
          kc."TrangThai",
          COALESCE(SUM(
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
          ), 0) as earned_credits,
          COUNT(DISTINCT g."MaGhiNhan") FILTER (WHERE g."TrangThaiDuyet" = 'ChoDuyet') as pending_count,
          COUNT(DISTINCT g."MaGhiNhan") FILTER (WHERE g."TrangThaiDuyet" = 'DaDuyet') as approved_count
        FROM practitioner_info pi
        LEFT JOIN "KyCNKT" kc ON pi."MaNhanVien" = kc."MaNhanVien"
          AND kc."TrangThai" = 'DangDienRa'
        LEFT JOIN "GhiNhanHoatDong" g ON pi."MaNhanVien" = g."MaNhanVien"
          AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        GROUP BY kc."MaKy", kc."NgayBatDau", kc."NgayKetThuc", kc."SoTinChiYeuCau", kc."TrangThai"
        LIMIT 1
      ),
      -- CTE 3: Recent activities (last 10)
      recent_activities AS (
        SELECT 
          g."MaGhiNhan" as id,
          g."TenHoatDong" as title,
          g."HinhThucCapNhatKienThucYKhoa" as type,
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND (
                g."MaDanhMuc" IS NULL
                OR dm_recent."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm_recent."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END as credits,
          g."TrangThaiDuyet" as status,
          g."NgayGhiNhan" as date,
          g."GhiChuDuyet" as reviewer_comment
        FROM practitioner_info pi
        LEFT JOIN "GhiNhanHoatDong" g ON pi."MaNhanVien" = g."MaNhanVien"
        LEFT JOIN "DanhMucHoatDong" dm_recent ON dm_recent."MaDanhMuc" = g."MaDanhMuc"
        ORDER BY g."NgayGhiNhan" DESC
        LIMIT 10
      ),
      -- CTE 4: Priority notifications (unread only)
      priority_notifications AS (
        SELECT 
          tb."MaThongBao" as id,
          tb."Loai" as type,
          tb."ThongDiep" as message,
          tb."LienKet" as link,
          tb."TrangThai" as status,
          tb."TaoLuc" as created_at
        FROM "ThongBao" tb
        WHERE tb."MaNguoiNhan" = $2
          AND tb."TrangThai" = 'Moi'
          AND tb."Loai" IN ('CanhBao', 'KhanCap')
        ORDER BY tb."TaoLuc" DESC
        LIMIT 5
      ),
      -- CTE 5: Credit history summary
      -- Column names aliased to match CreditSummary interface expectations
      credit_summary AS (
        SELECT 
          g."HinhThucCapNhatKienThucYKhoa" as "LoaiHoatDong",
          COALESCE(SUM(
            CASE
              WHEN g."TrangThaiDuyet" = 'DaDuyet'
                AND (
                  g."MaDanhMuc" IS NULL
                  OR dm_summary."YeuCauMinhChung" IS DISTINCT FROM TRUE
                  OR (
                    dm_summary."YeuCauMinhChung" = TRUE
                    AND g."FileMinhChungUrl" IS NOT NULL
                    AND BTRIM(g."FileMinhChungUrl") <> ''
                  )
                )
              THEN g."SoGioTinChiQuyDoi"
              ELSE 0
            END
          ), 0) as "TongTinChi",
          COUNT(*)::integer as "SoHoatDong"
        FROM practitioner_info pi
        LEFT JOIN active_cycle ac ON 1=1
        LEFT JOIN "GhiNhanHoatDong" g ON pi."MaNhanVien" = g."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
          AND g."NgayGhiNhan" BETWEEN ac."NgayBatDau" AND ac."NgayKetThuc"
        LEFT JOIN "DanhMucHoatDong" dm_summary ON dm_summary."MaDanhMuc" = g."MaDanhMuc"
        WHERE g."HinhThucCapNhatKienThucYKhoa" IS NOT NULL
        GROUP BY g."HinhThucCapNhatKienThucYKhoa"
      )
      -- Final SELECT: Combine all CTEs into consolidated response
      SELECT 
        json_build_object(
          'practitionerId', pi."MaNhanVien",
          'name', pi."HoVaTen",
          'licenseNumber', pi."SoCCHN",
          'position', pi."ChucDanh",
          'unitId', pi."MaDonVi",
          'unitName', pi."TenDonVi"
        ) as practitioner,
        CASE
          WHEN ac."MaKy" IS NULL THEN NULL
          ELSE json_build_object(
            'cycleId', ac."MaKy",
            'startDate', ac."NgayBatDau",
            'endDate', ac."NgayKetThuc",
            'requiredCredits', ac."SoTinChiYeuCau",
            'earnedCredits', ac.earned_credits,
            'status', ac."TrangThai",
            'pendingCount', ac.pending_count,
            'approvedCount', ac.approved_count,
            'compliancePercent', CASE 
              WHEN ac."SoTinChiYeuCau" > 0 
              THEN ROUND((ac.earned_credits / ac."SoTinChiYeuCau") * 100)
              ELSE 0 
            END
          )
        END as cycle,
        (
          SELECT json_agg(row_to_json(recent_activities.*)) 
          FROM recent_activities
        ) as activities,
        (
          SELECT json_agg(row_to_json(priority_notifications.*)) 
          FROM priority_notifications
        ) as notifications,
        (
          SELECT json_agg(row_to_json(credit_summary.*)) 
          FROM credit_summary
        ) as credit_summary
      FROM practitioner_info pi
      LEFT JOIN active_cycle ac ON TRUE`,
      [practitionerId, session.user.id]
    );

    const queryDuration = performance.now() - queryStartTime;

    // Parse the result
    const result = dashboardData[0] || {};
    
    // Check if practitioner exists (authorization check)
    if (!result.practitioner || !result.practitioner.practitionerId) {
      const totalDuration = timer();
      perfMonitor.log({
        endpoint: '/api/dashboard/practitioner',
        method: 'GET',
        duration: totalDuration,
        timestamp: new Date(),
        status: 404,
        metadata: { 
          error: 'Practitioner not found or account not linked',
          accountId: session.user.id,
          resolvedPractitionerId: practitionerId,
          lookupSource: practitionerLookupSource
        }
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: "Practitioner not found",
          message: "No practitioner record linked to this account. Please contact the system administrator to verify your practitioner profile."
        },
        { status: 404 }
      );
    }
    
    // Handle null arrays
    const response = {
      success: true,
      data: {
        practitioner: result.practitioner,
        cycle: result.cycle || null,
        activities: result.activities || [],
        notifications: result.notifications || [],
        creditSummary: result.credit_summary || []
      }
    };

    const totalDuration = timer();
    
    // Log performance metrics
    perfMonitor.log({
      endpoint: '/api/dashboard/practitioner',
      method: 'GET',
      duration: totalDuration,
        timestamp: new Date(),
        status: 200,
        metadata: { 
          queryDuration: queryDuration.toFixed(2) + 'ms',
          userId: session.user.id,
          practitionerId,
          lookupSource: practitionerLookupSource
        }
      });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching practitioner dashboard:', error);
    
    const totalDuration = timer();
    perfMonitor.log({
      endpoint: '/api/dashboard/practitioner',
      method: 'GET',
      duration: totalDuration,
      timestamp: new Date(),
      status: 500,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
