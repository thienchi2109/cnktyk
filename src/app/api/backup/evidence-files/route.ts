/**
 * Evidence Files Backup API Endpoint.
 *
 * @module POST /api/backup/evidence-files
 * @remarks Streams evidence file backups into a ZIP archive scoped by a date range.
 * @access SoYTe role only
 * @maxDuration 300 seconds (5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { r2Client } from '@/lib/storage/r2-client';
import { extractR2Key, resolveFileSizes } from '@/app/api/backup/utils/file-size';
import {
  saoLuuMinhChungRepo,
  chiTietSaoLuuRepo,
  nhatKyHeThongRepo,
} from '@/lib/db/repositories';
import { MAX_BACKUP_FILE_COUNT } from './constants';
import archiver from 'archiver';

const DOWNLOAD_CONCURRENCY = 6;

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
  FileMinhChungSize?: number | null;
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
 * Normalises a string into a safe filename segment.
 *
 * @param str - Raw value such as practitioner name or activity title.
 * @returns The sanitized value limited to 50 characters and using underscores for whitespace.
 */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\u00C0-\u1EF9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

/**
 * Formats a {@link Date} into `YYYY-MM-DD` for consistent manifest naming.
 *
 * @param date - Date instance to format.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validates the requested backup date window.
 *
 * @param startDate - Inclusive start of the backup range.
 * @param endDate - Inclusive end of the backup range.
 * @returns Validation result with optional localized error message.
 */
function validateDateRange(startDate: Date, endDate: Date): { valid: boolean; error?: string } {
  // Check if start date is before end date
  if (startDate >= endDate) {
    return { valid: false, error: 'Ngày bắt đầu phải sớm hơn ngày kết thúc.' };
  }

  // Check if end date is in the future
  const now = new Date();
  if (endDate > now) {
    return { valid: false, error: 'Ngày kết thúc không được vượt quá hôm nay.' };
  }

  // Check if date range exceeds 1 year
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const rangeMs = endDate.getTime() - startDate.getTime();
  if (rangeMs > oneYearMs) {
    return { valid: false, error: 'Khoảng thời gian không được vượt quá 1 năm.' };
  }

  return { valid: true };
}

/**
 * Streams a ZIP archive of evidence files matching the supplied date range.
 *
 * @param req - The incoming Next.js request containing the date range payload.
 * @returns Streaming {@link NextResponse} with ZIP body or JSON error.
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
        { error: 'Chỉ tài khoản Sở Y tế mới có quyền tạo sao lưu.' },
        { status: 403 },
      );
    }

    // 2. Parse and validate request body
    let body: BackupRequestBody;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Dữ liệu gửi lên không hợp lệ. Vui lòng thử lại.' },
        { status: 400 },
      );
    }

    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.' },
        { status: 400 },
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

    const rawFiles = await db.query<EvidenceFileRecord>(query, [startDateObj, endDateExclusive]);

    if (!rawFiles || rawFiles.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy minh chứng nào trong khoảng thời gian đã chọn.' },
        { status: 404 },
      );
    }

    const sizeResolution = await resolveFileSizes(
      rawFiles.map((file) => ({ id: file.MaGhiNhan, url: file.FileMinhChungUrl })),
    );

    if (!sizeResolution.r2Configured) {
      return NextResponse.json(
        {
          error: 'Hệ thống chưa cấu hình kho lưu trữ minh chứng (Cloudflare R2). Vui lòng hoàn tất cấu hình trước khi tạo bản sao lưu.',
        },
        { status: 503 },
      );
    }

    const files = rawFiles.map((file, index) => ({
      ...file,
      FileMinhChungSize: sizeResolution.files[index]?.size ?? null,
    }));

    const totalSizeBytes = sizeResolution.totalSizeBytes;

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

    /**
     * Attempts to download an R2 object stream, retrying transient failures up to three times.
     *
     * @param objectPath - R2 object key to retrieve.
     * @returns Node {@link Readable} stream when available; otherwise `null` after retries.
     */
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

    /**
     * Pipes a single evidence file into the ZIP archive and records manifest metadata.
     *
     * @param file - Evidence record sourced from the database query.
     */
    const processFile = async (file: EvidenceFileRecord) => {
      const objectPath = extractR2Key(file.FileMinhChungUrl);
      if (!objectPath) {
        skippedCount++;
        skippedManifest.push({
          submissionId: file.MaGhiNhan,
          filename: file.FileMinhChungUrl,
          reason: 'INVALID_URL',
        });
        return;
      }

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

      let streamedBytes = 0;
      stream.on('data', (chunk) => {
        if (typeof chunk === 'string') {
          streamedBytes += Buffer.byteLength(chunk);
        } else if (chunk) {
          streamedBytes += chunk.length;
        }
      });

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

        const resolvedSize = file.FileMinhChungSize ?? (streamedBytes > 0 ? streamedBytes : null);

        manifestFiles.push({
          submissionId: file.MaGhiNhan,
          activityName: file.TenHoatDong,
          practitioner: file.practitioner_HoVaTen,
          cchn: file.practitioner_SoCCHN,
          date: file.NgayGhiNhan.toISOString(),
          filename: objectPath,
          path: zipPath,
          size: resolvedSize ?? undefined,
        });

        await chiTietSaoLuuRepo.create({
          MaSaoLuu: backupId,
          MaGhiNhan: file.MaGhiNhan,
          TrangThai: 'DaSaoLuu',
          NgayXoa: null,
          DungLuongTep: resolvedSize ?? null,
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
        // Shared cursor hands each worker a unique file without additional locking primitives.
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
          // Finalise once all workers finish piping their streams into the archive.
          await Promise.all(workers);

          if (addedFiles === 0) {
            throw new Error('Không thể tải bất kỳ minh chứng nào từ kho lưu trữ. Vui lòng kiểm tra Cloudflare R2 và thử lại.');
          }

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
        error: 'Không thể tạo gói sao lưu. Vui lòng thử lại sau.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
