import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { donViRepo } from '@/lib/db/repositories';

// GET /api/units - List units
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Get units based on user role
    let units;
    
    if (session.quyenHan === 'SoYTe') {
      // SoYTe can see all units
      units = await donViRepo.findAll();
    } else if (session.quyenHan === 'DonVi' && session.maDonVi) {
      // DonVi can only see their own unit
      const unit = await donViRepo.findById(session.maDonVi);
      units = unit ? [unit] : [];
    } else {
      // Other roles get limited access
      units = [];
    }

    // Apply search filter if provided
    if (search && units) {
      units = units.filter(unit => 
        unit.TenDonVi.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter only active units
    const activeUnits = units?.filter(unit => unit.TrangThai) || [];

    return NextResponse.json({
      units: activeUnits,
      total: activeUnits.length,
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}