import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { z } from 'zod';

const ApplySchema = z.object({
  selection: z.object({
    mode: z.enum(['all', 'manual']),
    selectedIds: z.array(z.string().uuid()).default([]),
    excludedIds: z.array(z.string().uuid()).default([]),
    totalFiltered: z.number().int().nonnegative().default(0),
    filters: z.object({
      search: z.string().optional(),
      trangThai: z.enum(['DangLamViec', 'DaNghi', 'TamHoan', 'all']).optional(),
      chucDanh: z.string().optional(),
      khoaPhong: z.string().optional(),
      unitId: z.string().uuid().optional(),
    }).optional(),
  }),
  activity: z.object({
    TenHoatDong: z.string().min(1),
    MaDanhMuc: z.string().uuid().optional(),
    LoaiHoatDong: z.string().optional(),
    YeuCauMinhChung: z.boolean().optional(),
    NgayBatDau: z.string().datetime().nullable().optional(),
    NgayKetThuc: z.string().datetime().nullable().optional(),
    SoGioTinChiQuyDoi: z.number().min(0).default(0),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ApplySchema.parse(body);

    // Resolve candidate practitioner IDs
    const unitScope = user.role === 'DonVi' ? user.unitId : parsed.selection.filters?.unitId;
    let candidateIds: string[] = [];

    if (parsed.selection.mode === 'manual') {
      candidateIds = parsed.selection.selectedIds;
    } else {
      const params: any[] = [];
      let sql = `SELECT "MaNhanVien" FROM "NhanVien" WHERE 1=1`;
      if (unitScope) { sql += ` AND "MaDonVi" = $${params.length + 1}`; params.push(unitScope); }
      const trangThai = parsed.selection.filters?.trangThai;
      if (trangThai && trangThai !== 'all') { sql += ` AND "TrangThaiLamViec" = $${params.length + 1}`; params.push(trangThai); }
      const chucDanh = parsed.selection.filters?.chucDanh;
      if (chucDanh) { sql += ` AND "ChucDanh" = $${params.length + 1}`; params.push(chucDanh); }
      const khoaPhong = parsed.selection.filters?.khoaPhong;
      if (khoaPhong) { sql += ` AND "KhoaPhong" = $${params.length + 1}`; params.push(khoaPhong); }
      const search = parsed.selection.filters?.search;
      if (search) { sql += ` AND LOWER("HoVaTen") LIKE LOWER($${params.length + 1})`; params.push(`%${search}%`); }
      const rows = await db.query<{ MaNhanVien: string }>(sql, params);
      const excluded = new Set(parsed.selection.excludedIds);
      candidateIds = rows.map(r => r.MaNhanVien).filter(id => !excluded.has(id));
    }

    // Enforce unit scope for DonVi
    if (user.role === 'DonVi' && candidateIds.length) {
      const rows = await db.query<{ MaNhanVien: string }>(
        `SELECT "MaNhanVien" FROM "NhanVien" WHERE "MaNhanVien" = ANY($1::uuid[]) AND "MaDonVi" = $2`,
        [candidateIds, user.unitId]
      );
      const allowed = new Set(rows.map(r => r.MaNhanVien));
      candidateIds = candidateIds.filter((id) => allowed.has(id));
    }

    candidateIds = Array.from(new Set(candidateIds));

    if (candidateIds.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, total: 0, insertedIds: [] });
    }

    const rows = await db.query<{ inserted: number }>(
      `WITH data AS (
         SELECT unnest($1::uuid[]) AS "MaNhanVien"
       ), filtered AS (
         SELECT d."MaNhanVien"
         FROM data d
         WHERE NOT EXISTS (
           SELECT 1
           FROM "GhiNhanHoatDong" g
           WHERE g."MaNhanVien" = d."MaNhanVien"
             AND (
               ($2::uuid IS NOT NULL AND g."MaDanhMuc" = $2::uuid)
               OR ($2::uuid IS NULL AND LOWER(g."TenHoatDong") = LOWER($3::text))
             )
         )
       ), ins AS (
         INSERT INTO "GhiNhanHoatDong" (
           "MaNhanVien", "MaDanhMuc", "TenHoatDong", "NgayBatDau", "NgayKetThuc", "SoGioTinChiQuyDoi", "NguoiNhap", "TrangThaiDuyet", "NgayGhiNhan"
         )
         SELECT 
           f."MaNhanVien",
           $2::uuid,
           $3::text,
           COALESCE($4::timestamptz, NULL),
           COALESCE($5::timestamptz, NULL),
           $6::numeric,
           $7::uuid,
           'ChoDuyet',
           NOW()
         FROM filtered f
         RETURNING 1
       )
       SELECT COUNT(*)::int AS inserted FROM ins`,
      [
        candidateIds,
        parsed.activity.MaDanhMuc ?? null,
        parsed.activity.TenHoatDong,
        parsed.activity.NgayBatDau ?? null,
        parsed.activity.NgayKetThuc ?? null,
        parsed.activity.SoGioTinChiQuyDoi,
        user.id,
      ]
    );

    const created = rows[0]?.inserted || 0;
    const skipped = candidateIds.length - created;

    return NextResponse.json({ created, skipped, total: candidateIds.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Cohort apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
