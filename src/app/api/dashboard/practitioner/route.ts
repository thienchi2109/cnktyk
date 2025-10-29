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

    const queryStartTime = performance.now();
    
    // Single consolidated query using CTEs
    const dashboardData: any = await db.query(
      `WITH 
      -- CTE 1: Practitioner basic info
      -- Reverted join: use previous lookup to avoid relying on Email = TenDangNhap
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
        LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = $1
        WHERE nv."MaNhanVien" = $1 
          OR nv."Email" = (SELECT "TenDangNhap" FROM "TaiKhoan" WHERE "MaTaiKhoan" = $1)
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
          COALESCE(SUM(g."SoGioTinChiQuyDoi") FILTER (WHERE g."TrangThaiDuyet" = 'DaDuyet'), 0) as earned_credits,
          COUNT(DISTINCT g."MaGhiNhan") FILTER (WHERE g."TrangThaiDuyet" = 'ChoDuyet') as pending_count,
          COUNT(DISTINCT g."MaGhiNhan") FILTER (WHERE g."TrangThaiDuyet" = 'DaDuyet') as approved_count
        FROM practitioner_info pi
        LEFT JOIN "KyCNKT" kc ON pi."MaNhanVien" = kc."MaNhanVien"
          AND kc."TrangThai" = 'DangDienRa'
        LEFT JOIN "GhiNhanHoatDong" g ON pi."MaNhanVien" = g."MaNhanVien"
          AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
        GROUP BY kc."MaKy", kc."NgayBatDau", kc."NgayKetThuc", kc."SoTinChiYeuCau", kc."TrangThai"
        LIMIT 1
      ),
      -- CTE 3: Recent activities (last 10)
      recent_activities AS (
        SELECT 
          g."MaGhiNhan" as id,
          g."TenHoatDong" as title,
          g."HinhThucCapNhatKienThucYKhoa" as type,
          g."SoGioTinChiQuyDoi" as credits,
          g."TrangThaiDuyet" as status,
          g."NgayGhiNhan" as date,
          g."GhiChuDuyet" as reviewer_comment
        FROM practitioner_info pi
        LEFT JOIN "GhiNhanHoatDong" g ON pi."MaNhanVien" = g."MaNhanVien"
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
        FROM "TaiKhoan" tk
        LEFT JOIN "ThongBao" tb ON tk."MaTaiKhoan" = tb."MaNguoiNhan"
        WHERE tk."MaTaiKhoan" = $1
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
          COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as "TongTinChi",
          COUNT(*)::integer as "SoHoatDong"
        FROM practitioner_info pi
        LEFT JOIN active_cycle ac ON 1=1
        LEFT JOIN "GhiNhanHoatDong" g ON pi."MaNhanVien" = g."MaNhanVien"
          AND g."TrangThaiDuyet" = 'DaDuyet'
          AND g."NgayGhiNhan" BETWEEN ac."NgayBatDau" AND ac."NgayKetThuc"
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
        json_build_object(
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
        ) as cycle,
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
      CROSS JOIN active_cycle ac`,
      [session.user.id]
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
          accountId: session.user.id
        }
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: "Practitioner not found",
          message: "No practitioner record linked to this account. Please ensure your Email in NhanVien matches your account username (TenDangNhap)."
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
        userId: session.user.id
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
