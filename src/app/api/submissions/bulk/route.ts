import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo } from '@/lib/db/repositories';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only unit admins and DoH admins can bulk approve
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      action: z.literal('approve'),
      ids: z.array(z.string().uuid()).min(1),
      comments: z.string().optional(),
    });

    const { action, ids, comments } = schema.parse(body);

    if (action !== 'approve') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const unitId = user.role === 'DonVi' ? user.unitId : undefined;
    const { updatedIds } = await ghiNhanHoatDongRepo.approveActivities(ids, comments ?? null, unitId);

    const updatedSet = new Set(updatedIds);
    const skippedIds = ids.filter((id: string) => !updatedSet.has(id));

    return NextResponse.json({
      processedCount: updatedIds.length,
      updatedIds,
      skippedIds,
      message: `Approved ${updatedIds.length} activities`,
    });
  } catch (error) {
    console.error('Bulk approval error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
