import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => {
  const query = vi.fn();
  const queryOne = vi.fn();

  return {
    db: {
      query,
      queryOne,
    },
  };
});

import { db } from '@/lib/db/client';
import { getCreditHistory } from '@/lib/db/credit-engine';

describe('credit-engine getCreditHistory', () => {
  beforeEach(() => {
    (db.query as any).mockReset();
  });

  it('returns 0 credits when evidence is required but missing', async () => {
    (db.query as any).mockResolvedValueOnce([
      {
        MaGhiNhan: 'record-1',
        TenHoatDong: 'Test Activity',
        LoaiHoatDong: 'Hội thảo',
        SoGioTinChiQuyDoi: 10,
        SoTiet: 5,
        NgayGhiNhan: new Date('2025-01-01'),
        TrangThaiDuyet: 'DaDuyet',
        GhiChu: null,
        FileMinhChungUrl: null,
        YeuCauMinhChung: true,
        GioToiThieu: null,
        GioToiDa: null,
        TyLeQuyDoi: 2,
      },
    ]);

    const history = await getCreditHistory('nv-1', new Date('2024-01-01'), new Date('2025-12-31'));

    expect(history).toHaveLength(1);
    expect(history[0].SoTinChi).toBe(0);
  });

  it('returns stored credits when evidence requirement is satisfied', async () => {
    (db.query as any).mockResolvedValueOnce([
      {
        MaGhiNhan: 'record-2',
        TenHoatDong: 'Test Activity',
        LoaiHoatDong: 'Hội thảo',
        SoGioTinChiQuyDoi: 8,
        SoTiet: 4,
        NgayGhiNhan: new Date('2025-02-01'),
        TrangThaiDuyet: 'DaDuyet',
        GhiChu: null,
        FileMinhChungUrl: 'https://example.com/proof.pdf',
        YeuCauMinhChung: true,
        GioToiThieu: null,
        GioToiDa: null,
        TyLeQuyDoi: 2,
      },
    ]);

    const history = await getCreditHistory('nv-1', new Date('2024-01-01'), new Date('2025-12-31'));

    expect(history[0].SoTinChi).toBe(8);
  });
});
