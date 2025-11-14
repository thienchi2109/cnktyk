import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getDohUnitComparisonSummary } from '@/lib/db/repositories';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SoYTe access required' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const summary = await getDohUnitComparisonSummary(id);

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Đơn vị không tồn tại hoặc không hoạt động.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching unit summary:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
