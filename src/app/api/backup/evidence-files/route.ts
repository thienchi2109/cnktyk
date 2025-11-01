/**
 * Evidence Files Backup API Endpoint
 * POST /api/backup/evidence-files
 * 
 * Downloads all evidence files from approved submissions within a date range
 * and packages them into a ZIP archive for offline storage.
 * 
 * Access: SoYTe role only
 * Max Duration: 300 seconds (5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { r2Client } from '@/lib/storage/r2-client';
import { 
  saoLuuMinhChungRepo, 
  chiTietSaoLuuRepo, 
  nhatKyHeThongRepo 
} from '@/lib/db/repositories';
import archiver from 'archiver';
import { Readable } from 'stream';

// Configure route for long-running backup operations
export const maxDuration = 300; // 5 minutes

interface BackupRequestBody {
  startDate: string;
  endDate: string;
}

interface EvidenceFileRecord {
  MaGhiNhan: string;
  FileMinhChungUrl: string;
  TenHoatDong: string;
  NgayGhiNhan: Date;
  practitioner_HoVaTen: string;
  practitioner_SoCCHN: string;
  FileMinhChungSize?: number;
}

interface ManifestFile {
  submissionId: string;
  activityName: string;
  practitioner: string;
  cchn: string;
  date: string;
  filename: string;
  path: string;
  size?: number;
}

/**
 * Extract R2 object key from full URL
 * URL format: https://bucket.r2.dev/evidence/12345.pdf
 * Returns: evidence/12345.pdf (preserves the full path)
 * 
 * CRITICAL: Must preserve the full key path because generateSecureFilename()
 * uploads files with prefixes like "evidence/" or "activity-{id}/".
 * Returning only the basename would cause 404s on R2 GetObject calls.
 */
function extractR2Key(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname to get the object key
    return urlObj.pathname.substring(1);
  } catch (error) {
    // Fallback for invalid URLs (shouldn't happen with valid database data)
    console.error(`Invalid URL format: ${url}`, error);
    // Try simple path extraction as last resort
    const parts = url.split('/');
    // If it looks like domain/path/file, return path/file
    if (parts.length >= 3) {
      return parts.slice(parts.length - 2).join('/');
    }
    return parts[parts.length - 1];
  }
}

/**
 * Sanitize string for use in filenames
 */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\u00C0-\u1EF9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
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
  // Check if start date is before end date
  if (startDate >= endDate) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  // Check if end date is in the future
  const now = new Date();
  if (endDate > now) {
    return { valid: false, error: 'End date cannot be in the future' };
  }

  // Check if date range exceeds 1 year
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const rangeMs = endDate.getTime() - startDate.getTime();
  if (rangeMs > oneYearMs) {
    return { valid: false, error: 'Date range cannot exceed 1 year' };
  }

  return { valid: true };
}

