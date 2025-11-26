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

    // Only unit admins and DoH admins can bulk approve/revoke
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      action: z.enum(['approve', 'revoke']),
      ids: z.array(z.string().uuid()).min(1),
      comments: z.string().optional(),
      reason: z.string().optional(),
    });

    const { action, ids, comments, reason } = schema.parse(body);

    const unitId = user.role === 'DonVi' ? user.unitId : undefined;

    if (action === 'approve') {
      const { updatedIds } = await ghiNhanHoatDongRepo.approveActivities(ids, comments ?? null, unitId);
      const updatedSet = new Set(updatedIds);
      const skippedIds = ids.filter((id: string) => !updatedSet.has(id));

      return NextResponse.json({
        processedCount: updatedIds.length,
        updatedIds,
        skippedIds,
        message: `Approved ${updatedIds.length} activities`,
      });
    }

    if (action === 'revoke') {
      if (!reason || reason.trim() === '') {
        return NextResponse.json({ error: 'Revocation reason is required' }, { status: 400 });
      }

      const { updatedIds } = await ghiNhanHoatDongRepo.revokeActivities(ids, reason, unitId);
      const updatedSet = new Set(updatedIds);
      const skippedIds = ids.filter((id: string) => !updatedSet.has(id));

      return NextResponse.json({
        processedCount: updatedIds.length,
        updatedIds,
        skippedIds,
        message: `Revoked ${updatedIds.length} approvals`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Bulk operation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
