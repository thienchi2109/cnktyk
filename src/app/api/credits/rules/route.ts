/**
 * API Route: /api/credits/rules
 * Manage credit rules (QuyTacTinChi)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { CreateQuyTacTinChiSchema, UpdateQuyTacTinChiSchema, type QuyTacTinChi } from '@/lib/db/schemas';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/credits/rules
 * List all credit rules
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = `SELECT * FROM "QuyTacTinChi"`;
    const params: any[] = [];

    if (activeOnly) {
      query += ` WHERE "TrangThai" = true`;
    }

    query += ` ORDER BY "HieuLucTu" DESC NULLS LAST`;

    const result = await db.query<QuyTacTinChi>(query, params);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching credit rules:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi lấy danh sách quy tắc tín chỉ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credits/rules
 * Create a new credit rule (SoYTe only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      );
    }

    // Only SoYTe can create credit rules
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Chỉ Sở Y Tế mới có quyền tạo quy tắc tín chỉ' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = CreateQuyTacTinChiSchema.safeParse(body);

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

    const data = validation.data;
    const ruleId = uuidv4();

    const result = await db.query<QuyTacTinChi>(
      `INSERT INTO "QuyTacTinChi" (
        "MaQuyTac", "TenQuyTac", "TongTinChiYeuCau", "ThoiHanNam",
        "TranTheoLoai", "HieuLucTu", "HieuLucDen", "TrangThai"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        ruleId,
        data.TenQuyTac,
        data.TongTinChiYeuCau,
        data.ThoiHanNam,
        data.TranTheoLoai ? JSON.stringify(data.TranTheoLoai) : null,
        data.HieuLucTu,
        data.HieuLucDen,
        data.TrangThai
      ]
    );

    // Log audit trail
    await db.query(
      `INSERT INTO "NhatKyHeThong" (
        "MaNhatKy", "MaTaiKhoan", "HanhDong", "Bang", "KhoaChinh", "NoiDung"
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        session.user.id,
        'CREATE',
        'QuyTacTinChi',
        ruleId,
        JSON.stringify({ rule: result[0] })
      ]
    );

    return NextResponse.json({
      success: true,
      data: result[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating credit rule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi tạo quy tắc tín chỉ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
