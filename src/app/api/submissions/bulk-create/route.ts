import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/server';
import { UUIDSchema, TrangThaiLamViecSchema } from '@/lib/db/schemas';
import { danhMucHoatDongRepo, ghiNhanHoatDongRepo, nhanVienRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';
import type { BulkSubmissionRequest, BulkSubmissionResponse } from '@/types/bulk-submission';
import { AUDIT_ACTIONS } from '@/types/audit-actions';

const cohortFiltersSchema = z
  .object({
    search: z.string().trim().max(255).optional(),
    trangThai: TrangThaiLamViecSchema.or(z.literal('all')).optional(),
    chucDanh: z.string().trim().max(255).optional(),
    khoaPhong: z.string().trim().max(255).optional(),
  })
  .partial();

const uuidArraySchema = z.array(UUIDSchema).or(z.undefined());

const isoDateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid ISO date string',
  });

const cohortSelectionSchema = z.object({
  mode: z.enum(['all', 'manual']),
  selectedIds: uuidArraySchema.default([]),
  excludedIds: uuidArraySchema.default([]),
  filters: cohortFiltersSchema.default({}),
  totalFiltered: z.number().int().min(0),
});

const bulkSubmissionSchema = z.object({
  MaDanhMuc: UUIDSchema,
  cohort: cohortSelectionSchema,
  NgayBatDau: isoDateStringSchema.optional(),
  NgayKetThuc: isoDateStringSchema.optional(),
  DonViToChuc: z.string().trim().max(255).optional(),
});

type AuthorizedRole = 'DonVi' | 'SoYTe';

type ActivityRecord = {
  MaDanhMuc: string;
  TenDanhMuc: string;
  TyLeQuyDoi?: number | string | null;
  LoaiHoatDong?: string | null;
  YeuCauMinhChung?: boolean | null;
  TrangThai?: string | null;
  MaDonVi?: string | null;
  HieuLucTu?: string | Date | null;
  HieuLucDen?: string | Date | null;
  DaXoaMem?: boolean | null;
};

/**
 * Extract client IP address from request headers
 * Handles various proxy headers (Cloudflare, nginx, etc.)
 */
