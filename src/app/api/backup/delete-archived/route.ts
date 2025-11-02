/**
 * Delete Archived Evidence Files API Endpoint
 * POST /api/backup/delete-archived
 * 
 * Deletes evidence files from R2 storage after they have been backed up.
 * This is a destructive operation that frees storage space.
 * 
 * Access: SoYTe role only
 * Safety: Requires explicit confirmation token
 * Max Duration: 300 seconds (5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { r2Client } from '@/lib/storage/r2-client';
import { 
  xoaMinhChungRepo,
  nhatKyHeThongRepo,
  ghiNhanHoatDongRepo,
  saoLuuMinhChungRepo,
} from '@/lib/db/repositories';

// Configure route for long-running deletion operations
export const maxDuration = 300; // 5 minutes

interface DeleteRequestBody {
  startDate: string;
  endDate: string;
  confirmationToken: string;
}

interface FileToDelete {
  MaGhiNhan: string;
  FileMinhChungUrl: string;
  FileMinhChungSize: number | null;
}

/**
 * Extract R2 object key from full URL
 * Same logic as backup endpoint
 */
function extractR2Key(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1);
  } catch (error) {
    console.error(`Invalid URL format: ${url}`, error);
    const parts = url.split('/');
    if (parts.length >= 3) {
      return parts.slice(parts.length - 2).join('/');
    }
    return parts[parts.length - 1];
  }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validate date range constraints
 */
function validateDateRange(startDate: Date, endDate: Date): { valid: boolean; error?: string } {
  if (startDate >= endDate) {
    return { valid: false, error: 'Ngày bắt đầu phải sớm hơn ngày kết thúc.' };
  }

  const now = new Date();
  if (endDate > now) {
    return { valid: false, error: 'Ngày kết thúc không được vượt quá hôm nay.' };
  }

  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const rangeMs = endDate.getTime() - startDate.getTime();
  if (rangeMs > oneYearMs) {
    return { valid: false, error: 'Khoảng thời gian không được vượt quá 1 năm.' };
  }

  return { valid: true };
}

