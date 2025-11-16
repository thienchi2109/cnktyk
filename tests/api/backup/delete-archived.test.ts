import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
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
    deleteFile: vi.fn(),
  },
}));

vi.mock('@/lib/db/repositories', () => ({
  xoaMinhChungRepo: {
    create: vi.fn(),
    findByUser: vi.fn(),
  },
  nhatKyHeThongRepo: {
    create: vi.fn(),
  },
  ghiNhanHoatDongRepo: {},
  saoLuuMinhChungRepo: {
    findByUserSince: vi.fn(),
  },
}));

vi.mock('@/app/api/backup/utils/file-size', () => ({
  extractR2Key: vi.fn((url: string) => url.split('?')[0]),
  resolveFileSizes: vi.fn(),
}));

import { POST } from '@/app/api/backup/delete-archived/route';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { r2Client } from '@/lib/storage/r2-client';
import {
  xoaMinhChungRepo,
  nhatKyHeThongRepo,
  saoLuuMinhChungRepo,
} from '@/lib/db/repositories';
import { resolveFileSizes } from '@/app/api/backup/utils/file-size';

const soyteUser = {
  id: 'user-soyte',
  username: 'soyte@example.com',
  role: 'SoYTe' as const,
};

const defaultBody = {
  startDate: '2024-01-01',
  endDate: '2024-03-01',
  confirmationToken: 'DELETE',
};

const buildRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/backup/delete-archived', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;

const buildFileRecord = (index: number) => ({
  MaGhiNhan: `record-${index}`,
  FileMinhChungUrl: `evidence/${index + 1}.pdf`,
  FileMinhChungSize: 1024,
});

const mockRecentBackup = () => ({
  MaSaoLuu: 'backup-001',
  NgayBatDau: new Date('2024-01-01'),
  NgayKetThuc: new Date('2024-12-31'),
  TongSoTep: 100,
  DungLuong: 1024 * 100,
  TrangThai: 'HoanThanh',
  MaTaiKhoan: soyteUser.id,
  NgayTao: new Date(),
  GhiChu: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as unknown as Mock).mockResolvedValue(soyteUser);
  (xoaMinhChungRepo.create as unknown as Mock).mockResolvedValue({
    MaXoa: 'deletion-001',
  });
  (nhatKyHeThongRepo.create as unknown as Mock).mockResolvedValue(undefined);
  (saoLuuMinhChungRepo.findByUserSince as unknown as Mock).mockResolvedValue([
    mockRecentBackup(),
  ]);
  (xoaMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue([]);
});

