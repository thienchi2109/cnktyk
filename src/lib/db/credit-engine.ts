/**
 * Credit Calculation Engine
 * Handles credit conversion, cycle tracking, and compliance calculations
 */

import { db } from './client';
import { calculateEffectiveCredits } from './credit-utils';
import type { 
  GhiNhanHoatDong, 
  QuyTacTinChi, 
  DanhMucHoatDong,
  NhanVien 
} from './schemas';

/**
 * Compliance Cycle Information
 */
export interface ComplianceCycle {
  MaNhanVien: string;
  NgayBatDau: Date;
  NgayKetThuc: Date;
  TongTinChiYeuCau: number;
  TongTinChiDatDuoc: number;
  TyLeHoanThanh: number;
  TrangThai: 'DangThucHien' | 'HoanThanh' | 'QuaHan' | 'SapHetHan';
  SoNgayConLai: number;
}

/**
 * Credit Summary by Activity Type
 */
export interface CreditSummary {
  LoaiHoatDong: string;
  TongTinChi: number;
  SoHoatDong: number;
  TranToiDa?: number;
  ConLai?: number;
}

/**
 * Credit History Entry
 */
export interface CreditHistory {
  MaGhiNhan: string;
  TenHoatDong: string;
  LoaiHoatDong: string | null;
  SoTinChi: number;
  NgayGhiNhan: Date;
  TrangThaiDuyet: string;
  GhiChu: string | null;
}

/**
 * Calculate credits based on activity type and hours
 */
export async function calculateCredits(
  activityCatalogId: string | null,
  hours: number | null
): Promise<number> {
  if (!activityCatalogId || !hours) {
    return 0;
  }

  const activity = await db.query<DanhMucHoatDong>(
    `SELECT * FROM "DanhMucHoatDong" WHERE "MaDanhMuc" = $1`,
    [activityCatalogId]
  );

  if (activity.length === 0) {
    return 0;
  }

  const catalog = activity[0];
  const conversionRate = Number(catalog.TyLeQuyDoi) || 1.0;
  
  return hours * conversionRate;
}

/**
 * Get active credit rule
 */
export async function getActiveCreditRule(): Promise<QuyTacTinChi | null> {
  const result = await db.query<QuyTacTinChi>(
    `SELECT * FROM "QuyTacTinChi" 
     WHERE "TrangThai" = true 
     AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
     AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
     ORDER BY "HieuLucTu" DESC NULLS LAST
     LIMIT 1`
  );

  return result[0] || null;
}

/**
 * Get practitioner's current compliance cycle
 */
