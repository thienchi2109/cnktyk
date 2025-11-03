import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import {
  BACKUP_DOWNLOAD_SPEED_BYTES_PER_SECOND,
  ESTIMATED_COMPRESSION_RATIO,
  MAX_BACKUP_FILE_COUNT,
} from '../constants';

interface EstimateRequestBody {
  startDate: string;
  endDate: string;
}

interface EstimateQueryResult {
  totalFiles: number | string;
  totalSizeBytes: number | string;
  missingSizeCount: number | string;
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const parseDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validateDateRange = (start: Date, end: Date) => {
  if (start >= end) {
    return 'Ngày bắt đầu phải sớm hơn ngày kết thúc.';
  }

  const now = new Date();
  if (end > now) {
    return 'Ngày kết thúc không được vượt quá hôm nay.';
  }

  if (end.getTime() - start.getTime() > 365 * MS_IN_DAY) {
    return 'Khoảng thời gian không được vượt quá 1 năm.';
  }

  return null;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
  }

  if (user.role !== 'SoYTe') {
    return NextResponse.json(
      { error: 'Chỉ tài khoản Sở Y tế mới có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  let body: EstimateRequestBody;
  try {
    body = await req.json();
  } catch {
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

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return NextResponse.json(
      { error: 'Định dạng ngày không hợp lệ. Sử dụng định dạng YYYY-MM-DD.' },
      { status: 400 },
    );
  }

  const validationError = validateDateRange(start, end);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const summary = await db.queryOne<EstimateQueryResult>(
    `
      SELECT
        COUNT(*)::int AS "totalFiles",
        COALESCE(SUM(COALESCE(g."FileMinhChungSize", 0)), 0)::bigint AS "totalSizeBytes",
        COUNT(*) FILTER (WHERE g."FileMinhChungSize" IS NULL)::int AS "missingSizeCount"
      FROM "GhiNhanHoatDong" g
      WHERE g."FileMinhChungUrl" IS NOT NULL
        AND g."NgayGhiNhan" >= $1
        AND g."NgayGhiNhan" < $2
        AND g."TrangThaiDuyet" = 'DaDuyet'
    `,
    [start, endExclusive],
  );

  const totalFiles = Number(summary?.totalFiles ?? 0);
  const totalSizeBytes = Number(summary?.totalSizeBytes ?? 0);
  const missingSizeCount = Number(summary?.missingSizeCount ?? 0);

  if (totalFiles === 0) {
    return NextResponse.json(
      { error: 'Không tìm thấy minh chứng nào trong khoảng thời gian đã chọn.' },
      { status: 404 },
    );
  }

  const effectiveSizeCount = Math.max(totalFiles - missingSizeCount, 0);
  const averageFileSizeBytes = effectiveSizeCount > 0
    ? Math.round(totalSizeBytes / effectiveSizeCount)
    : 0;

  const estimatedCompressedSizeBytes = Math.max(
    0,
    Math.round(totalSizeBytes * ESTIMATED_COMPRESSION_RATIO),
  );
  const bytesForDuration = estimatedCompressedSizeBytes || totalSizeBytes;
  const estimatedDurationSeconds = bytesForDuration > 0
    ? Math.ceil(bytesForDuration / BACKUP_DOWNLOAD_SPEED_BYTES_PER_SECOND)
    : 0;

  const warnings: string[] = [];

  if (totalFiles > MAX_BACKUP_FILE_COUNT) {
    warnings.push(
      'Khoảng thời gian này vượt quá giới hạn 2.000 minh chứng. Vui lòng chia nhỏ khoảng và tạo nhiều bản sao lưu.',
    );
  } else if (totalFiles > Math.floor(MAX_BACKUP_FILE_COUNT * 0.85)) {
    warnings.push(
      'Số lượng minh chứng đang tiến gần giới hạn 2.000. Nên cân nhắc chia nhỏ khoảng thời gian.',
    );
  }

  if (missingSizeCount > 0) {
    warnings.push(
      `${missingSizeCount} minh chứng chưa có dữ liệu dung lượng. Đã ước tính dựa trên các tệp còn lại.`,
    );
  }

  if (estimatedDurationSeconds > 15 * 60) {
    warnings.push('Ước tính thời gian tải xuống lớn hơn 15 phút. Hãy cân nhắc phạm vi nhỏ hơn để tránh gián đoạn.');
  }

  return NextResponse.json({
    totalFiles,
    totalSizeBytes,
    missingSizeCount,
    averageFileSizeBytes,
    estimatedCompressedSizeBytes,
    estimatedDurationSeconds,
    warnings,
  });
}
