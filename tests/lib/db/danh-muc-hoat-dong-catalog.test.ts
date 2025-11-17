import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DanhMucHoatDong } from '@/lib/db/schemas';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: mocks.query,
    queryOne: mocks.queryOne,
  },
}));

import { DanhMucHoatDongRepository } from '@/lib/db/repositories';

describe('DanhMucHoatDongRepository catalog filtering', () => {
  let repo: DanhMucHoatDongRepository;

  const mockGlobalActivity: DanhMucHoatDong = {
    MaDanhMuc: 'catalog-global-1',
    TenDanhMuc: 'Global Activity',
    LoaiHoatDong: 'HoiThao',
    DonViTinh: 'gio',
    TyLeQuyDoi: 1,
    GioToiThieu: null,
    GioToiDa: null,
    YeuCauMinhChung: false,
    HieuLucTu: null,
    HieuLucDen: null,
    MaDonVi: null,
    NguoiTao: 'soyte-1',
    NguoiCapNhat: null,
    TaoLuc: new Date(),
    CapNhatLuc: new Date(),
    TrangThai: 'Active',
    DaXoaMem: false,
  };

  const mockUnitActivity: DanhMucHoatDong = {
    ...mockGlobalActivity,
    MaDanhMuc: 'catalog-unit-1',
    TenDanhMuc: 'Unit Activity',
    LoaiHoatDong: 'KhoaHoc',
    MaDonVi: 'unit-1',
  };

  beforeEach(() => {
    repo = new DanhMucHoatDongRepository();
    mocks.query.mockReset();
    mocks.queryOne.mockReset();
  });

  describe('filterGlobalCatalog', () => {
    it('applies search and pagination', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity]);
      mocks.queryOne.mockResolvedValueOnce({ count: 1 });

      const result = await repo.filterGlobalCatalog({ search: 'Global', limit: 20, offset: 0 });

      expect(result.items).toEqual([mockGlobalActivity]);
      expect(result.total).toBe(1);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining(['%Global%', 20, 0])
      );
      expect(mocks.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)::int as count'),
        expect.arrayContaining(['%Global%'])
      );
    });

    it('filters by status condition', async () => {
      mocks.query.mockResolvedValueOnce([mockGlobalActivity]);
      mocks.queryOne.mockResolvedValueOnce({ count: 1 });

      await repo.filterGlobalCatalog({ status: 'expired' });

      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"HieuLucDen" IS NOT NULL AND "HieuLucDen" < CURRENT_DATE'),
        expect.any(Array)
      );
    });
  });

  describe('filterUnitCatalog', () => {
    it('throws when unitId missing for scoped query', async () => {
      await expect(repo.filterUnitCatalog({ limit: 5 })).rejects.toThrow('unitId is required');
    });

    it('filters for a specific unit with pagination', async () => {
      mocks.query.mockResolvedValueOnce([mockUnitActivity]);
      mocks.queryOne.mockResolvedValueOnce({ count: 1 });

      const result = await repo.filterUnitCatalog({ unitId: 'unit-1', limit: 10, offset: 10 });

      expect(result.items).toEqual([mockUnitActivity]);
      expect(result.total).toBe(1);
      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"MaDonVi" = $1'),
        expect.arrayContaining(['unit-1', 10, 10])
      );
    });

    it('includes all units when requested by SoYTe', async () => {
      mocks.query.mockResolvedValueOnce([mockUnitActivity]);
      mocks.queryOne.mockResolvedValueOnce({ count: 1 });

      await repo.filterUnitCatalog({ includeAllUnits: true, limit: 5 });

      expect(mocks.query).toHaveBeenCalledWith(
        expect.stringContaining('"MaDonVi" IS NOT NULL'),
        expect.any(Array)
      );
    });
  });
});
