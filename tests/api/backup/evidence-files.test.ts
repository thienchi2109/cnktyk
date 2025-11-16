import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { Readable } from 'stream';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/storage/r2-client', () => ({
  r2Client: {
    downloadFileStream: vi.fn(),
  },
}));

vi.mock('@/lib/db/repositories', () => ({
  saoLuuMinhChungRepo: {
    create: vi.fn(),
    update: vi.fn(),
  },
  chiTietSaoLuuRepo: {
    create: vi.fn(),
  },
  nhatKyHeThongRepo: {
    create: vi.fn(),
  },
}));

vi.mock('@/app/api/backup/utils/file-size', () => ({
  extractR2Key: vi.fn((url: string) => url.split('?')[0]),
  resolveFileSizes: vi.fn(),
}));

import { POST } from '@/app/api/backup/evidence-files/route';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { r2Client } from '@/lib/storage/r2-client';
import {
  saoLuuMinhChungRepo,
  chiTietSaoLuuRepo,
  nhatKyHeThongRepo,
} from '@/lib/db/repositories';
import { resolveFileSizes } from '@/app/api/backup/utils/file-size';
import { MAX_BACKUP_FILE_COUNT } from '@/app/api/backup/evidence-files/constants';

type EvidenceRecord = {
  MaGhiNhan: string;
  FileMinhChungUrl: string;
  TenHoatDong: string;
  NgayGhiNhan: Date;
  practitioner_HoVaTen: string;
  practitioner_SoCCHN: string;
};

const defaultBody = {
  startDate: '2024-01-01',
  endDate: '2024-03-01',
};

const soyteUser = {
  id: 'user-soyte',
  username: 'soyte@example.com',
  role: 'SoYTe' as const,
};

const buildRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/backup/evidence-files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;

const buildEvidenceRecord = (index: number): EvidenceRecord => ({
  MaGhiNhan: `record-${index}`,
  FileMinhChungUrl: `evidence/${index + 1}.pdf`,
  TenHoatDong: `Hoat dong ${index + 1}`,
  NgayGhiNhan: new Date(`2024-01-${String((index % 28) + 1).padStart(2, '0')}T02:00:00Z`),
  practitioner_HoVaTen: `Bac si ${index + 1}`,
  practitioner_SoCCHN: `CCHN-${(index + 1).toString().padStart(4, '0')}`,
});

const collectStreamBody = async (response: Response): Promise<Buffer> => {
  const reader = response.body?.getReader();
  if (!reader) {
    return Buffer.alloc(0);
  }

  const chunks: Buffer[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(Buffer.from(value));
    }
  }

  return Buffer.concat(chunks);
};

const mockSizeResolution = (
  records: EvidenceRecord[],
  options?: { sizes?: Array<number | null>; r2Configured?: boolean },
) => {
  const resolvedSizes = options?.sizes ?? records.map(() => 1024);
  const total = resolvedSizes.reduce((sum: number, size) => sum + (size ?? 0), 0);

  (resolveFileSizes as unknown as Mock).mockResolvedValue({
    files: records.map((record, index) => ({
      id: record.MaGhiNhan,
      url: record.FileMinhChungUrl,
      size: resolvedSizes[index],
    })),
    totalSizeBytes: total,
    missingCount: resolvedSizes.filter((size) => size == null).length,
    r2Configured: options?.r2Configured ?? true,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as unknown as Mock).mockResolvedValue(soyteUser);
  (saoLuuMinhChungRepo.create as unknown as Mock).mockResolvedValue({
    MaSaoLuu: 'backup-001',
  });
  (saoLuuMinhChungRepo.update as unknown as Mock).mockResolvedValue(undefined);
  (chiTietSaoLuuRepo.create as unknown as Mock).mockResolvedValue(undefined);
  (nhatKyHeThongRepo.create as unknown as Mock).mockResolvedValue(undefined);
});

