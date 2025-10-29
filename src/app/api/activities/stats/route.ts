import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo } from '@/lib/db/repositories';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unitId = user.role === 'DonVi' ? user.unitId : undefined;
    const stats = await ghiNhanHoatDongRepo.getActivityStats(unitId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Activity stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}