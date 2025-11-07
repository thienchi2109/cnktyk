import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { danhMucHoatDongRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';
import { UUIDSchema, TrangThaiLamViecSchema } from '@/lib/db/schemas';
import type {
  BulkSubmissionRequest,
  BulkSubmissionResponse,
  BulkSubmissionResultError,
  BulkCohortSelection,
} from '@/types/bulk-submission';

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

type PractitionerRow = {
  MaNhanVien: string;
  MaDonVi: string;
};

type CohortResolutionResult = {
  practitioners: PractitionerRow[];
  errors: BulkSubmissionResultError[];
  normalizedSelection: BulkCohortSelection;
};

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

export async function POST(request: NextRequest): Promise<NextResponse<BulkSubmissionResponse | { error: string; details?: unknown }>> {
  try {
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

    const { practitioners, errors, normalizedSelection } = await resolveCohort(payload.cohort, user.role as AuthorizedRole, user.unitId);

    if (user.role === 'DonVi') {
      const outsideUnit = practitioners.filter((p) => p.MaDonVi !== user.unitId);
      if (outsideUnit.length > 0) {
        return NextResponse.json({ error: 'Cannot create submissions for other units' }, { status: 403 });
      }
    }

    const practitionerIds = practitioners.map((p) => p.MaNhanVien);

    const duplicateRows = practitionerIds.length
      ? await db.query<{ MaNhanVien: string }>(
          `SELECT "MaNhanVien"
           FROM "GhiNhanHoatDong"
           WHERE "MaDanhMuc" = $1 AND "MaNhanVien" = ANY($2::uuid[])`,
          [payload.MaDanhMuc, practitionerIds],
        )
      : [];

    const duplicateSet = new Set(duplicateRows.map((row) => row.MaNhanVien));
    const candidates = practitioners.filter((row) => !duplicateSet.has(row.MaNhanVien));

    if (candidates.length === 0) {
      const duplicateIds = Array.from(duplicateSet);
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: duplicateIds.length,
        failed: errors.length,
        details: {
          submissionIds: [],
          duplicates: duplicateIds,
          errors,
        },
        message: `Đã tạo 0 bản ghi, bỏ qua ${duplicateIds.length} bản ghi trùng`,
      });
    }

    const insertResult = await insertBulkSubmissions({
      candidates,
      activity,
      userId: user.id,
      startDate,
      endDate,
      organizer: payload.DonViToChuc?.length ? payload.DonViToChuc : null,
    });

    insertResult.conflicts.forEach((id: string) => duplicateSet.add(id));

    const duplicateIds = Array.from(duplicateSet);
    const responseBody: BulkSubmissionResponse = {
      success: true,
      created: insertResult.inserted.length,
      skipped: duplicateIds.length,
      failed: errors.length,
      details: {
        submissionIds: insertResult.inserted.map((row) => row.MaGhiNhan),
        duplicates: duplicateIds,
        errors,
      },
      message: buildSummaryMessage(insertResult.inserted.length, duplicateIds.length, errors.length),
    };

    await nhatKyHeThongRepo.create({
      MaTaiKhoan: user.id,
      HanhDong: 'BULK_SUBMISSION_CREATE',
      Bang: 'GhiNhanHoatDong',
      KhoaChinh: null,
      DiaChiIP: null,
      NoiDung: {
        activityId: payload.MaDanhMuc,
        activityName: activity.TenDanhMuc,
        cohortMode: normalizedSelection.mode,
        cohortFilters: normalizedSelection.filters,
        totalSelected: practitioners.length,
        totalExcluded: normalizedSelection.excludedIds.length,
        created: insertResult.inserted.length,
        skipped: duplicateIds.length,
        failed: errors.length,
        actorRole: user.role,
      },
    });

    return NextResponse.json(responseBody, { status: insertResult.inserted.length > 0 ? 201 : 200 });
  } catch (error) {
    console.error('Bulk submission creation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function resolveCohort(
  selection: BulkCohortSelection,
  role: AuthorizedRole,
  unitId?: string | null,
): Promise<CohortResolutionResult> {
  const normalizedSelection: BulkCohortSelection = {
    mode: selection.mode,
    selectedIds: Array.from(new Set(selection.selectedIds ?? [])),
    excludedIds: Array.from(new Set(selection.excludedIds ?? [])),
    filters: selection.filters ?? {},
    totalFiltered: selection.totalFiltered,
  };

  const errors: BulkSubmissionResultError[] = [];
  const excludedSet = new Set(normalizedSelection.excludedIds);

  if (normalizedSelection.mode === 'manual') {
    const selected = normalizedSelection.selectedIds.filter((id) => !excludedSet.has(id));
    if (!selected.length) {
      return {
        practitioners: [],
        errors: [{ practitionerId: 'manual_selection', error: 'No practitioners selected after exclusions' }],
        normalizedSelection,
      };
    }

    const rows = await db.query<PractitionerRow>(
      `SELECT "MaNhanVien", "MaDonVi"
       FROM "NhanVien"
       WHERE "MaNhanVien" = ANY($1::uuid[])`,
      [selected],
    );

    const foundSet = new Set(rows.map((row) => row.MaNhanVien));
    selected.forEach((id) => {
      if (!foundSet.has(id)) {
        errors.push({ practitionerId: id, error: 'Practitioner not found' });
      }
    });

    return { practitioners: rows, errors, normalizedSelection };
  }

  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (role === 'DonVi' && unitId) {
    clauses.push(`nv."MaDonVi" = $${paramIndex}`);
    params.push(unitId);
    paramIndex += 1;
  }

  const { filters } = normalizedSelection;

  if (filters.trangThai && filters.trangThai !== 'all') {
    clauses.push(`nv."TrangThaiLamViec" = $${paramIndex}`);
    params.push(filters.trangThai);
    paramIndex += 1;
  }

  if (filters.chucDanh) {
    clauses.push(`LOWER(nv."ChucDanh") = LOWER($${paramIndex})`);
    params.push(filters.chucDanh);
    paramIndex += 1;
  }

  if (filters.khoaPhong) {
    clauses.push(`LOWER(nv."KhoaPhong") = LOWER($${paramIndex})`);
    params.push(filters.khoaPhong);
    paramIndex += 1;
  }

  if (filters.search) {
    clauses.push(`LOWER(nv."HoVaTen") LIKE LOWER($${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex += 1;
  }

  const query = `
    SELECT nv."MaNhanVien", nv."MaDonVi"
    FROM "NhanVien" nv
    WHERE ${clauses.join(' AND ')}
  `;

  const rows = await db.query<PractitionerRow>(query, params);
  const filteredRows = rows.filter((row) => !excludedSet.has(row.MaNhanVien));

  return {
    practitioners: filteredRows,
    errors,
    normalizedSelection,
  };
}

function buildSummaryMessage(created: number, skipped: number, failed: number): string {
  const parts = [`Đã tạo ${created} bản ghi`, `bỏ qua ${skipped} bản ghi trùng`];
  if (failed > 0) {
    parts.push(`${failed} bản ghi lỗi`);
  }
  return parts.join(', ');
}

type InsertCandidate = PractitionerRow;

type InsertBulkParams = {
  candidates: InsertCandidate[];
  activity: ActivityRecord;
  userId: string;
  startDate: Date | null;
  endDate: Date | null;
  organizer: string | null;
};

type InsertBulkResult = {
  inserted: Array<{ MaGhiNhan: string; MaNhanVien: string }>;
  conflicts: string[];
};

async function insertBulkSubmissions(params: InsertBulkParams): Promise<InsertBulkResult> {
  const { candidates, activity, userId, startDate, endDate, organizer } = params;

  if (!candidates.length) {
    return { inserted: [], conflicts: [] };
  }

  const conversionRateRaw = activity.TyLeQuyDoi ?? 0;
  const conversionRate =
    typeof conversionRateRaw === 'number'
      ? conversionRateRaw
      : Number(conversionRateRaw || 0);

  const initialStatus = activity.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet';

  const columns = [
    'MaNhanVien',
    'MaDanhMuc',
    'TenHoatDong',
    'NguoiNhap',
    'TrangThaiDuyet',
    'DonViToChuc',
    'NgayBatDau',
    'NgayKetThuc',
    'SoTiet',
    'SoGioTinChiQuyDoi',
    'HinhThucCapNhatKienThucYKhoa',
    'FileMinhChungUrl',
    'BangChungSoGiayChungNhan',
  ];

  const values: unknown[] = [];
  const rowsSql = candidates
    .map((candidate, index) => {
      const offset = index * columns.length;
      values.push(
        candidate.MaNhanVien,
        activity.MaDanhMuc,
        activity.TenDanhMuc,
        userId,
        initialStatus,
        organizer,
        startDate,
        endDate,
        null,
        conversionRate,
        activity.LoaiHoatDong ?? null,
        null,
        null,
      );
      return `(${columns.map((_, colIndex) => `$${offset + colIndex + 1}`).join(', ')})`;
    })
    .join(', ');

  const insertSql = `
    INSERT INTO "GhiNhanHoatDong" (${columns.map((column) => `"${column}"`).join(', ')})
    VALUES ${rowsSql}
    ON CONFLICT ("MaNhanVien", "MaDanhMuc") WHERE "MaDanhMuc" IS NOT NULL
    DO NOTHING
    RETURNING "MaGhiNhan", "MaNhanVien"
  `;

  const inserted = await db.query<{ MaGhiNhan: string; MaNhanVien: string }>(insertSql, values);
  const insertedSet = new Set(inserted.map((row) => row.MaNhanVien));
  const conflicts = candidates
    .map((candidate) => candidate.MaNhanVien)
    .filter((id: string) => !insertedSet.has(id));

  return { inserted, conflicts };
}
