import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;

    // Only allow DonVi/SoYTe/Auditor to fetch presets; DonVi restricted to own unit
    if (!['DonVi', 'SoYTe', 'Auditor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const row = await db.queryOne<{ MaPreset: string; TenPreset: string; BoLoc: any; MaDonVi: string }>(
      `SELECT "MaPreset", "TenPreset", "BoLoc", "MaDonVi" FROM "CohortPreset" WHERE "MaPreset" = $1`,
      [id]
    );

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role === 'DonVi' && row.MaDonVi !== user.unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ preset: row });
  } catch (error) {
    console.error('Preset get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