function getClientIp(request: NextRequest): string | null {
  // Try Cloudflare header first
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  // Try X-Forwarded-For (comma-separated list, first is client)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  // Try X-Real-IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Fallback to null (server-side rendering may not have IP)
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse<BulkSubmissionResponse | { error: string; details?: unknown }>> {
  try {
    // Extract client IP address for audit logging
    const ipAddress = getClientIp(request);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const parsed = bulkSubmissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data as BulkSubmissionRequest;

    if (payload.cohort.mode === 'manual' && (!payload.cohort.selectedIds || payload.cohort.selectedIds.length === 0)) {
      return NextResponse.json({ error: 'No practitioners selected' }, { status: 400 });
    }

    const startDate = payload.NgayBatDau ? new Date(payload.NgayBatDau) : null;
    const endDate = payload.NgayKetThuc ? new Date(payload.NgayKetThuc) : null;

    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      return NextResponse.json({ error: 'NgayKetThuc must be greater than or equal to NgayBatDau' }, { status: 400 });
    }

    const activity = (await danhMucHoatDongRepo.findById(payload.MaDanhMuc)) as ActivityRecord | null;
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    if ('DaXoaMem' in activity && activity.DaXoaMem) {
      return NextResponse.json({ error: 'Activity is not available' }, { status: 400 });
    }

    if (activity.TrangThai && activity.TrangThai !== 'Active') {
      return NextResponse.json({ error: 'Activity is not active' }, { status: 400 });
    }

    if (user.role === 'DonVi') {
      if (!user.unitId) {
        return NextResponse.json({ error: 'Unit information is required' }, { status: 403 });
      }
      const ownedByUnit = activity.MaDonVi === null || activity.MaDonVi === user.unitId;
      if (!ownedByUnit) {
        return NextResponse.json({ error: 'Activity does not belong to this unit' }, { status: 403 });
      }
    }

    const now = new Date();
    const activityStart = activity.HieuLucTu ? new Date(activity.HieuLucTu) : null;
    const activityEnd = activity.HieuLucDen ? new Date(activity.HieuLucDen) : null;

    if (activityStart && activityStart.getTime() > now.getTime()) {
      return NextResponse.json({ error: 'Activity is not yet valid' }, { status: 400 });
    }

    if (activityEnd && activityEnd.getTime() < now.getTime()) {
      return NextResponse.json({ error: 'Activity validity has expired' }, { status: 400 });
    }

    const { practitioners, errors, normalizedSelection } = await nhanVienRepo.resolveBulkCohortSelection(
      payload.cohort,
      {
        role: user.role as AuthorizedRole,
        unitId: user.unitId ?? null,
      },
    );

    if (user.role === 'DonVi' && user.unitId) {
      const mismatchedTenancy = await nhanVienRepo.validatePractitionersTenancy(
        practitioners.map((p) => p.MaNhanVien),
        user.unitId,
      );

      if (mismatchedTenancy.length > 0) {
        return NextResponse.json({ error: 'Cannot create submissions for other units' }, { status: 403 });
      }
    }

    const practitionerIds = practitioners.map((p) => p.MaNhanVien);

    const duplicateIdsFromDb = await ghiNhanHoatDongRepo.findDuplicatePractitionerIds(
      payload.MaDanhMuc,
      practitionerIds,
    );

    const duplicateSet = new Set(duplicateIdsFromDb);
    const candidates = practitioners.filter((row) => !duplicateSet.has(row.MaNhanVien));

    if (candidates.length === 0) {
      const duplicateIdList = Array.from(duplicateSet);
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: duplicateIdList.length,
        failed: errors.length,
        details: {
          submissionIds: [],
          duplicates: duplicateIdList,
          errors,
        },
        message: `Đã tạo 0 bản ghi, bỏ qua ${duplicateIdList.length} bản ghi trùng`,
      });
    }

    const conversionRateRaw = activity.TyLeQuyDoi ?? 0;
    const conversionRate =
      typeof conversionRateRaw === 'number'
        ? conversionRateRaw
        : Number(conversionRateRaw || 0);

    const initialStatus: 'ChoDuyet' | 'Nhap' = activity.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet';
    const organizer = payload.DonViToChuc?.length ? payload.DonViToChuc : null;

    const submissionsToCreate = candidates.map((candidate) => ({
      MaNhanVien: candidate.MaNhanVien,
      MaDanhMuc: activity.MaDanhMuc,
      TenHoatDong: activity.TenDanhMuc,
      NguoiNhap: user.id,
      TrangThaiDuyet: initialStatus,
      DonViToChuc: organizer,
      NgayBatDau: startDate,
      NgayKetThuc: endDate,
      SoTiet: null,
      SoGioTinChiQuyDoi: conversionRate,
      HinhThucCapNhatKienThucYKhoa: activity.LoaiHoatDong ?? null,
      FileMinhChungUrl: null,
      BangChungSoGiayChungNhan: null,
    }));

    const insertResult = await ghiNhanHoatDongRepo.bulkCreate(submissionsToCreate);

    insertResult.conflicts.forEach((id: string) => duplicateSet.add(id));

    const duplicateIdList = Array.from(duplicateSet);
    const responseBody: BulkSubmissionResponse = {
      success: true,
      created: insertResult.inserted.length,
      skipped: duplicateIdList.length,
      failed: errors.length,
      details: {
        submissionIds: insertResult.inserted.map((row) => row.MaGhiNhan),
        duplicates: duplicateIdList,
        errors,
      },
      message: buildSummaryMessage(insertResult.inserted.length, duplicateIdList.length, errors.length),
    };

    // Audit log: Record bulk submission creation with complete metadata
    await nhatKyHeThongRepo.logAction(
      user.id,
      AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
      'GhiNhanHoatDong',
      null, // No single primary key for bulk operations
      {
        // Activity information
        activityId: payload.MaDanhMuc,
        activityName: activity.TenDanhMuc,

        // Cohort selection details
        cohortMode: normalizedSelection.mode,
        cohortFilters: normalizedSelection.filters,
        totalSelected: practitioners.length,
        totalExcluded: normalizedSelection.excludedIds.length,

        // Operation results
        created: insertResult.inserted.length,
        skipped: duplicateIdList.length,
        failed: errors.length,

        // Actor information
        actorRole: user.role,
        unitId: user.unitId,

        // Sample practitioner IDs (first 10 for audit trail)
        samplePractitionerIds: practitioners
          .slice(0, 10)
          .map(p => p.MaNhanVien),
      },
      ipAddress,
    );

    return NextResponse.json(responseBody, { status: insertResult.inserted.length > 0 ? 201 : 200 });
  } catch (error) {
    console.error('Bulk submission creation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildSummaryMessage(created: number, skipped: number, failed: number): string {
  const parts = [`Đã tạo ${created} bản ghi`, `bỏ qua ${skipped} bản ghi trùng`];
  if (failed > 0) {
    parts.push(`${failed} bản ghi lỗi`);
  }
  return parts.join(', ');
}
