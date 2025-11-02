import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DanhMucHoatDong } from '@/lib/db/schemas';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: mocks.query,
    queryOne: mocks.queryOne,
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.delete,
    exists: vi.fn(),
    count: vi.fn(),
  },
}));

import { DanhMucHoatDongRepository } from '@/lib/db/repositories';

describe('DanhMucHoatDongRepository', () => {
  let repo: DanhMucHoatDongRepository;

  const mockGlobalActivity: DanhMucHoatDong = {
    MaDanhMuc: 'activity-global-1',
    TenDanhMuc: 'Hội thảo Y học Quốc gia',
    LoaiHoatDong: 'HoiThao',
    DonViTinh: 'gio',
    TyLeQuyDoi: 1.0,
    GioToiThieu: 4,
    GioToiDa: 40,
    YeuCauMinhChung: true,
    HieuLucTu: new Date('2025-01-01'),
    HieuLucDen: new Date('2025-12-31'),
    MaDonVi: null,
    NguoiTao: 'user-soyTe',
    NguoiCapNhat: null,
    TaoLuc: new Date(),
    CapNhatLuc: new Date(),
    TrangThai: 'Active',
    DaXoaMem: false,
  };

  const mockUnitActivity: DanhMucHoatDong = {
    ...mockGlobalActivity,
    MaDanhMuc: 'activity-unit-1',
    TenDanhMuc: 'Đào tạo nội bộ',
    MaDonVi: 'unit-123',
  };

  const mockSoftDeletedActivity: DanhMucHoatDong = {
    ...mockUnitActivity,
    MaDanhMuc: 'activity-deleted-1',
    DaXoaMem: true,
  };

  beforeEach(() => {
    repo = new DanhMucHoatDongRepository();
    mocks.query.mockReset();
    mocks.queryOne.mockReset();
    mocks.insert.mockReset();
    mocks.update.mockReset();
    mocks.delete.mockReset();
  });

  describe('findGlobal', () => {
    it('returns only global activities (MaDonVi IS NULL)', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity]);

      const result = await repo.findGlobal();

      expect(result).toEqual([mockGlobalActivity]);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "MaDonVi" IS NULL')
      );
    });

    it('excludes soft-deleted activities', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity]);

      await repo.findGlobal();

      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"DaXoaMem" = false')
      );
    });
  });

  describe('findByUnit', () => {
    it('returns only unit-specific activities', async () => {
      mocks.query.mockResolvedValueOnce([mockUnitActivity]);

      const result = await repo.findByUnit('unit-123');

      expect(result).toEqual([mockUnitActivity]);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "MaDonVi" = $1'),
        ['unit-123']
      );
    });

    it('excludes soft-deleted activities', async () => {
      mocks.query.mockResolvedValueOnce([mockUnitActivity]);

      await repo.findByUnit('unit-123');

      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"DaXoaMem" = false'),
        ['unit-123']
      );
    });
  });

  describe('findAccessible', () => {
    it('returns both global and unit activities', async () => {
      mocks.query
        .mockResolvedValueOnce([mockGlobalActivity])
        .mockResolvedValueOnce([mockUnitActivity]);

      const result = await repo.findAccessible('unit-123');

      expect(result).toEqual({
        global: [mockGlobalActivity],
        unit: [mockUnitActivity],
      });
      expect(mocks.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('findActive', () => {
    it('returns all active activities for SoYTe (no unitId)', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity, mockUnitActivity]);

      const result = await repo.findActive();

      expect(result).toHaveLength(2);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE')
      );
    });

    it('returns global + unit activities for DonVi', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity, mockUnitActivity]);

      const result = await repo.findActive('unit-123');

      expect(result).toHaveLength(2);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('("MaDonVi" IS NULL OR "MaDonVi" = $1)'),
        ['unit-123']
      );
    });

    it('excludes soft-deleted activities', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity]);

      await repo.findActive('unit-123');

      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"DaXoaMem" = false'),
        ['unit-123']
      );
    });
  });

  describe('findByType', () => {
    it('filters by activity type for SoYTe', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity]);

      const result = await repo.findByType('HoiThao');

      expect(result).toHaveLength(1);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"LoaiHoatDong" = $1'),
        ['HoiThao']
      );
    });

    it('filters by type and unit for DonVi', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity, mockUnitActivity]);

      const result = await repo.findByType('HoiThao', 'unit-123');

      expect(result).toHaveLength(2);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"LoaiHoatDong" = $1'),
        ['HoiThao', 'unit-123']
      );
    });
  });

  describe('createWithOwnership', () => {
    it('creates global activity with ownership tracking', async () => {
      mocks.insert.mockResolvedValueOnce(mockGlobalActivity);

      const result = await repo.createWithOwnership(
        {
          TenDanhMuc: 'New Activity',
          LoaiHoatDong: 'KhoaHoc',
          DonViTinh: 'gio',
          TyLeQuyDoi: 1.0,
          GioToiThieu: null,
          GioToiDa: null,
          YeuCauMinhChung: true,
          HieuLucTu: null,
          HieuLucDen: null,
        },
        'user-soyTe',
        null
      );

      expect(result).toEqual(mockGlobalActivity);
      expect(mocks.insert).toHaveBeenCalledWith(
        'DanhMucHoatDong',
        expect.objectContaining({
          MaDonVi: null,
          NguoiTao: 'user-soyTe',
          TrangThai: 'Active',
          DaXoaMem: false,
        })
      );
    });

    it('creates unit-specific activity', async () => {
      mocks.insert.mockResolvedValueOnce(mockUnitActivity);

      const result = await repo.createWithOwnership(
        {
          TenDanhMuc: 'Unit Activity',
          LoaiHoatDong: 'KhoaHoc',
          DonViTinh: 'gio',
          TyLeQuyDoi: 1.0,
          GioToiThieu: null,
          GioToiDa: null,
          YeuCauMinhChung: true,
          HieuLucTu: null,
          HieuLucDen: null,
        },
        'user-donVi',
        'unit-123'
      );

      expect(result).toEqual(mockUnitActivity);
      expect(mocks.insert).toHaveBeenCalledWith(
        'DanhMucHoatDong',
        expect.objectContaining({
          MaDonVi: 'unit-123',
          NguoiTao: 'user-donVi',
        })
      );
    });
  });

  describe('updateWithOwnership', () => {
    it('updates activity with updater tracking', async () => {
      mocks.update.mockResolvedValueOnce([mockGlobalActivity]);

      const result = await repo.updateWithOwnership(
        'activity-global-1',
        { TenDanhMuc: 'Updated Name' },
        'user-soyTe'
      );

      expect(result).toEqual(mockGlobalActivity);
      expect(mocks.update).toHaveBeenCalledWith(
        'DanhMucHoatDong',
        expect.objectContaining({
          TenDanhMuc: 'Updated Name',
          NguoiCapNhat: 'user-soyTe',
        }),
        { MaDanhMuc: 'activity-global-1' }
      );
    });

    it('returns null if activity not found', async () => {
      mocks.update.mockResolvedValueOnce([]);

      const result = await repo.updateWithOwnership(
        'non-existent',
        { TenDanhMuc: 'Updated' },
        'user-soyTe'
      );

      expect(result).toBeNull();
    });
  });

  describe('assertCanMutate', () => {
    it('allows SoYTe to mutate any activity', async () => {
      mocks.queryOne.mockResolvedValueOnce(mockGlobalActivity);

      const result = await repo.assertCanMutate('activity-global-1', 'SoYTe', null);

      expect(result.canMutate).toBe(true);
      expect(result.activity).toEqual(mockGlobalActivity);
    });

    it('allows DonVi to mutate their own unit activities', async () => {
      mocks.queryOne.mockResolvedValueOnce(mockUnitActivity);

      const result = await repo.assertCanMutate('activity-unit-1', 'DonVi', 'unit-123');

      expect(result.canMutate).toBe(true);
      expect(result.activity).toEqual(mockUnitActivity);
    });

    it('prevents DonVi from mutating global activities', async () => {
      mocks.queryOne.mockResolvedValueOnce(mockGlobalActivity);

      const result = await repo.assertCanMutate('activity-global-1', 'DonVi', 'unit-123');

      expect(result.canMutate).toBe(false);
      expect(result.reason).toBe('Cannot modify global activities');
    });

    it('prevents DonVi from mutating other unit activities', async () => {
      mocks.queryOne.mockResolvedValueOnce(mockUnitActivity);

      const result = await repo.assertCanMutate('activity-unit-1', 'DonVi', 'unit-456');

      expect(result.canMutate).toBe(false);
      expect(result.reason).toBe('Can only modify activities from your unit');
    });

    it('prevents mutation of soft-deleted activities', async () => {
      mocks.queryOne.mockResolvedValueOnce(mockSoftDeletedActivity);

      const result = await repo.assertCanMutate('activity-deleted-1', 'SoYTe', null);

      expect(result.canMutate).toBe(false);
      expect(result.reason).toBe('Cannot modify soft-deleted activity');
    });

    it('returns false if activity not found', async () => {
      mocks.queryOne.mockResolvedValueOnce(null);

      const result = await repo.assertCanMutate('non-existent', 'SoYTe', null);

      expect(result.canMutate).toBe(false);
      expect(result.reason).toBe('Activity not found');
    });

    it('prevents DonVi without unit assignment from mutating', async () => {
      mocks.queryOne.mockResolvedValueOnce(mockUnitActivity);

      const result = await repo.assertCanMutate('activity-unit-1', 'DonVi', null);

      expect(result.canMutate).toBe(false);
      expect(result.reason).toBe('User has no unit assigned');
    });

    it('prevents NguoiHanhNghe from mutating activities', async () => {
      mocks.queryOne.mockResolvedValueOnce(mockGlobalActivity);

      const result = await repo.assertCanMutate('activity-global-1', 'NguoiHanhNghe', null);

      expect(result.canMutate).toBe(false);
      expect(result.reason).toBe('Insufficient permissions');
    });
  });

  describe('softDelete', () => {
    it('soft deletes an activity', async () => {
      mocks.update.mockResolvedValueOnce([mockSoftDeletedActivity]);

      const result = await repo.softDelete('activity-unit-1', 'user-donVi');

      expect(result).toEqual(mockSoftDeletedActivity);
      expect(mocks.update).toHaveBeenCalledWith(
        'DanhMucHoatDong',
        expect.objectContaining({
          DaXoaMem: true,
          NguoiCapNhat: 'user-donVi',
        }),
        { MaDanhMuc: 'activity-unit-1' }
      );
    });

    it('returns null if activity not found', async () => {
      mocks.update.mockResolvedValueOnce([]);

      const result = await repo.softDelete('non-existent', 'user-soyTe');

      expect(result).toBeNull();
    });
  });

  describe('restore', () => {
    it('restores a soft-deleted activity', async () => {
      mocks.update.mockResolvedValueOnce([mockUnitActivity]);

      const result = await repo.restore('activity-deleted-1', 'user-soyTe');

      expect(result).toEqual(mockUnitActivity);
      expect(mocks.update).toHaveBeenCalledWith(
        'DanhMucHoatDong',
        expect.objectContaining({
          DaXoaMem: false,
          NguoiCapNhat: 'user-soyTe',
        }),
        { MaDanhMuc: 'activity-deleted-1' }
      );
    });
  });

  describe('adoptToGlobal', () => {
    it('converts unit activity to global by setting MaDonVi to null', async () => {
      mocks.update.mockResolvedValueOnce([mockGlobalActivity]);

      const result = await repo.adoptToGlobal('activity-unit-1', 'user-soyTe');

      expect(result).toEqual(mockGlobalActivity);
      expect(mocks.update).toHaveBeenCalledWith(
        'DanhMucHoatDong',
        expect.objectContaining({
          MaDonVi: null,
          NguoiCapNhat: 'user-soyTe',
        }),
        { MaDanhMuc: 'activity-unit-1' }
      );
    });
  });

  describe('findSoftDeleted', () => {
    it('returns all soft-deleted activities for SoYTe', async () => {
      mocks.query.mockResolvedValueOnce([mockSoftDeletedActivity]);

      const result = await repo.findSoftDeleted();

      expect(result).toEqual([mockSoftDeletedActivity]);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"DaXoaMem" = true')
      );
    });

    it('returns unit soft-deleted activities for DonVi', async () => {
      mocks.query.mockResolvedValueOnce([mockSoftDeletedActivity]);

      const result = await repo.findSoftDeleted('unit-123');

      expect(result).toEqual([mockSoftDeletedActivity]);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"DaXoaMem" = true'),
        ['unit-123']
      );
    });
  });

  describe('countReferences', () => {
    it('returns count of submissions referencing the activity', async () => {
      mocks.queryOne.mockResolvedValueOnce({ count: '5' });

      const result = await repo.countReferences('activity-global-1');

      expect(result).toBe(5);
      expect(mocks.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('FROM "GhiNhanHoatDong"'),
        ['activity-global-1']
      );
    });

    it('returns 0 if no references found', async () => {
      mocks.queryOne.mockResolvedValueOnce({ count: '0' });

      const result = await repo.countReferences('activity-unit-1');

      expect(result).toBe(0);
    });

    it('handles null result gracefully', async () => {
      mocks.queryOne.mockResolvedValueOnce(null);

      const result = await repo.countReferences('activity-unit-1');

      expect(result).toBe(0);
    });
  });
});
