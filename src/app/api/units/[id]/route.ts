import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { donViRepo } from '@/lib/db/repositories';
import { UpdateDonViSchema, type UpdateDonVi } from '@/lib/db/schemas';
import {
  UnitValidationError,
  ensureNoCircularReference,
  ensureParentUnitActive,
  ensureUnitDeletable,
  getUnitDependencyCounts,
} from '@/lib/units/validation';
import { AuditLogger } from '@/lib/audit/logger';
import { getClientIP } from '@/lib/audit/utils';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// GET /api/units/[id] - Fetch unit details (SoYTe only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SoYTe') {
      return forbidden();
    }

    const { id } = await params;
    const unit = await donViRepo.findById(id);

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const includeDependencies =
      new URL(request.url).searchParams.get('withDependencies') === 'true';

    const payload: Record<string, unknown> = { unit };
    if (includeDependencies) {
      payload.dependents = await getUnitDependencyCounts(id);
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching unit detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/units/[id] - Update unit
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SoYTe') {
      return forbidden();
    }

    const { id } = await params;
    const existingUnit = await donViRepo.findById(id);

    if (!existingUnit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const payload = await request.json();
    const parsed = UpdateDonViSchema.parse(payload);
    const sanitizedEntries = Object.entries(parsed).filter(
      ([, value]) => value !== undefined,
    );

    if (sanitizedEntries.length === 0) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 },
      );
    }

    const updates = Object.fromEntries(sanitizedEntries) as UpdateDonVi;

    if ('MaDonViCha' in updates) {
      const nextParentId = updates.MaDonViCha ?? null;
      await ensureParentUnitActive(nextParentId);
      await ensureNoCircularReference(id, nextParentId);
    }

    const ipAddress = getClientIP(request);
    const updatedUnit = await donViRepo.update(id, updates);

    if (!updatedUnit) {
      return NextResponse.json(
        { error: 'Unable to update unit' },
        { status: 500 },
      );
    }

    await AuditLogger.logUpdate('DonVi', id, existingUnit, updatedUnit, session.user.id, ipAddress);

    return NextResponse.json({ unit: updatedUnit });
  } catch (error) {
    if (error instanceof UnitValidationError) {
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Error updating unit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/units/[id] - Soft delete unit
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SoYTe') {
      return forbidden();
    }

    const { id } = await params;
    const existingUnit = await donViRepo.findById(id);

    if (!existingUnit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    if (!existingUnit.TrangThai) {
      return NextResponse.json({ unit: existingUnit, message: 'Unit already inactive' });
    }

    await ensureUnitDeletable(id);

    const ipAddress = getClientIP(request);
    const updated = await donViRepo.update(id, { TrangThai: false } as UpdateDonVi);

    await AuditLogger.logDelete('DonVi', id, existingUnit, session.user.id, ipAddress);

    return NextResponse.json({
      unit: updated ?? { ...existingUnit, TrangThai: false },
      message: 'Đơn vị đã được vô hiệu hóa.',
    });
  } catch (error) {
    if (error instanceof UnitValidationError) {
      return NextResponse.json(
        { error: error.code, message: error.message, details: error.details },
        { status: error.status },
      );
    }

    console.error('Error deleting unit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
