/**
 * API Route: Download Excel Import Template
 * GET /api/import/template
 * Role: DonVi only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ExcelProcessor } from '@/lib/import/excel-processor';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role - only DonVi can download template
    if (session.user.role !== 'DonVi') {
      return NextResponse.json(
        { success: false, error: 'Chỉ quản trị viên đơn vị mới có quyền tải mẫu nhập liệu' },
        { status: 403 }
      );
    }

    // Generate template
    const processor = new ExcelProcessor();
    const buffer = await processor.generateTemplate();

    // Return file
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="CNKTYKLT_Import_Template.xlsx"',
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo file mẫu' },
      { status: 500 }
    );
  }
}
