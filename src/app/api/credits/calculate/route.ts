/**
 * API Route: /api/credits/calculate
 * Calculate credits for an activity based on catalog and hours
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { calculateCredits, validateCategoryLimit, getCurrentCycle } from '@/lib/db/credit-engine';
import { z } from 'zod';

const CalculateCreditsSchema = z.object({
  activityCatalogId: z.string().uuid().nullable(),
  hours: z.number().min(0).nullable(),
  practitionerId: z.string().uuid(),
  activityType: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = CalculateCreditsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Dữ liệu không hợp lệ',
            details: validation.error.issues
          } 
        },
        { status: 400 }
      );
    }

    const { activityCatalogId, hours, practitionerId, activityType } = validation.data;

    // Calculate credits
    const credits = await calculateCredits(activityCatalogId, hours);

    // Get current cycle for validation
    const cycle = await getCurrentCycle(practitionerId);
    
    // Validate category limits if activity type is provided
    let limitValidation = { valid: true };
    if (cycle && activityType && credits > 0) {
      limitValidation = await validateCategoryLimit(
        practitionerId,
        activityType,
        credits,
        cycle.NgayBatDau,
        cycle.NgayKetThuc
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        credits,
        limitValidation
      }
    });
  } catch (error) {
    console.error('Error calculating credits:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi tính toán tín chỉ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