export async function getCurrentCycle(practitionerId: string): Promise<ComplianceCycle | null> {
  const rule = await getActiveCreditRule();
  if (!rule) {
    return null;
  }

  // Get practitioner info to determine cycle start date
  const practitioner = await db.query<NhanVien>(
    `SELECT * FROM "NhanVien" WHERE "MaNhanVien" = $1`,
    [practitionerId]
  );

  if (practitioner.length === 0) {
    return null;
  }

  const prac = practitioner[0];
  const cycleStartDate = prac.NgayCapCCHN || new Date();
  const cycleYears = Number(rule.ThoiHanNam) || 5;
  const cycleEndDate = new Date(cycleStartDate);
  cycleEndDate.setFullYear(cycleEndDate.getFullYear() + cycleYears);

  // Calculate total approved credits in current cycle
  const creditsResult = await db.query<{ total: number }>(
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
     WHERE g."MaNhanVien" = $1
       AND g."TrangThaiDuyet" = 'DaDuyet'
       AND g."NgayBatDau" >= $2
       AND g."NgayBatDau" <= $3`,
    [practitionerId, cycleStartDate, cycleEndDate]
  );

  const totalCredits = Number(creditsResult[0]?.total || 0);
  const requiredCredits = Number(rule.TongTinChiYeuCau) || 120;
  const completionRate = (totalCredits / requiredCredits) * 100;

  // Calculate days remaining
  const today = new Date();
  const daysRemaining = Math.ceil((cycleEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Determine status
  let status: ComplianceCycle['TrangThai'] = 'DangThucHien';
  if (completionRate >= 100) {
    status = 'HoanThanh';
  } else if (daysRemaining < 0) {
    status = 'QuaHan';
  } else if (daysRemaining <= 180) { // 6 months
    status = 'SapHetHan';
  }

  return {
    MaNhanVien: practitionerId,
    NgayBatDau: cycleStartDate,
    NgayKetThuc: cycleEndDate,
    TongTinChiYeuCau: requiredCredits,
    TongTinChiDatDuoc: totalCredits,
    TyLeHoanThanh: Math.round(completionRate * 100) / 100,
    TrangThai: status,
    SoNgayConLai: Math.max(0, daysRemaining)
  };
}

/**
 * Get credit summary by activity type for a practitioner
 */
export async function getCreditSummaryByType(
  practitionerId: string,
  cycleStartDate: Date,
  cycleEndDate: Date
): Promise<CreditSummary[]> {
  const rule = await getActiveCreditRule();
  const categoryLimits = rule?.TranTheoLoai as Record<string, number> | null;

  const result = await db.query<{
    LoaiHoatDong: string;
    TongTinChi: number;
    SoHoatDong: number;
  }>(
    `SELECT 
      COALESCE(dm."LoaiHoatDong", 'Khac') as "LoaiHoatDong",
      COALESCE(SUM(
        CASE
          WHEN g."MaDanhMuc" IS NULL
            OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
            OR (
              dm."YeuCauMinhChung" = TRUE
              AND g."FileMinhChungUrl" IS NOT NULL
              AND BTRIM(g."FileMinhChungUrl") <> ''
            )
          THEN g."SoGioTinChiQuyDoi"
          ELSE 0
        END
      ), 0) as "TongTinChi",
      COUNT(g."MaGhiNhan") as "SoHoatDong"
     FROM "GhiNhanHoatDong" g
     LEFT JOIN "DanhMucHoatDong" dm ON g."MaDanhMuc" = dm."MaDanhMuc"
     WHERE g."MaNhanVien" = $1
     AND g."TrangThaiDuyet" = 'DaDuyet'
     AND g."NgayBatDau" >= $2
     AND g."NgayBatDau" <= $3
     GROUP BY dm."LoaiHoatDong"
     ORDER BY "TongTinChi" DESC`,
    [practitionerId, cycleStartDate, cycleEndDate]
  );

  return result.map(row => {
    const limit = categoryLimits?.[row.LoaiHoatDong];
    const totalCredits = Number(row.TongTinChi);
    
    return {
      LoaiHoatDong: row.LoaiHoatDong,
      TongTinChi: totalCredits,
      SoHoatDong: Number(row.SoHoatDong),
      TranToiDa: limit,
      ConLai: limit ? Math.max(0, limit - totalCredits) : undefined
    };
  });
}

/**
 * Get credit history for a practitioner
 */
export async function getCreditHistory(
  practitionerId: string,
  cycleStartDate: Date,
  cycleEndDate: Date,
  limit: number = 50
): Promise<CreditHistory[]> {
  const result = await db.query<{
    MaGhiNhan: string;
    TenHoatDong: string;
    LoaiHoatDong: string | null;
    SoGioTinChiQuyDoi: number;
    SoTiet: number | null;
    NgayGhiNhan: Date;
    TrangThaiDuyet: string;
    GhiChu: string | null;
    FileMinhChungUrl: string | null;
    YeuCauMinhChung: boolean | null;
    GioToiThieu: number | null;
    GioToiDa: number | null;
    TyLeQuyDoi: number | null;
  }>(
    `SELECT 
      g."MaGhiNhan",
      g."TenHoatDong",
      dm."LoaiHoatDong",
      g."SoGioTinChiQuyDoi",
      g."SoTiet",
      g."NgayGhiNhan",
      g."TrangThaiDuyet",
      g."GhiChu",
      g."FileMinhChungUrl",
      dm."YeuCauMinhChung",
      dm."GioToiThieu",
      dm."GioToiDa",
      dm."TyLeQuyDoi"
     FROM "GhiNhanHoatDong" g
     LEFT JOIN "DanhMucHoatDong" dm ON g."MaDanhMuc" = dm."MaDanhMuc"
     WHERE g."MaNhanVien" = $1
     AND g."NgayBatDau" >= $2
     AND g."NgayBatDau" <= $3
     ORDER BY g."NgayGhiNhan" DESC
     LIMIT $4`,
    [practitionerId, cycleStartDate, cycleEndDate, limit]
  );

  return result.map(row => {
    const activityInfo =
      row.YeuCauMinhChung === null && row.TyLeQuyDoi === null && row.GioToiThieu === null && row.GioToiDa === null
        ? null
        : {
            YeuCauMinhChung: row.YeuCauMinhChung ?? false,
            TyLeQuyDoi: row.TyLeQuyDoi !== null ? Number(row.TyLeQuyDoi) : undefined,
            GioToiThieu: row.GioToiThieu !== null ? Number(row.GioToiThieu) : null,
            GioToiDa: row.GioToiDa !== null ? Number(row.GioToiDa) : null,
          };

    const credits = calculateEffectiveCredits({
      submission: {
        TrangThaiDuyet: row.TrangThaiDuyet as GhiNhanHoatDong['TrangThaiDuyet'],
        SoTiet: row.SoTiet ?? null,
        SoGioTinChiQuyDoi: Number(row.SoGioTinChiQuyDoi ?? 0),
        FileMinhChungUrl: row.FileMinhChungUrl ?? null,
      },
      activity: activityInfo ?? undefined,
    });

    return {
      MaGhiNhan: row.MaGhiNhan,
      TenHoatDong: row.TenHoatDong,
      LoaiHoatDong: row.LoaiHoatDong,
      SoTinChi: credits,
      NgayGhiNhan: row.NgayGhiNhan,
      TrangThaiDuyet: row.TrangThaiDuyet,
      GhiChu: row.GhiChu,
    };
  });
}

/**
 * Validate if adding credits would exceed category limits
 */
export async function validateCategoryLimit(
  practitionerId: string,
  activityType: string,
  creditsToAdd: number,
  cycleStartDate: Date,
  cycleEndDate: Date
): Promise<{ valid: boolean; message?: string; currentTotal?: number; limit?: number }> {
  const rule = await getActiveCreditRule();
  if (!rule || !rule.TranTheoLoai) {
    return { valid: true };
  }

  const categoryLimits = rule.TranTheoLoai as Record<string, number>;
  const limit = categoryLimits[activityType];

  if (!limit) {
    return { valid: true };
  }

  // Get current total for this category
  const result = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(
        CASE
          WHEN dm."LoaiHoatDong" = $2
            AND g."TrangThaiDuyet" = 'DaDuyet'
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
     LEFT JOIN "DanhMucHoatDong" dm ON g."MaDanhMuc" = dm."MaDanhMuc"
     WHERE g."MaNhanVien" = $1
     AND g."NgayBatDau" >= $3
     AND g."NgayBatDau" <= $4`,
    [practitionerId, activityType, cycleStartDate, cycleEndDate]
  );

  const currentTotal = Number(result[0]?.total || 0);
  const newTotal = currentTotal + creditsToAdd;

  if (newTotal > limit) {
    return {
      valid: false,
      message: `Vượt quá giới hạn tín chỉ cho loại hoạt động ${activityType}. Hiện tại: ${currentTotal}/${limit}, Thêm: ${creditsToAdd}`,
      currentTotal,
      limit
    };
  }

  return {
    valid: true,
    currentTotal,
    limit
  };
}

