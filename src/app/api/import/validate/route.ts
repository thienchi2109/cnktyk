/**
 * API Route: Validate Excel Import File
 * POST /api/import/validate
 * Role: DonVi only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ExcelProcessor, ValidationResult } from '@/lib/import/excel-processor';
import { ImportValidator } from '@/lib/import/validators';
import { db } from '@/lib/db/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role
    if (session.user.role !== 'DonVi') {
      return NextResponse.json(
        { success: false, error: 'Chỉ quản trị viên đơn vị mới có quyền nhập liệu' },
        { status: 403 }
      );
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy file' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File vượt quá kích thước cho phép (10MB)' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { success: false, error: 'File phải có định dạng .xlsx' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file
    const processor = new ExcelProcessor();
    const parsedData = await processor.parseFile(buffer);

    // Validate practitioners
    const validator = new ImportValidator();
    const practitionerErrors = validator.validatePractitioners(parsedData.practitioners);

    // Get existing CCHNs from database to check for duplicates
    const existingCCHNs = new Set<string>();
    if (parsedData.practitioners.length > 0) {
      const cchnList = parsedData.practitioners.map(p => p.soCCHN).filter(Boolean);
      if (cchnList.length > 0) {
        const result = await db.query<{ SoCCHN: string }>(
          `SELECT "SoCCHN" FROM "NhanVien" WHERE "SoCCHN" = ANY($1)`,
          [cchnList]
        );
        result.forEach(row => existingCCHNs.add(row.SoCCHN));
      }
    }

    // Check for CCHN duplicates with database
    parsedData.practitioners.forEach(p => {
      if (p.soCCHN && existingCCHNs.has(p.soCCHN)) {
        practitionerErrors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'G',
          field: 'Số CCHN',
          message: `Số CCHN "${p.soCCHN}" đã tồn tại trong hệ thống (sẽ được cập nhật)`,
          severity: 'warning'
        });
      }
    });

    // Build valid CCHNs set (from file + database)
    const validCCHNs = new Set<string>();
    parsedData.practitioners.forEach(p => {
      if (p.soCCHN) validCCHNs.add(p.soCCHN);
    });
    existingCCHNs.forEach(cchn => validCCHNs.add(cchn));

    // Validate activities
    const activityErrors = validator.validateActivities(parsedData.activities, validCCHNs);

    // Combine all errors
    const allErrors = [...practitionerErrors, ...activityErrors];
    const errors = allErrors.filter(e => e.severity === 'error');
    const warnings = allErrors.filter(e => e.severity === 'warning');

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      practitionersCount: parsedData.practitioners.length,
      activitiesCount: parsedData.activities.length
    };

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error validating import file:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Lỗi khi xác thực file' 
      },
      { status: 500 }
    );
  }
}
