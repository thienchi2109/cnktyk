import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { nhanVienRepo } from '@/lib/db/repositories';

const QuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(5).max(50).default(20),
  unitId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);

    const searchParams = new URL(request.url).searchParams;
    const parsed = QuerySchema.parse({
      search: searchParams.get('search')?.trim() || undefined,
      limit: searchParams.get('limit') || undefined,
      unitId: searchParams.get('unitId') || undefined,
    });

    let unitScope: string | undefined;

    if (session.user.role === 'DonVi') {
      if (!session.user.unitId) {
        return NextResponse.json({ error: 'Tài khoản của bạn chưa được gán đơn vị.' }, { status: 400 });
      }
      unitScope = session.user.unitId;
    } else if (session.user.role === 'SoYTe') {
      unitScope = parsed.unitId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const departments = await nhanVienRepo.getDistinctDepartments({
      unitId: unitScope,
      search: parsed.search,
      limit: parsed.limit,
    });

    return NextResponse.json({ departments });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