/**
 * POST /api/backup/evidence-files
 * Create and download ZIP backup of evidence files
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'SoYTe') {
      return NextResponse.json(
        { error: 'Access denied. SoYTe role required.' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    let body: BackupRequestBody;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Parse dates
    let startDateObj: Date;
    let endDateObj: Date;
    try {
      startDateObj = new Date(startDate);
      endDateObj = new Date(endDate);
      
      // Check if dates are valid
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate date range constraints
    const validation = validateDateRange(startDateObj, endDateObj);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Calculate exclusive upper bound so we include the entire end date
    const endDateExclusive = new Date(endDateObj);
    endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);

    // 3. Query database for evidence files in date range
    const query = `
      SELECT 
        g."MaGhiNhan",
        g."FileMinhChungUrl",
        g."TenHoatDong",
        g."NgayGhiNhan",
        g."FileMinhChungSize",
        n."HoVaTen" AS practitioner_HoVaTen,
        n."SoCCHN" AS practitioner_SoCCHN
      FROM "GhiNhanHoatDong" g
      INNER JOIN "NhanVien" n ON n."MaNhanVien" = g."MaNhanVien"
      WHERE g."FileMinhChungUrl" IS NOT NULL
        AND g."NgayGhiNhan" >= $1
        AND g."NgayGhiNhan" < $2
        AND g."TrangThaiDuyet" = 'DaDuyet'
      ORDER BY n."SoCCHN", g."NgayGhiNhan" DESC
    `;

    const files = await db.query<EvidenceFileRecord>(query, [startDateObj, endDateExclusive]);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No evidence files found in the specified date range' },
        { status: 404 }
      );
    }

    console.log(`Found ${files.length} evidence files to backup`);

    // 4. Create backup tracking record in database
    const backupRecord = await saoLuuMinhChungRepo.create({
      NgayBatDau: startDateObj,
      NgayKetThuc: endDateObj,
      TongSoTep: files.length,
      DungLuong: files.reduce((sum, f) => sum + (f.FileMinhChungSize || 0), 0),
      TrangThai: 'HoanThanh',
      MaTaiKhoan: user.id,
      GhiChu: null,
    });

    const backupId = backupRecord.MaSaoLuu;

    // 5. Create ZIP archive using archiver
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Compression level (0-9)
    });

    // Track manifest data
    const manifestFiles: ManifestFile[] = [];
    let addedFiles = 0;
    let skippedFiles = 0;

    // Error handling for archive
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // 6. Download files from R2 and add to ZIP
    for (const file of files) {
      try {
        // Extract R2 object key from URL (preserves full path like "evidence/12345.pdf")
        const r2Key = extractR2Key(file.FileMinhChungUrl);
        
        // Download file from R2 with retry logic
        let fileBuffer: Buffer | null = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !fileBuffer) {
          fileBuffer = await r2Client.downloadFile(r2Key);
          if (!fileBuffer) {
            retryCount++;
            console.warn(`Retry ${retryCount}/${maxRetries} for file: ${r2Key}`);
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            }
          }
        }

        if (!fileBuffer) {
          console.error(`Failed to download file after ${maxRetries} retries: ${r2Key}`);
          skippedFiles++;
          continue;
        }

        // Extract just the filename for the ZIP path (remove R2 prefix)
        const filename = r2Key.split('/').pop() || r2Key;
        
        // Organize files by practitioner
        const practitionerFolder = `${sanitizeFilename(file.practitioner_SoCCHN)}_${sanitizeFilename(file.practitioner_HoVaTen)}`;
        const fileDate = formatDate(new Date(file.NgayGhiNhan));
        const activityName = sanitizeFilename(file.TenHoatDong);
        const zipPath = `${practitionerFolder}/${fileDate}_${activityName}_${filename}`;

        // Add file to ZIP
        archive.append(fileBuffer, { name: zipPath });
        addedFiles++;

        // Track in manifest
        manifestFiles.push({
          submissionId: file.MaGhiNhan,
          activityName: file.TenHoatDong,
          practitioner: file.practitioner_HoVaTen,
          cchn: file.practitioner_SoCCHN,
          date: file.NgayGhiNhan.toISOString(),
          filename: r2Key, // Store full R2 key for reference
          path: zipPath,
          size: file.FileMinhChungSize,
        });

        // Create backup detail record
        await chiTietSaoLuuRepo.create({
          MaSaoLuu: backupId,
          MaGhiNhan: file.MaGhiNhan,
          TrangThai: 'DaSaoLuu',
          NgayXoa: null,
          DungLuongTep: file.FileMinhChungSize || null,
        });

      } catch (error) {
        console.error(`Error processing file ${file.FileMinhChungUrl}:`, error);
        skippedFiles++;
      }
    }

    // 7. Generate manifest.json
    const manifest = {
      backupDate: new Date().toISOString(),
      dateRange: {
        start: startDateObj.toISOString(),
        end: endDateObj.toISOString(),
      },
      totalFiles: files.length,
      addedFiles,
      skippedFiles,
      backupBy: user.username,
      backupId,
      files: manifestFiles,
    };

    archive.append(JSON.stringify(manifest, null, 2), { name: 'BACKUP_MANIFEST.json' });

    // 8. Update backup record status with note about results
    await saoLuuMinhChungRepo.update(backupRecord.MaSaoLuu, {
      GhiChu: `Added: ${addedFiles}, Skipped: ${skippedFiles}`,
    });

    // 9. Create audit log
    await nhatKyHeThongRepo.create({
      MaTaiKhoan: user.id,
      HanhDong: 'BACKUP_EVIDENCE_FILES',
      Bang: 'SaoLuuMinhChung',
      KhoaChinh: backupId,
      NoiDung: {
        startDate: formatDate(startDateObj),
        endDate: formatDate(endDateObj),
        totalFiles: files.length,
        addedFiles,
        skippedFiles,
      },
      DiaChiIP: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    // 10. Finalize archive
    await archive.finalize();

    // 11. Convert archive stream to buffer for response
    const chunks: Uint8Array[] = [];
    const readable = Readable.from(archive);
    
    for await (const chunk of readable) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // 12. Return ZIP file as response
    const filename = `CNKTYKLT_Backup_${formatDate(startDateObj)}_to_${formatDate(endDateObj)}.zip`;
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Backup error:', error);
    
    // Log error to audit trail
    try {
      const user = await getCurrentUser();
      if (user) {
        await nhatKyHeThongRepo.create({
          MaTaiKhoan: user.id,
          HanhDong: 'BACKUP_EVIDENCE_FILES_ERROR',
          Bang: 'SaoLuuMinhChung',
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
        error: 'Error creating backup archive',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
