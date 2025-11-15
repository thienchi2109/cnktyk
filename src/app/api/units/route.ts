import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { donViRepo } from '@/lib/db/repositories';
import { CreateDonViSchema } from '@/lib/db/schemas';
import { AuditLogger } from '@/lib/audit/logger';
import { getClientIP } from '@/lib/audit/utils';
import { UnitValidationError, ensureParentUnitActive } from '@/lib/units/validation';
import { ZodError } from 'zod';

// GET /api/units - List units
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get units based on user role
    let units: any[] = [];
    
    if (session.user.role === 'SoYTe') {
      // SoYTe can see all units
      units = await donViRepo.findAll();
    } else if (session.user.role === 'DonVi' && session.user.unitId) {
      // DonVi can only see their own unit
      const unit = await donViRepo.findById(session.user.unitId);
      units = unit ? [unit] : [];
    } else {
      // Other roles get limited access
      units = [];
    }

    // Apply search filter if provided
    if (search && units) {
      units = units.filter((unit) =>
        unit.TenDonVi.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const visibleUnits = includeInactive ? units : units?.filter((unit) => unit.TrangThai) || [];

    return NextResponse.json({
      units: visibleUnits,
      total: visibleUnits.length,
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/units - Create new unit (SoYTe only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (session.user.role !== 'SoYTe') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ipAddress = getClientIP(request);
    const payload = await request.json();
    const data = CreateDonViSchema.parse(payload);

    await ensureParentUnitActive(data.MaDonViCha ?? null);

    const created = await donViRepo.create({
      ...data,
      TrangThai: data.TrangThai ?? true,
    });

    await AuditLogger.logCreate('DonVi', created.MaDonVi, created, session.user.id, ipAddress);

    return NextResponse.json({ unit: created }, { status: 201 });
  } catch (error) {
    if (error instanceof UnitValidationError) {
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
