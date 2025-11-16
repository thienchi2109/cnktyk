import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/repositories', () => ({
  saoLuuMinhChungRepo: {
    findByUser: vi.fn(),
  },
  xoaMinhChungRepo: {
    findByUser: vi.fn(),
  },
}));

import { GET } from '@/app/api/backup/dashboard/route';
import { getCurrentUser } from '@/lib/auth/server';
import { saoLuuMinhChungRepo, xoaMinhChungRepo } from '@/lib/db/repositories';

const soyteUser = {
  id: 'user-soyte',
  username: 'soyte@example.com',
  role: 'SoYTe' as const,
};

const mockBackup = (index: number) => ({
  MaSaoLuu: `backup-${index}`,
  NgayBatDau: new Date('2024-01-01'),
  NgayKetThuc: new Date('2024-03-01'),
  TongSoTep: 100,
  DungLuong: 1024 * 1024 * 10, // 10MB
  TrangThai: 'HoanThanh' as const,
  GhiChu: null,
  NgayTao: new Date('2024-03-02'),
});

const mockDeletion = (index: number) => ({
  MaXoa: `deletion-${index}`,
  NgayBatDau: new Date('2024-01-01'),
  NgayKetThuc: new Date('2024-03-01'),
  TongSoTep: 100,
  SoTepThanhCong: 95,
  SoTepThatBai: 5,
  DungLuongGiaiPhong: 1024 * 1024 * 8, // 8MB
  NgayThucHien: new Date('2024-03-03'),
  GhiChu: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as unknown as Mock).mockResolvedValue(soyteUser);
});

describe('GET /api/backup/dashboard', () => {
  it('returns 401 when user is unauthenticated', async () => {
    (getCurrentUser as unknown as Mock).mockResolvedValueOnce(null);

    const response = await GET();

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

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Chỉ tài khoản Sở Y tế mới có quyền xem trung tâm sao lưu.',
      })
    );
  });

  it('returns dashboard data with backups and deletions', async () => {
    const backups = [mockBackup(1), mockBackup(2)];
    const deletions = [mockDeletion(1)];

    (saoLuuMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(backups);
    (xoaMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(deletions);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('recentBackups');
    expect(data).toHaveProperty('recentDeletions');
    expect(data).toHaveProperty('summary');

    expect(data.recentBackups).toHaveLength(2);
    expect(data.recentDeletions).toHaveLength(1);

    // Check backup structure
    expect(data.recentBackups[0]).toMatchObject({
      id: 'backup-1',
      totalFiles: 100,
      totalBytes: 1024 * 1024 * 10,
      status: 'HoanThanh',
    });

    // Check deletion structure
    expect(data.recentDeletions[0]).toMatchObject({
      id: 'deletion-1',
      totalFiles: 100,
      deletedFiles: 95,
      failedFiles: 5,
      freedBytes: 1024 * 1024 * 8,
    });

    // Check summary calculations
    expect(data.summary).toMatchObject({
      totalBackups: 2,
      totalDeletions: 1,
      totalBackedUpBytes: 1024 * 1024 * 20, // 10MB * 2
      totalFreedBytes: 1024 * 1024 * 8,
    });
  });

  it('returns empty arrays when no backups or deletions exist', async () => {
    (saoLuuMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue([]);
    (xoaMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.recentBackups).toHaveLength(0);
    expect(data.recentDeletions).toHaveLength(0);
    expect(data.summary).toMatchObject({
      totalBackups: 0,
      totalDeletions: 0,
      totalBackedUpBytes: 0,
      totalFreedBytes: 0,
      lastBackupAt: null,
      lastDeletionAt: null,
    });
  });

  it('fetches limited number of recent items', async () => {
    const backups = Array.from({ length: 10 }, (_, i) => mockBackup(i));
    const deletions = Array.from({ length: 10 }, (_, i) => mockDeletion(i));

    (saoLuuMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(backups);
    (xoaMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(deletions);

    await GET();

    // Verify it requested only 6 items (RECENT_LIMIT constant)
    expect(saoLuuMinhChungRepo.findByUser).toHaveBeenCalledWith(soyteUser.id, 6);
    expect(xoaMinhChungRepo.findByUser).toHaveBeenCalledWith(soyteUser.id, 6);
  });

  it('handles null byte values gracefully', async () => {
    const backups = [
      {
        ...mockBackup(1),
        DungLuong: null,
      },
    ];
    const deletions = [
      {
        ...mockDeletion(1),
        DungLuongGiaiPhong: null,
      },
    ];

    (saoLuuMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(backups);
    (xoaMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(deletions);

    const response = await GET();
    const data = await response.json();

    expect(data.recentBackups[0].totalBytes).toBe(0);
    expect(data.recentDeletions[0].freedBytes).toBe(0);
    expect(data.summary.totalBackedUpBytes).toBe(0);
    expect(data.summary.totalFreedBytes).toBe(0);
  });

  it('sets lastBackupAt and lastDeletionAt to most recent timestamps', async () => {
    const backups = [
      { ...mockBackup(1), NgayTao: new Date('2024-03-05') },
      { ...mockBackup(2), NgayTao: new Date('2024-03-01') },
    ];
    const deletions = [
      { ...mockDeletion(1), NgayThucHien: new Date('2024-03-04') },
      { ...mockDeletion(2), NgayThucHien: new Date('2024-03-02') },
    ];

    (saoLuuMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(backups);
    (xoaMinhChungRepo.findByUser as unknown as Mock).mockResolvedValue(deletions);

    const response = await GET();
    const data = await response.json();

    // First item should be the most recent
    expect(data.summary.lastBackupAt).toBe(new Date('2024-03-05').toISOString());
    expect(data.summary.lastDeletionAt).toBe(new Date('2024-03-04').toISOString());
  });
});