describe('POST /api/backup/evidence-files', () => {
  it('returns 401 when user is unauthenticated', async () => {
    (getCurrentUser as unknown as Mock).mockResolvedValueOnce(null);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: 'Chưa đăng nhập.' }),
    );
  });

  it('returns 403 when user is not SoYTe', async () => {
    (getCurrentUser as unknown as Mock).mockResolvedValueOnce({
      id: 'user-donvi',
      username: 'unit@example.com',
      role: 'DonVi' as const,
      unitId: 'unit-1',
    });

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Chỉ tài khoản Sở Y tế mới có quyền tạo sao lưu.',
      }),
    );
  });

  it('validates required date fields', async () => {
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.',
      }),
    );
  });

  it('rejects inverted date ranges', async () => {
    const response = await POST(
      buildRequest({
        startDate: '2024-04-01',
        endDate: '2024-03-01',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Ngày bắt đầu phải sớm hơn ngày kết thúc.',
      }),
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects future end dates', async () => {
    const today = new Date();
    const future = new Date(today.getTime() + 48 * 60 * 60 * 1000);
    const response = await POST(
      buildRequest({
        startDate: '2024-01-01',
        endDate: future.toISOString().split('T')[0],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Ngày kết thúc không được vượt quá hôm nay.',
      }),
    );
  });

  it('returns 404 when no evidence files are found', async () => {
    (db.query as unknown as Mock).mockResolvedValue([]);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Không tìm thấy minh chứng nào trong khoảng thời gian đã chọn.',
      }),
    );
    expect(resolveFileSizes).not.toHaveBeenCalled();
  });

  it('enforces the maximum backup file count', async () => {
    const records = Array.from(
      { length: MAX_BACKUP_FILE_COUNT + 1 },
      (_, index) => buildEvidenceRecord(index),
    );
    (db.query as unknown as Mock).mockResolvedValue(records);
    mockSizeResolution(records);

    const response = await POST(buildRequest(defaultBody));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual(
      expect.objectContaining({
        totalFiles: records.length,
      }),
    );
    expect(saoLuuMinhChungRepo.create).not.toHaveBeenCalled();
  });

  it('returns 503 when R2 is not configured', async () => {
    const records = [buildEvidenceRecord(0)];
    (db.query as unknown as Mock).mockResolvedValue(records);
    mockSizeResolution(records, { r2Configured: false });

    const response = await POST(buildRequest(defaultBody));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.stringContaining('chưa cấu hình kho lưu trữ'),
      }),
    );
    expect(r2Client.downloadFileStream).not.toHaveBeenCalled();
  });

  it('streams a ZIP when files are available', async () => {
    const records = [buildEvidenceRecord(0), buildEvidenceRecord(1)];
    (db.query as unknown as Mock).mockResolvedValue(records);
    mockSizeResolution(records, { sizes: [512, 1024] });
    (r2Client.downloadFileStream as unknown as Mock).mockImplementation((key: string) =>
      Readable.from([Buffer.from(`file:${key}`)]),
    );

    const response = await POST(buildRequest(defaultBody));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('X-Backup-Total-Files')).toBe(String(records.length));
    expect(response.headers.get('X-Backup-Total-Bytes')).toBe(String(1536));

    const zipBuffer = await collectStreamBody(response);
    expect(zipBuffer.length).toBeGreaterThan(0);

    expect(chiTietSaoLuuRepo.create).toHaveBeenCalledTimes(2);
    const firstDetail = (chiTietSaoLuuRepo.create as unknown as Mock).mock.calls[0][0];
    expect(firstDetail).toMatchObject({
      MaSaoLuu: 'backup-001',
      MaGhiNhan: records[0].MaGhiNhan,
      TrangThai: 'DaSaoLuu',
      DungLuongTep: 512,
    });
    expect(saoLuuMinhChungRepo.update).toHaveBeenCalledWith('backup-001', {
      GhiChu: 'Added: 2, Skipped: 0',
    });
    expect(nhatKyHeThongRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        HanhDong: 'BACKUP_EVIDENCE_FILES',
        KhoaChinh: 'backup-001',
      }),
    );
  });

  it('records skipped files when downloads repeatedly fail', async () => {
    const records = [buildEvidenceRecord(0), buildEvidenceRecord(1)];
    records[1].FileMinhChungUrl = 'missing-file.pdf';
    (db.query as unknown as Mock).mockResolvedValue(records);
    mockSizeResolution(records, { sizes: [512, 2048] });

    (r2Client.downloadFileStream as unknown as Mock).mockImplementation((key: string) => {
      if (key === 'missing-file.pdf') {
        return null;
      }
      return Readable.from([Buffer.from(`file:${key}`)]);
    });

    const response = await POST(buildRequest(defaultBody));
    const zipBuffer = await collectStreamBody(response);

    expect(zipBuffer.length).toBeGreaterThan(0);
    expect(r2Client.downloadFileStream).toHaveBeenCalledTimes(4);
    expect(chiTietSaoLuuRepo.create).toHaveBeenCalledTimes(1);
    expect(saoLuuMinhChungRepo.update).toHaveBeenCalledWith('backup-001', {
      GhiChu: 'Added: 1, Skipped: 1',
    });
    expect(nhatKyHeThongRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        HanhDong: 'BACKUP_EVIDENCE_FILES',
      }),
    );
  }, 10000);

  it('fails when no files can be streamed from R2', async () => {
    vi.useFakeTimers();
    try {
      const records = [buildEvidenceRecord(0), buildEvidenceRecord(1)];
      (db.query as unknown as Mock).mockResolvedValue(records);
      mockSizeResolution(records);
      (r2Client.downloadFileStream as unknown as Mock).mockResolvedValue(null);

      const response = await POST(buildRequest(defaultBody));
      const bodyPromise = collectStreamBody(response);
      await vi.runAllTimersAsync();
      await expect(bodyPromise).rejects.toThrow(
        'Không thể tải bất kỳ minh chứng nào từ kho lưu trữ',
      );

      expect(saoLuuMinhChungRepo.update).toHaveBeenCalledWith(
        'backup-001',
        expect.objectContaining({
          TrangThai: 'ThatBai',
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
