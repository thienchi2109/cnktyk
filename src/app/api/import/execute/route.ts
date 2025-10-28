/**
 * API Route: Execute Excel Import
 * POST /api/import/execute
 * Role: DonVi only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ExcelProcessor } from '@/lib/import/excel-processor';
import { ImportValidator } from '@/lib/import/validators';
import { ImportService } from '@/lib/import/import-service';
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

    // Check unit ID
    if (!session.user.unitId) {
      return NextResponse.json(
        { success: false, error: 'Không xác định được đơn vị của người dùng' },
        { status: 400 }
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

    // Re-validate before import
    const validator = new ImportValidator();
    const practitionerErrors = validator.validatePractitioners(parsedData.practitioners);

    // Get existing CCHNs (scoped to current unit only)
    const existingCCHNs = new Set<string>();
    const crossUnitCCHNs = new Set<string>();
    if (parsedData.practitioners.length > 0) {
      const cchnList = parsedData.practitioners.map(p => p.soCCHN).filter(Boolean);
      if (cchnList.length > 0) {
        // Check same-unit CCHNs
        const sameUnitResult = await db.query<{ SoCCHN: string }>(
          `SELECT "SoCCHN" FROM "NhanVien" WHERE "SoCCHN" = ANY($1) AND "MaDonVi" = $2`,
          [cchnList, session.user.unitId]
        );
        sameUnitResult.forEach(row => existingCCHNs.add(row.SoCCHN));

        // Check cross-unit conflicts
        const otherUnitResult = await db.query<{ SoCCHN: string }>(
          `SELECT "SoCCHN" FROM "NhanVien" WHERE "SoCCHN" = ANY($1) AND "MaDonVi" != $2`,
          [cchnList, session.user.unitId]
        );
        otherUnitResult.forEach(row => crossUnitCCHNs.add(row.SoCCHN));

        // Add cross-unit conflicts as blocking errors
        parsedData.practitioners.forEach(p => {
          if (p.soCCHN && crossUnitCCHNs.has(p.soCCHN)) {
            practitionerErrors.push({
              sheet: 'Nhân viên',
              row: p.rowNumber,
              column: 'G',
              field: 'Số CCHN',
              message: `Số CCHN đã thuộc đơn vị khác, không thể nhập`,
              severity: 'error'
            });
          }
        });
      }
    }

    // Build valid CCHNs set
    const validCCHNs = new Set<string>();
    parsedData.practitioners.forEach(p => {
      if (p.soCCHN) validCCHNs.add(p.soCCHN);
    });
    existingCCHNs.forEach(cchn => validCCHNs.add(cchn));

    // Validate activities
    const activityErrors = validator.validateActivities(parsedData.activities, validCCHNs);

    // Check for blocking errors
    const allErrors = [...practitionerErrors, ...activityErrors];
    const blockingErrors = allErrors.filter(e => e.severity === 'error');

    if (blockingErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'File có lỗi cần sửa trước khi nhập',
          validationErrors: blockingErrors
        },
        { status: 400 }
      );
    }

    // Execute import
    const importService = new ImportService();
    const result = await importService.executeImport(
      parsedData.practitioners,
      parsedData.activities,
      session.user.unitId,
      session.user.id
    );

    // Check if there were any errors during import
    if (result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Có lỗi xảy ra trong quá trình nhập',
          importErrors: result.errors,
          partialResult: result
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Nhập dữ liệu thành công',
        practitionersCreated: result.practitionersCreated,
        practitionersUpdated: result.practitionersUpdated,
        activitiesCreated: result.activitiesCreated,
        cyclesCreated: result.cyclesCreated
      }
    });
  } catch (error) {
    console.error('Error executing import:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi khi nhập dữ liệu'
      },
      { status: 500 }
    );
  }
}
