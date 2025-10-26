import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { nhanVienRepo } from '@/lib/db/repositories';
import { z } from 'zod';
import { assertRateLimit } from '@/lib/api/rate-limit';

const ResolveSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(200).default(50).optional(),
  search: z.string().optional(),
  trangThai: z.string().default('DangLamViec').optional(),
  chucDanh: z.string().optional(),
  tags: z.array(z.string()).optional(), // reserved for future use
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DonVi and SoYTe only (DonVi restricted to own unit)
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { page = 1, limit = 50, search, trangThai = 'DangLamViec', chucDanh } = ResolveSchema.parse(body);

    // Rate limit: resolve ≤ 10 req/min per user
    const rl = assertRateLimit(`resolve:${user.id}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too Many Requests', retryAfter: rl.retryAfter }, { status: 429 });
    }

    const unitScope = user.role === 'DonVi' ? user.unitId : (body.unitId as string | undefined);

    const result = await nhanVienRepo.findPaginated({
      page,
      limit,
      unitId: unitScope,
      search,
      status: trangThai,
      chucDanh,
      orderBy: 'HoVaTen',
      orderDirection: 'ASC',
    });

    // Return only IDs for selection plus counts for UX
    const ids = result.data.map((n) => n.MaNhanVien);

    return NextResponse.json({
      ids,
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Cohort resolve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}