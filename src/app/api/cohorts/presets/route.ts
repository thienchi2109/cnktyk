import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { nhatKyHeThongRepo } from '@/lib/db/repositories';
import { z } from 'zod';
import { assertRateLimit } from '@/lib/api/rate-limit';

const PresetCreateUpdateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  filters: z.object({
    search: z.string().optional(),
    trangThai: z.enum(['DangLamViec', 'DaNghi', 'TamHoan', 'all']).optional(),
    chucDanh: z.string().optional(),
  }),
  unitId: z.string().uuid().optional(), // SoYTe only
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['DonVi', 'SoYTe', 'Auditor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const unitParam = searchParams.get('unitId') || undefined;
    const unitScope = user.role === 'DonVi' ? user.unitId : unitParam;

    // DonVi must not override unitId
    if (user.role === 'DonVi' && unitParam && unitParam !== user.unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db.query<{ MaPreset: string; TenPreset: string; BoLoc: any }>(
      `SELECT "MaPreset", "TenPreset", "BoLoc" FROM "CohortPreset" WHERE "MaDonVi" = $1 ORDER BY "TenPreset" ASC`,
      [unitScope]
    );

    return NextResponse.json({ presets: rows });
  } catch (error) {
    console.error('Presets list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = PresetCreateUpdateSchema.parse(body);

    const rl = assertRateLimit(`presets:${user.id}`, 10, 60_000);
    if (!rl.ok) return NextResponse.json({ error: 'Too Many Requests', retryAfter: rl.retryAfter }, { status: 429 });

    const unitScope = user.role === 'DonVi' ? user.unitId : parsed.unitId;
    if (!unitScope) return NextResponse.json({ error: 'unitId required' }, { status: 400 });

    // Upsert by id if provided, else insert new
    if (parsed.id) {
      // Ensure preset belongs to unit
      const existing = await db.queryOne<{ MaPreset: string }>(
        `SELECT "MaPreset" FROM "CohortPreset" WHERE "MaPreset" = $1 AND "MaDonVi" = $2`,
        [parsed.id, unitScope]
      );
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const updated = await db.update(
        'CohortPreset',
        { TenPreset: parsed.name, BoLoc: parsed.filters, CapNhatLuc: new Date() },
        { MaPreset: parsed.id },
        '*'
      );

      await nhatKyHeThongRepo.logAction(user.id, 'preset.update', 'CohortPreset', parsed.id, { name: parsed.name, filters: parsed.filters, unitId: unitScope });
      return NextResponse.json({ preset: updated[0] });
    }

    const inserted = await db.insert(
      'CohortPreset',
      { MaDonVi: unitScope, TenPreset: parsed.name, BoLoc: parsed.filters, NguoiTao: user.id },
      '*'
    );

    await nhatKyHeThongRepo.logAction(user.id, 'preset.create', 'CohortPreset', (inserted as any).MaPreset, { name: parsed.name, filters: parsed.filters, unitId: unitScope });

    return NextResponse.json({ preset: inserted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Preset create/update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