/**
 * Get compliance statistics for multiple practitioners (for unit/department dashboards)
 */
export async function getComplianceStatistics(
  practitionerIds: string[]
): Promise<{
  total: number;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  averageCompletion: number;
}> {
  if (practitionerIds.length === 0) {
    return {
      total: 0,
      compliant: 0,
      atRisk: 0,
      nonCompliant: 0,
      averageCompletion: 0
    };
  }

  const rule = await getActiveCreditRule();
  if (!rule) {
    return {
      total: practitionerIds.length,
      compliant: 0,
      atRisk: 0,
      nonCompliant: 0,
      averageCompletion: 0
    };
  }

  const requiredCredits = Number(rule.TongTinChiYeuCau) || 120;
  let compliant = 0;
  let atRisk = 0;
  let nonCompliant = 0;
  let totalCompletion = 0;

  for (const practitionerId of practitionerIds) {
    const cycle = await getCurrentCycle(practitionerId);
    if (cycle) {
      totalCompletion += cycle.TyLeHoanThanh;
      
      if (cycle.TyLeHoanThanh >= 100) {
        compliant++;
      } else if (cycle.TyLeHoanThanh >= 70) {
        atRisk++;
      } else {
        nonCompliant++;
      }
    }
  }

  return {
    total: practitionerIds.length,
    compliant,
    atRisk,
    nonCompliant,
    averageCompletion: practitionerIds.length > 0 
      ? Math.round((totalCompletion / practitionerIds.length) * 100) / 100 
      : 0
  };
}
