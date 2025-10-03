/**
 * User Activity API
 * GET /api/audit/user-activity - Get activity summary for a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { AuditLogRepository } from '@/lib/audit/repository';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const validatedParams = QuerySchema.parse({ userId, startDate, endDate });

    // Authorization: Users can only view their own activity unless they're SoYTe or Auditor
    if (
      session.user.id !== validatedParams.userId &&
      session.user.role !== 'SoYTe' &&
      session.user.role !== 'Auditor'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Cannot view other users activity' },
        { status: 403 }
      );
    }

    // Get user activity summary
    const summary = await AuditLogRepository.getUserActivitySummary(
      validatedParams.userId,
      validatedParams.startDate,
      validatedParams.endDate
    );

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}
