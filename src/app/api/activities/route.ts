import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { danhMucHoatDongRepo } from '@/lib/db/repositories';
import { CreateDanhMucHoatDongSchema, UpdateDanhMucHoatDongSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/activities - List activity catalog with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let activities;
    
    if (type) {
      activities = await danhMucHoatDongRepo.findByType(type);
    } else if (activeOnly) {
      activities = await danhMucHoatDongRepo.findActive();
    } else {
      activities = await danhMucHoatDongRepo.findAll();
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = activities.slice(startIndex, endIndex);

    return NextResponse.json({
      activities: paginatedActivities,
      pagination: {
        page,
        limit,
        total: activities.length,
        totalPages: Math.ceil(activities.length / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/activities - Create new activity (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SoYTe can create activities
    if (user.role !== 'SoYTe') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = CreateDanhMucHoatDongSchema.parse(body);

    // Create activity
    const newActivity = await danhMucHoatDongRepo.create(validatedData);

    return NextResponse.json(newActivity, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}