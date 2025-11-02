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
import { Readable } from 'stream';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { r2Client } from '@/lib/storage/r2-client';
import { 
  saoLuuMinhChungRepo, 
  chiTietSaoLuuRepo, 
  nhatKyHeThongRepo 
} from '@/lib/db/repositories';
import archiver from 'archiver';

const DOWNLOAD_CONCURRENCY = 6;
const MAX_BACKUP_FILE_COUNT = 2000;

interface SkippedManifestFile {
  submissionId: string;
  filename: string;
  reason: string;
}

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
  // Submissions persist proxy URLs (e.g. /api/files/prefix/file.pdf)
  if (url.startsWith('/api/files/')) {
    const path = url.slice('/api/files/'.length);
    return path.split('?')[0];
  }

  // Support plain keys stored without protocol or leading slash
  if (!url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    return url.replace(/^\/+/, '').split('?')[0];
  }

  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1);
  } catch (error) {
    console.warn(`Unexpected evidence file URL format: ${url}`, error);
    const parts = url.split('/');
    if (parts.length >= 3) {
      const tail = parts.slice(parts.length - 2).map((segment) => segment.split('?')[0]);
      return tail.join('/');
    }
    return parts[parts.length - 1].split('?')[0];
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

    const totalSizeBytes = files.reduce((sum, f) => sum + (f.FileMinhChungSize || 0), 0);

    if (files.length > MAX_BACKUP_FILE_COUNT) {
      return NextResponse.json(
        {
          error:
            'Số lượng minh chứng trong phạm vi vượt quá giới hạn 2.000 tệp. Vui lòng chia nhỏ khoảng thời gian và tạo nhiều bản sao lưu.',
          totalFiles: files.length,
        },
        { status: 400 },
      );
    }

    const backupRecord = await saoLuuMinhChungRepo.create({
      NgayBatDau: startDateObj,
      NgayKetThuc: endDateObj,
      TongSoTep: files.length,
      DungLuong: totalSizeBytes,
      TrangThai: 'HoanThanh',
      MaTaiKhoan: user.id,
      GhiChu: null,
    });

    const backupId = backupRecord.MaSaoLuu;

    const manifestFiles: ManifestFile[] = [];
    const skippedManifest: SkippedManifestFile[] = [];
    let addedFiles = 0;
    let skippedCount = 0;

    const archive = archiver('zip', {
      zlib: { level: 6 },
    });

    archive.on('warning', (warning) => {
      console.warn('Archive warning:', warning);
    });

    const downloadWithRetry = async (objectPath: string): Promise<Readable | null> => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const stream = await r2Client.downloadFileStream(objectPath);
        if (stream) {
          return stream;
        }
        console.warn(`Retry ${attempt}/3 for file: ${objectPath}`);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
      return null;
    };

    const processFile = async (file: EvidenceFileRecord) => {
      const objectPath = extractR2Key(file.FileMinhChungUrl);
      const stream = await downloadWithRetry(objectPath);

      if (!stream) {
        skippedCount++;
        skippedManifest.push({
          submissionId: file.MaGhiNhan,
          filename: objectPath,
          reason: 'DOWNLOAD_FAILED',
        });
        return;
      }

      const practitionerFolder = `${sanitizeFilename(file.practitioner_SoCCHN)}_${sanitizeFilename(file.practitioner_HoVaTen)}`;
      const fileDate = formatDate(new Date(file.NgayGhiNhan));
      const activityName = sanitizeFilename(file.TenHoatDong);
      const filename = objectPath.split('/').pop() || objectPath;
      const zipPath = `${practitionerFolder}/${fileDate}_${activityName}_${filename}`;

      try {
        await new Promise<void>((resolve, reject) => {
          let done = false;
          const cleanup = () => {
            stream.removeListener('end', onEnd);
            stream.removeListener('close', onClose);
            stream.removeListener('error', onError);
          };
          const onEnd = () => {
            if (!done) {
              done = true;
              cleanup();
              resolve();
            }
          };
          const onClose = () => {
            if (!done) {
              done = true;
              cleanup();
              resolve();
            }
          };
          const onError = (err: Error) => {
            if (!done) {
              done = true;
              cleanup();
              reject(err);
            }
          };

          stream.once('end', onEnd);
          stream.once('close', onClose);
          stream.once('error', onError);

          archive.append(stream, { name: zipPath });
        });

        addedFiles++;

        manifestFiles.push({
          submissionId: file.MaGhiNhan,
          activityName: file.TenHoatDong,
          practitioner: file.practitioner_HoVaTen,
          cchn: file.practitioner_SoCCHN,
          date: file.NgayGhiNhan.toISOString(),
          filename: objectPath,
          path: zipPath,
          size: file.FileMinhChungSize,
        });

        await chiTietSaoLuuRepo.create({
          MaSaoLuu: backupId,
          MaGhiNhan: file.MaGhiNhan,
          TrangThai: 'DaSaoLuu',
          NgayXoa: null,
          DungLuongTep: file.FileMinhChungSize || null,
        });
      } catch (error) {
          console.error(`Error streaming file ${objectPath}:`, error);
        skippedCount++;
        skippedManifest.push({
          submissionId: file.MaGhiNhan,
            filename: objectPath,
          reason: 'STREAM_ERROR',
        });
      }
    };

    let cursor = 0;
    const workerCount = Math.min(DOWNLOAD_CONCURRENCY, files.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < files.length) {
        const currentIndex = cursor;
        cursor += 1;
        const file = files[currentIndex];
        if (!file) {
          break;
        }
        await processFile(file);
      }
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const closeOnce = () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        };

        archive.on('data', (chunk) => {
          controller.enqueue(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        });

        archive.on('end', closeOnce);
        archive.on('close', closeOnce);
        archive.on('error', (err) => {
          console.error('Archive stream error:', err);
          controller.error(err);
        });

        try {
          await Promise.all(workers);

          const manifest = {
            backupDate: new Date().toISOString(),
            dateRange: {
              start: startDateObj.toISOString(),
              end: endDateObj.toISOString(),
            },
            totalFiles: files.length,
            addedFiles,
            skippedCount,
            backupBy: user.username,
            backupId,
            totalSizeBytes,
            files: manifestFiles,
            skippedFiles: skippedManifest,
          };

          archive.append(JSON.stringify(manifest, null, 2), {
            name: 'BACKUP_MANIFEST.json',
          });

          await archive.finalize();

          await saoLuuMinhChungRepo.update(backupId, {
            GhiChu: `Added: ${addedFiles}, Skipped: ${skippedCount}`,
          });

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
              skippedCount,
              skippedDetails: skippedManifest.length,
              totalSizeBytes,
            },
            DiaChiIP:
              req.headers.get('x-forwarded-for') ||
              req.headers.get('x-real-ip') ||
              'unknown',
          });
        } catch (streamError) {
          console.error('Backup streaming error:', streamError);
          controller.error(streamError);

          await saoLuuMinhChungRepo.update(backupId, {
            TrangThai: 'ThatBai',
            GhiChu: `Backup failed after processing ${addedFiles} files`,
          });

          await nhatKyHeThongRepo.create({
            MaTaiKhoan: user.id,
            HanhDong: 'BACKUP_EVIDENCE_FILES_ERROR',
            Bang: 'SaoLuuMinhChung',
            KhoaChinh: backupId,
            NoiDung: {
              startDate: formatDate(startDateObj),
              endDate: formatDate(endDateObj),
              error: streamError instanceof Error ? streamError.message : 'Unknown error',
            },
            DiaChiIP:
              req.headers.get('x-forwarded-for') ||
              req.headers.get('x-real-ip') ||
              'unknown',
          });
        }
      },
    });

    const filename = `CNKTYKLT_Backup_${formatDate(startDateObj)}_to_${formatDate(endDateObj)}.zip`;

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Backup-Total-Files': files.length.toString(),
        'X-Backup-Total-Bytes': totalSizeBytes.toString(),
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
