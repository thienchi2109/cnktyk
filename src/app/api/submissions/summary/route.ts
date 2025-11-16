/**
 * Activity Submission Summary API
 * Returns summary statistics for a practitioner's submissions (counts by status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { nhanVienRepo } from '@/lib/db/repositories';

interface SubmissionsSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

// GET /api/submissions/summary?practitionerId={id}
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const practitionerId = searchParams.get('practitionerId');

    if (!practitionerId) {
      return NextResponse.json(
        { error: 'practitionerId parameter is required' },
        { status: 400 }
      );
    }

    // Apply Role-Based Access Control (RBAC)
    if (user.role === 'DonVi') {
      // Unit admins can only query practitioners from their own unit
      const practitioner = await nhanVienRepo.findById(practitionerId);

      if (!practitioner) {
        return NextResponse.json(
          { error: 'Practitioner not found' },
          { status: 404 }
        );
      }

      if (practitioner.MaDonVi !== user.unitId) {
        return NextResponse.json(
          { error: 'Cannot access submissions from other units' },
          { status: 403 }
        );
      }
    } else if (user.role === 'NguoiHanhNghe') {
      // Practitioners can only query their own submissions
      const { db: dbClient } = await import('@/lib/db/client');
      const link = await dbClient.queryOne<{ MaNhanVien: string }>(
        'SELECT "MaNhanVien" FROM "TaiKhoan" WHERE "MaTaiKhoan" = $1 AND "MaNhanVien" IS NOT NULL LIMIT 1',
        [user.id]
      );

      const userPractitionerId = link?.MaNhanVien;

      if (!userPractitionerId || userPractitionerId !== practitionerId) {
        return NextResponse.json(
          { error: 'Cannot access other practitioners\' submissions' },
          { status: 403 }
        );
      }
    } else if (user.role !== 'SoYTe' && user.role !== 'Auditor') {
      // Only SoYTe, DonVi, NguoiHanhNghe, and Auditor roles can access this endpoint
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Query database to get counts grouped by status
    const summaryQuery = `
      SELECT
        "TrangThaiDuyet",
        COUNT(*)::int AS count
      FROM "GhiNhanHoatDong"
      WHERE "MaNhanVien" = $1
      GROUP BY "TrangThaiDuyet"
    `;

    const results = await db.query<{ TrangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi'; count: number }>(
      summaryQuery,
      [practitionerId]
    );

    // Build summary object
    const summary: SubmissionsSummary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };

    // Map database results to summary object
    for (const row of results) {
      summary.total += row.count;

      switch (row.TrangThaiDuyet) {
        case 'ChoDuyet':
          summary.pending = row.count;
          break;
        case 'DaDuyet':
          summary.approved = row.count;
          break;
        case 'TuChoi':
          summary.rejected = row.count;
          break;
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      practitionerId,
    });

  } catch (error) {
    console.error('Submissions summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
