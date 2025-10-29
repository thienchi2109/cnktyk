/**
 * Audit Log Export API
 * GET /api/audit/export - Export audit logs to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { AuditLogRepository, type AuditLogFilters } from '@/lib/audit/repository';
import { AuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 'EXPORT', 'IMPORT']).optional(),
  tableName: z.string().optional(),
  recordId: z.string().uuid().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  ipAddress: z.string().optional(),
  searchTerm: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only SoYTe and Auditor roles can export audit logs
    if (session.user.role !== 'SoYTe' && session.user.role !== 'Auditor') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validatedParams = QuerySchema.parse(queryParams);

    // Build filters
    const filters: AuditLogFilters = {
      userId: validatedParams.userId,
      action: validatedParams.action,
      tableName: validatedParams.tableName,
      recordId: validatedParams.recordId,
      startDate: validatedParams.startDate,
      endDate: validatedParams.endDate,
      ipAddress: validatedParams.ipAddress,
      searchTerm: validatedParams.searchTerm,
    };

    // Get all audit logs (no pagination for export)
    const result = await AuditLogRepository.getAuditLogs(
      filters,
      1,
      10000 // Max 10k records per export
    );

    // Log the export action
    await AuditLogger.logExport(
      'audit_logs',
      filters,
      result.logs.length,
      session.user.id,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    // Generate CSV
    const csvHeaders = [
      'Thời gian',
      'Người dùng',
      'Quyền hạn',
      'Hành động',
      'Bảng',
      'Khóa chính',
      'Địa chỉ IP',
      'Nội dung',
    ];

    const csvRows = result.logs.map((log: any) => [
      log.ThoiGian ? new Date(log.ThoiGian).toLocaleString('vi-VN') : '',
      log.TenDangNhap || 'N/A',
      log.QuyenHan || 'N/A',
      log.HanhDong || '',
      log.Bang || 'N/A',
      log.KhoaChinh || 'N/A',
      log.DiaChiIP || 'N/A',
      log.NoiDung ? JSON.stringify(log.NoiDung) : '',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // Return CSV file
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
