/**
 * Record History API
 * GET /api/audit/record-history - Get audit history for a specific record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { AuditLogRepository } from '@/lib/audit/repository';
import { z } from 'zod';

const QuerySchema = z.object({
  tableName: z.string().min(1, 'Table name is required'),
  recordId: z.string().uuid('Invalid record ID'),
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
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');

    const validatedParams = QuerySchema.parse({ tableName, recordId });

    // Get record history
    const history = await AuditLogRepository.getRecordHistory(
      validatedParams.tableName,
      validatedParams.recordId
    );

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching record history:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch record history' },
      { status: 500 }
    );
  }
}