/**
 * POST /api/backup/delete-archived
 * Delete evidence files that have been backed up
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập.' },
        { status: 401 },
      );
    }

    if (user.role !== 'SoYTe') {
      return NextResponse.json(
        { error: 'Chỉ tài khoản Sở Y tế mới có quyền xóa minh chứng.' },
        { status: 403 },
      );
    }

    // 2. Parse and validate request body
    let body: DeleteRequestBody;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Dữ liệu gửi lên không hợp lệ. Vui lòng thử lại.' },
        { status: 400 },
      );
    }

    const { startDate, endDate, confirmationToken } = body;

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.' },
        { status: 400 },
      );
    }

    if (!confirmationToken) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mã xác nhận DELETE để tiếp tục.' },
        { status: 400 },
      );
    }

    // Validate confirmation token (must be exactly "DELETE")
    if (confirmationToken !== 'DELETE') {
      return NextResponse.json(
        { error: 'Mã xác nhận không hợp lệ. Hãy nhập chính xác "DELETE".' },
        { status: 400 },
      );
    }

    // Parse dates
    let startDateObj: Date;
    let endDateObj: Date;
    try {
      startDateObj = new Date(startDate);
      endDateObj = new Date(endDate);
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Định dạng ngày không hợp lệ. Sử dụng định dạng YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    // Validate date range constraints
    const validation = validateDateRange(startDateObj, endDateObj);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const now = new Date();

    // Safety check: require a recent backup in the last 24 hours that covers the range
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentBackups = await saoLuuMinhChungRepo.findByUserSince(
      user.id,
      twentyFourHoursAgo,
    );

    if (!recentBackups.length) {
      return NextResponse.json(
        {
          error:
            'Bạn cần tạo bản sao lưu trong 24 giờ gần nhất trước khi xóa minh chứng.',
        },
        { status: 400 },
      );
    }

    const hasCoveringBackup = recentBackups.some((backup) => {
      const backupStart = backup.NgayBatDau;
      const backupEnd = backup.NgayKetThuc;
      return (
        backupStart <= startDateObj &&
        backupEnd >= endDateObj
      );
    });

    if (!hasCoveringBackup) {
      return NextResponse.json(
        {
          error:
            'Khoảng thời gian xóa phải nằm trong một bản sao lưu đã tạo trong 24 giờ qua. Vui lòng tạo sao lưu mới bao phủ đầy đủ phạm vi này.',
        },
        { status: 400 },
      );
    }

    // Safety check: enforce cooldown between deletions
    const cooldownMinutes = 10;
    const [latestDeletion] = await xoaMinhChungRepo.findByUser(user.id, 1);
    if (latestDeletion?.NgayThucHien instanceof Date) {
      const cooldownMs = cooldownMinutes * 60 * 1000;
      const elapsedMs = now.getTime() - latestDeletion.NgayThucHien.getTime();
      if (elapsedMs < cooldownMs) {
        const remainingMs = cooldownMs - elapsedMs;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(remainingMs / 1000),
        );
        const remainingMinutes = Math.max(
          1,
          Math.ceil(remainingMs / 60000),
        );
        return NextResponse.json(
          {
            error: `Vui lòng chờ thêm ${remainingMinutes} phút trước khi thực hiện thao tác xóa tiếp theo.`,
            retryAfterSeconds,
          },
          {
            status: 429,
            headers: { 'Retry-After': retryAfterSeconds.toString() },
          },
        );
      }
    }

    // 3. Query database for files to delete
    // Only select files that have been backed up (via ChiTietSaoLuu)
    const query = `
      SELECT DISTINCT
        g."MaGhiNhan",
        g."FileMinhChungUrl",
        g."FileMinhChungSize"
      FROM "GhiNhanHoatDong" g
      INNER JOIN "ChiTietSaoLuu" c ON c."MaGhiNhan" = g."MaGhiNhan"
      WHERE g."FileMinhChungUrl" IS NOT NULL
        AND g."NgayGhiNhan" >= $1
        AND g."NgayGhiNhan" <= $2
        AND g."TrangThaiDuyet" = 'DaDuyet'
        AND c."TrangThai" = 'DaSaoLuu'
      ORDER BY g."NgayGhiNhan" DESC
    `;

    const files = await db.query<FileToDelete>(query, [startDateObj, endDateObj]);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy minh chứng đã sao lưu trong khoảng thời gian đã chọn.' },
        { status: 404 },
      );
    }

    // Check file count limit (max 5000)
    if (files.length > 5000) {
      return NextResponse.json(
        {
          error: `Không thể xóa hơn 5.000 minh chứng trong một lần. Đã tìm thấy ${files.length} tệp, vui lòng thu hẹp khoảng thời gian.`,
        },
        { status: 400 },
      );
    }

    console.log(`Found ${files.length} backed-up files to delete`);

    // 4. Track deletion progress
    let deletedCount = 0;
    let failedCount = 0;
    let totalSpaceFreed = 0;
    const deletedSubmissionIds: string[] = [];
    const failedDeletions: { id: string; url: string; error: string }[] = [];

    // 5. Delete files from R2 storage
    for (const file of files) {
      try {
        const r2Key = extractR2Key(file.FileMinhChungUrl);
        
        // Delete from R2
        const deleteSuccess = await r2Client.deleteFile(r2Key);
        
        if (deleteSuccess) {
          deletedCount++;
          deletedSubmissionIds.push(file.MaGhiNhan);
          totalSpaceFreed += file.FileMinhChungSize || 0;
        } else {
          failedCount++;
          failedDeletions.push({
            id: file.MaGhiNhan,
            url: file.FileMinhChungUrl,
            error: 'R2 deletion returned false'
          });
          console.error(`Failed to delete from R2: ${r2Key}`);
        }
      } catch (error) {
        failedCount++;
        failedDeletions.push({
          id: file.MaGhiNhan,
          url: file.FileMinhChungUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`Error deleting file ${file.FileMinhChungUrl}:`, error);
      }
    }

    // 6. Update database records for successfully deleted files
    if (deletedSubmissionIds.length > 0) {
      try {
        // Update GhiNhanHoatDong: Set file URLs to NULL
        const updateQuery = `
          UPDATE "GhiNhanHoatDong"
          SET "FileMinhChungUrl" = NULL,
              "FileMinhChungETag" = NULL,
              "FileMinhChungSha256" = NULL,
              "FileMinhChungSize" = NULL
          WHERE "MaGhiNhan" = ANY($1::uuid[])
        `;
        
        await db.query(updateQuery, [deletedSubmissionIds]);

        // Update ChiTietSaoLuu: Mark as deleted
        const updateBackupDetailsQuery = `
          UPDATE "ChiTietSaoLuu"
          SET "TrangThai" = 'DaXoa',
              "NgayXoa" = NOW()
          WHERE "MaGhiNhan" = ANY($1::uuid[])
            AND "TrangThai" = 'DaSaoLuu'
        `;
        
        await db.query(updateBackupDetailsQuery, [deletedSubmissionIds]);

        console.log(`Updated ${deletedSubmissionIds.length} database records`);
      } catch (error) {
        console.error('Error updating database after deletion:', error);
        // Log but don't fail - files are already deleted from R2
      }
    }

    // 7. Create deletion tracking record
    const deletionRecord = await xoaMinhChungRepo.create({
      MaSaoLuu: null, // Not linked to specific backup
      NgayBatDau: startDateObj,
      NgayKetThuc: endDateObj,
      TongSoTep: files.length,
      SoTepThanhCong: deletedCount,
      SoTepThatBai: failedCount,
      DungLuongGiaiPhong: totalSpaceFreed,
      MaTaiKhoan: user.id,
      GhiChu: failedCount > 0 ? `${failedCount} files failed to delete` : null,
    });

    // 8. Create audit log
    const spaceMB = (totalSpaceFreed / 1024 / 1024).toFixed(2);
    await nhatKyHeThongRepo.create({
      MaTaiKhoan: user.id,
      HanhDong: 'DELETE_ARCHIVED_FILES',
      Bang: 'XoaMinhChung',
      KhoaChinh: deletionRecord.MaXoa,
      NoiDung: {
        startDate: formatDate(startDateObj),
        endDate: formatDate(endDateObj),
        totalFiles: files.length,
        deletedCount,
        failedCount,
        spaceMB: parseFloat(spaceMB),
        failedDeletions: failedDeletions.slice(0, 10), // Store first 10 failures
      },
      DiaChiIP: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    // 9. Return success response with summary
    const message = failedCount > 0
      ? `Deleted ${deletedCount} files (${failedCount} failed). Freed ${spaceMB} MB.`
      : `Successfully deleted ${deletedCount} files. Freed ${spaceMB} MB.`;

    return NextResponse.json({
      success: true,
      deletedCount,
      failedCount,
      spaceMB: parseFloat(spaceMB),
      message,
      deletionId: deletionRecord.MaXoa,
    }, { status: 200 });

  } catch (error) {
    console.error('Deletion error:', error);
    
    // Log error to audit trail
    try {
      const user = await getCurrentUser();
      if (user) {
        await nhatKyHeThongRepo.create({
          MaTaiKhoan: user.id,
          HanhDong: 'DELETE_ARCHIVED_FILES_ERROR',
          Bang: 'XoaMinhChung',
          KhoaChinh: null,
          NoiDung: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          DiaChiIP: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        });
      }
    } catch (auditError) {
      console.error('Failed to log audit error:', auditError);
    }

    return NextResponse.json(
      {
        error: 'Không thể xóa minh chứng. Vui lòng thử lại sau.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
