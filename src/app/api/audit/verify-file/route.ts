/**
 * File Integrity Verification API
 * GET /api/audit/verify-file - Verify file integrity using checksums
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { AuditLogRepository } from '@/lib/audit/repository';
import { z } from 'zod';

const QuerySchema = z.object({
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
    const recordId = searchParams.get('recordId');

    const validatedParams = QuerySchema.parse({ recordId });

    // Verify file integrity
    const verification = await AuditLogRepository.verifyFileIntegrity(
      validatedParams.recordId
    );

    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    console.error('Error verifying file integrity:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to verify file integrity' },
      { status: 500 }
    );
  }
}
