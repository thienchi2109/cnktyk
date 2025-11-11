/**
 * Bulk Delete Activity Submissions API Route
 * Handles deletion of multiple submissions in a single operation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo, nhanVienRepo } from '@/lib/db/repositories';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
});

// DELETE /api/submissions/bulk-delete - Delete multiple submissions
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only DonVi and SoYTe can bulk delete
    if (!['DonVi', 'SoYTe'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids } = bulkDeleteSchema.parse(body);

    const deletedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    // Process each submission
    for (const id of ids) {
      try {
        const submission = await ghiNhanHoatDongRepo.findById(id);

        if (!submission) {
          skippedIds.push(id);
          errors.push({ id, error: 'Submission not found' });
          continue;
        }

        // Check if submission is pending
        if (submission.TrangThaiDuyet !== 'ChoDuyet') {
          skippedIds.push(id);
          errors.push({ id, error: 'Cannot delete processed submission' });
          continue;
        }

        // Check permissions
        const practitioner = await nhanVienRepo.findById(submission.MaNhanVien);
        if (!practitioner) {
          skippedIds.push(id);
          errors.push({ id, error: 'Practitioner not found' });
          continue;
        }

        // DonVi can only delete from their unit
        if (user.role === 'DonVi') {
          if (practitioner.MaDonVi !== user.unitId) {
            skippedIds.push(id);
            errors.push({ id, error: 'Access denied - different unit' });
            continue;
          }
        }
        // SoYTe can delete any pending submission

        // Delete the submission
        await ghiNhanHoatDongRepo.delete(id);
        deletedIds.push(id);

      } catch (error) {
        console.error(`Error deleting submission ${id}:`, error);
        skippedIds.push(id);
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedIds.length,
      skipped: skippedIds.length,
      failed: errors.length,
      details: {
        deletedIds,
        skippedIds,
        errors,
      },
    });

  } catch (error) {
    console.error('Bulk delete error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
