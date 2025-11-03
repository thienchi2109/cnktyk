import { describe, it, expect } from 'vitest';
import { CreateDanhMucHoatDongSchema } from '@/lib/db/schemas';

describe('CreateDanhMucHoatDongSchema', () => {
  it('coerces ISO date strings to Date instances', () => {
    const result = CreateDanhMucHoatDongSchema.parse({
      TenDanhMuc: 'Test activity',
      LoaiHoatDong: 'KhoaHoc',
      DonViTinh: 'gio',
      TyLeQuyDoi: 1,
      GioToiThieu: null,
      GioToiDa: null,
      YeuCauMinhChung: true,
      HieuLucTu: '2025-01-01',
      HieuLucDen: null,
      MaDonVi: null,
      TrangThai: 'Active',
    });

    expect(result.HieuLucTu).toBeInstanceOf(Date);
    expect(result.HieuLucTu?.toISOString()).toContain('2025-01-01');
    expect(result.HieuLucDen).toBeNull();
  });
});