describe('POST /api/backup/delete-archived', () => {
  it('returns 401 when user is unauthenticated', async () => {
    (getCurrentUser as unknown as Mock).mockResolvedValueOnce(null);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: 'Chưa đăng nhập.' })
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
        error: 'Chỉ tài khoản Sở Y tế mới có quyền xóa minh chứng.',
      })
    );
  });

  it('validates required date fields', async () => {
    const response = await POST(buildRequest({ confirmationToken: 'DELETE' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.',
      })
    );
  });

  it('requires confirmation token', async () => {
    const response = await POST(
      buildRequest({
        startDate: '2024-01-01',
        endDate: '2024-03-01',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Vui lòng nhập mã xác nhận DELETE để tiếp tục.',
      })
    );
  });

  it('validates confirmation token is exactly DELETE', async () => {
    const response = await POST(
      buildRequest({
        ...defaultBody,
        confirmationToken: 'delete',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Mã xác nhận không hợp lệ. Hãy nhập chính xác "DELETE".',
      })
    );
  });

  it('rejects inverted date ranges', async () => {
    const response = await POST(
      buildRequest({
        startDate: '2024-04-01',
        endDate: '2024-03-01',
        confirmationToken: 'DELETE',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Ngày bắt đầu phải sớm hơn ngày kết thúc.',
      })
    );
  });

  it('rejects future end dates', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const response = await POST(
      buildRequest({
        startDate: '2024-01-01',
        endDate: tomorrow.toISOString().split('T')[0],
        confirmationToken: 'DELETE',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Ngày kết thúc không được vượt quá hôm nay.',
      })
    );
  });

  it('requires recent backup within 24 hours', async () => {
    (saoLuuMinhChungRepo.findByUserSince as unknown as Mock).mockResolvedValueOnce([]);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Bạn cần tạo bản sao lưu trong 24 giờ gần nhất trước khi xóa minh chứng.',
      })
    );
  });

  it('requires backup to cover deletion date range', async () => {
    (saoLuuMinhChungRepo.findByUserSince as unknown as Mock).mockResolvedValueOnce([
      {
        ...mockRecentBackup(),
        NgayBatDau: new Date('2024-06-01'), // Doesn't cover requested range
        NgayKetThuc: new Date('2024-12-31'),
      },
    ]);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error:
          'Khoảng thời gian xóa phải nằm trong một bản sao lưu đã tạo trong 24 giờ qua. Vui lòng tạo sao lưu mới bao phủ đầy đủ phạm vi này.',
      })
    );
  });

  it('enforces 10-minute cooldown between deletions', async () => {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    (xoaMinhChungRepo.findByUser as unknown as Mock).mockResolvedValueOnce([
      {
        MaXoa: 'previous-deletion',
        NgayThucHien: fiveMinutesAgo,
      },
    ]);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(429);
    const data = await response.json();

    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('retryAfterSeconds');
    expect(data.error).toContain('Vui lòng chờ');
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });

  it('returns 404 when no files found in date range', async () => {
    (db.query as unknown as Mock).mockResolvedValue([]);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Không tìm thấy minh chứng đã sao lưu trong khoảng thời gian đã chọn.',
      })
    );
  });

  it('enforces 5000 file limit', async () => {
    const files = Array.from({ length: 5001 }, (_, i) => buildFileRecord(i));
    (db.query as unknown as Mock).mockResolvedValue(files);

    (resolveFileSizes as unknown as Mock).mockResolvedValue({
      files: files.map((f, i) => ({ id: f.MaGhiNhan, url: f.FileMinhChungUrl, size: 1024 })),
      totalSizeBytes: files.length * 1024,
      missingCount: 0,
      r2Configured: true,
    });

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('5.000');
    expect(data.error).toContain('5001');
  });

  it('successfully deletes backed-up files', async () => {
    const files = [buildFileRecord(0), buildFileRecord(1), buildFileRecord(2)];
    (db.query as unknown as Mock).mockResolvedValue(files);

    (resolveFileSizes as unknown as Mock).mockResolvedValue({
      files: files.map((f) => ({ id: f.MaGhiNhan, url: f.FileMinhChungUrl, size: 1024 })),
      totalSizeBytes: files.length * 1024,
      missingCount: 0,
      r2Configured: true,
    });

    (r2Client.deleteFile as unknown as Mock).mockResolvedValue(true);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(3);
    expect(data.failedCount).toBe(0);
    expect(data).toHaveProperty('spaceMB');
    expect(data).toHaveProperty('deletionId');
    expect(data.message).toContain('Successfully deleted 3 files');

    // Verify R2 delete was called for each file
    expect(r2Client.deleteFile).toHaveBeenCalledTimes(3);

    // Verify database updates
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "GhiNhanHoatDong"'),
      expect.any(Array)
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "ChiTietSaoLuu"'),
      expect.any(Array)
    );

    // Verify tracking record created
    expect(xoaMinhChungRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        TongSoTep: 3,
        SoTepThanhCong: 3,
        SoTepThatBai: 0,
        MaTaiKhoan: soyteUser.id,
      })
    );

    // Verify audit log created
    expect(nhatKyHeThongRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        HanhDong: 'DELETE_ARCHIVED_FILES',
        MaTaiKhoan: soyteUser.id,
      })
    );
  });

  it('handles partial deletion failures gracefully', async () => {
    const files = [buildFileRecord(0), buildFileRecord(1), buildFileRecord(2)];
    (db.query as unknown as Mock).mockResolvedValue(files);

    (resolveFileSizes as unknown as Mock).mockResolvedValue({
      files: files.map((f) => ({ id: f.MaGhiNhan, url: f.FileMinhChungUrl, size: 1024 })),
      totalSizeBytes: files.length * 1024,
      missingCount: 0,
      r2Configured: true,
    });

    // First file succeeds, second fails, third succeeds
    (r2Client.deleteFile as unknown as Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.deletedCount).toBe(2);
    expect(data.failedCount).toBe(1);
    expect(data.message).toContain('2 files');
    expect(data.message).toContain('1 failed');

    // Verify only successful deletions are tracked
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "GhiNhanHoatDong"'),
      expect.arrayContaining([expect.arrayContaining(['record-0', 'record-2'])])
    );
  });

  it('handles R2 deletion errors', async () => {
    const files = [buildFileRecord(0)];
    (db.query as unknown as Mock).mockResolvedValue(files);

    (resolveFileSizes as unknown as Mock).mockResolvedValue({
      files: files.map((f) => ({ id: f.MaGhiNhan, url: f.FileMinhChungUrl, size: 1024 })),
      totalSizeBytes: 1024,
      missingCount: 0,
      r2Configured: true,
    });

    (r2Client.deleteFile as unknown as Mock).mockRejectedValue(
      new Error('R2 connection timeout')
    );

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.deletedCount).toBe(0);
    expect(data.failedCount).toBe(1);
  });

  it('creates audit log entry on errors', async () => {
    // Force error by rejecting db.query
    (db.query as unknown as Mock).mockRejectedValue(new Error('Database error'));

    const response = await POST(buildRequest(defaultBody));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Không thể xóa minh chứng. Vui lòng thử lại sau.',
      })
    );

    // Verify error audit log was created
    expect(nhatKyHeThongRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        HanhDong: 'DELETE_ARCHIVED_FILES_ERROR',
      })
    );
  });
});
