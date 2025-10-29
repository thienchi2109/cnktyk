/**
 * API Route: /api/credits/rules/[id]
 * Manage individual credit rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { UpdateQuyTacTinChiSchema, type QuyTacTinChi } from '@/lib/db/schemas';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/credits/rules/[id]
 * Get a specific credit rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      );
    }

    const { id: ruleId } = await params;

    const result = await db.query<QuyTacTinChi>(
      `SELECT * FROM "QuyTacTinChi" WHERE "MaQuyTac" = $1`,
      [ruleId]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy quy tắc tín chỉ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Error fetching credit rule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi lấy thông tin quy tắc tín chỉ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/credits/rules/[id]
 * Update a credit rule (SoYTe only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      );
    }

    // Only SoYTe can update credit rules
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Chỉ Sở Y Tế mới có quyền cập nhật quy tắc tín chỉ' } },
        { status: 403 }
      );
    }

    const { id: ruleId } = await params;
    const body = await request.json();
    const validation = UpdateQuyTacTinChiSchema.safeParse(body);

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
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.TenQuyTac !== undefined) {
      updates.push(`"TenQuyTac" = $${paramIndex++}`);
      values.push(data.TenQuyTac);
    }
    if (data.TongTinChiYeuCau !== undefined) {
      updates.push(`"TongTinChiYeuCau" = $${paramIndex++}`);
      values.push(data.TongTinChiYeuCau);
    }
    if (data.ThoiHanNam !== undefined) {
      updates.push(`"ThoiHanNam" = $${paramIndex++}`);
      values.push(data.ThoiHanNam);
    }
    if (data.TranTheoLoai !== undefined) {
      updates.push(`"TranTheoLoai" = $${paramIndex++}`);
      values.push(data.TranTheoLoai ? JSON.stringify(data.TranTheoLoai) : null);
    }
    if (data.HieuLucTu !== undefined) {
      updates.push(`"HieuLucTu" = $${paramIndex++}`);
      values.push(data.HieuLucTu);
    }
    if (data.HieuLucDen !== undefined) {
      updates.push(`"HieuLucDen" = $${paramIndex++}`);
      values.push(data.HieuLucDen);
    }
    if (data.TrangThai !== undefined) {
      updates.push(`"TrangThai" = $${paramIndex++}`);
      values.push(data.TrangThai);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_UPDATES', message: 'Không có thông tin cần cập nhật' } },
        { status: 400 }
      );
    }

    values.push(ruleId);

    const result = await db.query<QuyTacTinChi>(
      `UPDATE "QuyTacTinChi" 
       SET ${updates.join(', ')}
       WHERE "MaQuyTac" = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy quy tắc tín chỉ' } },
        { status: 404 }
      );
    }

    // Log audit trail
    await db.query(
      `INSERT INTO "NhatKyHeThong" (
        "MaNhatKy", "MaTaiKhoan", "HanhDong", "Bang", "KhoaChinh", "NoiDung"
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        session.user.id,
        'UPDATE',
        'QuyTacTinChi',
        ruleId,
        JSON.stringify({ updates: data, result: result[0] })
      ]
    );

    return NextResponse.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Error updating credit rule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi cập nhật quy tắc tín chỉ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credits/rules/[id]
 * Deactivate a credit rule (SoYTe only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      );
    }

    // Only SoYTe can delete credit rules
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Chỉ Sở Y Tế mới có quyền xóa quy tắc tín chỉ' } },
        { status: 403 }
      );
    }

    const { id: ruleId } = await params;

    // Soft delete by setting TrangThai to false
    const result = await db.query<QuyTacTinChi>(
      `UPDATE "QuyTacTinChi" 
       SET "TrangThai" = false
       WHERE "MaQuyTac" = $1
       RETURNING *`,
      [ruleId]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy quy tắc tín chỉ' } },
        { status: 404 }
      );
    }

    // Log audit trail
    await db.query(
      `INSERT INTO "NhatKyHeThong" (
        "MaNhatKy", "MaTaiKhoan", "HanhDong", "Bang", "KhoaChinh", "NoiDung"
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        session.user.id,
        'DELETE',
        'QuyTacTinChi',
        ruleId,
        JSON.stringify({ deactivated: true })
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Đã vô hiệu hóa quy tắc tín chỉ thành công'
    });
  } catch (error) {
    console.error('Error deleting credit rule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Lỗi khi xóa quy tắc tín chỉ',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
