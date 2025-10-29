import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { z } from 'zod';
import { assertRateLimit } from '@/lib/api/rate-limit';

const PreviewSchema = z.object({
  filters: z
    .object({
      search: z.string().optional(),
      trangThai: z.enum(['DangLamViec', 'DaNghi', 'TamHoan', 'all']).optional(),
      chucDanh: z.string().optional(),
      unitId: z.string().uuid().optional(),
    })
    .optional(),
  selection: z.object({
    mode: z.enum(['all', 'manual']),
    selectedIds: z.array(z.string().uuid()).default([]),
    excludedIds: z.array(z.string().uuid()).default([]),
    totalFiltered: z.number().int().nonnegative().default(0),
  }),
  activity: z.object({
    TenHoatDong: z.string().min(1),
    MaDanhMuc: z.string().uuid().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = PreviewSchema.parse(body);

    // Rate limit: preview ≤ 5 req/min per user
    const rl = assertRateLimit(`preview:${user.id}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too Many Requests', retryAfter: rl.retryAfter }, { status: 429 });
    }

    // Determine effective unit scope
    const unitScope = user.role === 'DonVi' ? user.unitId : parsed.filters?.unitId;

    // Build candidate IDs
    let candidateIds: string[] = [];

    if (parsed.selection.mode === 'manual') {
      candidateIds = parsed.selection.selectedIds;
    } else {
      // mode === 'all' => resolve all filtered IDs within scope
      const params: any[] = [];
      let sql = `SELECT "MaNhanVien" FROM "NhanVien" WHERE 1=1`;

      if (unitScope) {
        sql += ` AND "MaDonVi" = $${params.length + 1}`;
        params.push(unitScope);
      }
      const trangThai = parsed.filters?.trangThai;
      if (trangThai && trangThai !== 'all') {
        sql += ` AND "TrangThaiLamViec" = $${params.length + 1}`;
        params.push(trangThai);
      }
      const chucDanh = parsed.filters?.chucDanh;
      if (chucDanh) {
        sql += ` AND "ChucDanh" = $${params.length + 1}`;
        params.push(chucDanh);
      }
      const search = parsed.filters?.search;
      if (search) {
        sql += ` AND LOWER("HoVaTen") LIKE LOWER($${params.length + 1})`;
        params.push(`%${search}%`);
      }

      const rows = await db.query<{ MaNhanVien: string }>(sql, params);
      const allIds = rows.map((r) => r.MaNhanVien);
      const excluded = new Set(parsed.selection.excludedIds);
      candidateIds = allIds.filter((id) => !excluded.has(id));
    }

    // De-duplicate candidateIds
    candidateIds = Array.from(new Set(candidateIds));

    // Enforce unit scope for DonVi
    if (user.role === 'DonVi') {
      if (candidateIds.length) {
        const rows = await db.query<{ MaNhanVien: string }>(
          `SELECT "MaNhanVien" FROM "NhanVien" WHERE "MaNhanVien" = ANY($1::uuid[]) AND "MaDonVi" = $2`,
          [candidateIds, user.unitId]
        );
        const allowed = new Set(rows.map((r) => r.MaNhanVien));
        candidateIds = candidateIds.filter((id) => allowed.has(id));
      }
    }

    // Compute duplicates based on same TenHoatDong for those practitioners
    let duplicateIds: string[] = [];
    if (candidateIds.length) {
      const rows = await db.query<{ MaNhanVien: string }>(
        `SELECT DISTINCT "MaNhanVien" FROM "GhiNhanHoatDong" WHERE "MaNhanVien" = ANY($1::uuid[]) AND "TenHoatDong" = $2`,
        [candidateIds, parsed.activity.TenHoatDong]
      );
      duplicateIds = rows.map((r) => r.MaNhanVien);
    }

    const duplicateSet = new Set(duplicateIds);
    const duplicateCount = duplicateSet.size;
    const totalCandidates = candidateIds.length;
    const createCount = Math.max(0, totalCandidates - duplicateCount);
    const skipCount = duplicateCount;

    const sampleIds = candidateIds.slice(0, 10);

    return NextResponse.json({
      createCount,
      skipCount,
      duplicateCount,
      totalCandidates,
      sampleIds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Cohort preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
