import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { danhMucHoatDongRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';
import { CreateDanhMucHoatDongSchema, UpdateDanhMucHoatDongSchema } from '@/lib/db/schemas';
import { z } from 'zod';

// GET /api/activities - List activity catalog with scope filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const querySchema = z.object({
      scope: z.enum(['all', 'global', 'unit']).default('all'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(25),
      search: z.string().optional(),
      type: z.enum(['all', 'KhoaHoc', 'HoiThao', 'NghienCuu', 'BaoCao']).optional(),
      status: z.enum(['all', 'active', 'pending', 'expired']).optional(),
    });

    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { scope, page, limit, search, type, status } = parsed.data;

    const normalizedSearch = search?.trim();
    const searchFilter = normalizedSearch ? normalizedSearch : undefined;
    const typeFilter = type && type !== 'all' ? type : undefined;
    const statusFilter = status && status !== 'all' ? status : undefined;

    const offset = (page - 1) * limit;

    // SoYTe can see all activities, DonVi only their unit + global
    const isSoYTe = user.role === 'SoYTe';
    const isDonVi = user.role === 'DonVi';

    const shouldIncludeGlobal = scope === 'all' || scope === 'global';
    const shouldIncludeUnit = scope === 'all' || scope === 'unit';

    let globalCollection: { items: any[]; total: number } = { items: [], total: 0 };
    let unitCollection: { items: any[]; total: number } = { items: [], total: 0 };

    if (shouldIncludeGlobal) {
      globalCollection = await danhMucHoatDongRepo.filterGlobalCatalog({
        search: searchFilter,
        type: typeFilter,
        status: statusFilter,
        limit,
        offset,
      });
    }

    if (shouldIncludeUnit) {
      if (isSoYTe) {
        unitCollection = await danhMucHoatDongRepo.filterUnitCatalog({
          includeAllUnits: true,
          search: searchFilter,
          type: typeFilter,
          status: statusFilter,
          limit,
          offset,
        });
      } else if (isDonVi) {
        if (!user.unitId) {
          return NextResponse.json({ error: 'User has no unit assigned' }, { status: 403 });
        }
        unitCollection = await danhMucHoatDongRepo.filterUnitCatalog({
          unitId: user.unitId,
          search: searchFilter,
          type: typeFilter,
          status: statusFilter,
          limit,
          offset,
        });
      } else {
        unitCollection = { items: [], total: 0 };
      }
    }

    // Calculate permissions based on role
    const permissions = {
      canCreateGlobal: isSoYTe,
      canCreateUnit: user.role === 'DonVi' || isSoYTe,
      canEditGlobal: isSoYTe,
      canEditUnit: user.role === 'DonVi' || isSoYTe,
      canAdoptToGlobal: isSoYTe,
      canRestoreSoftDeleted: isSoYTe || user.role === 'DonVi',
    };

    return NextResponse.json({
      global: globalCollection.items,
      unit: unitCollection.items,
      permissions,
      pagination: {
        page,
        limit,
        totalGlobal: globalCollection.total,
        totalUnit: unitCollection.total,
        totalPages: {
          global: shouldIncludeGlobal ? Math.ceil((globalCollection.total || 0) / limit) : 0,
          unit: shouldIncludeUnit ? Math.ceil((unitCollection.total || 0) / limit) : 0,
        },
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

// POST /api/activities - Create new activity (SoYTe and DonVi)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both SoYTe and DonVi can create activities
    if (user.role !== 'SoYTe' && user.role !== 'DonVi') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = CreateDanhMucHoatDongSchema.parse(body);

    // Determine scope based on user role
    let unitId: string | null = null;
    let scope: 'global' | 'unit' = 'global';

    if (user.role === 'DonVi') {
      // DonVi can only create unit activities - auto-inject their unitId
      if (!user.unitId) {
        return NextResponse.json({ error: 'User has no unit assigned' }, { status: 403 });
      }
      unitId = user.unitId;
      scope = 'unit';
      
      // Security: Ignore any MaDonVi from client input for DonVi users
      delete (body as any).MaDonVi;
    } else if (user.role === 'SoYTe') {
      // SoYTe can create global (MaDonVi = null) or unit-specific activities
      // If MaDonVi is provided in body, use it; otherwise create global
      unitId = body.MaDonVi || null;
      scope = unitId ? 'unit' : 'global';
    }

    // Create activity with ownership tracking
    const newActivity = await danhMucHoatDongRepo.createWithOwnership(
      validatedData,
      user.id,
      unitId
    );

    // Log catalog change
    await nhatKyHeThongRepo.logCatalogChange(
      user.id,
      'CREATE',
      newActivity.MaDanhMuc,
      {
        activityName: newActivity.TenDanhMuc,
        scope,
        unitId,
        actorRole: user.role,
      }
    );

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