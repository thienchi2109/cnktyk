/**
 * Audit Statistics API
 * GET /api/audit/statistics - Get system-wide audit statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { AuditLogRepository } from '@/lib/audit/repository';
import { z } from 'zod';

const QuerySchema = z.object({
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

    // Only SoYTe role can view system statistics
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only Department of Health can view system statistics' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validatedParams = QuerySchema.parse(queryParams);

    // Get system statistics
    const statistics = await AuditLogRepository.getSystemStatistics(
      validatedParams.startDate,
      validatedParams.endDate
    );

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit statistics' },
      { status: 500 }
    );
  }
}
