/**
 * Batch Processor - Utilities for batched INSERT operations
 */

import { db } from '@/lib/db/client';

export interface BatchConfig {
  batchSize: number;
  onProgress?: (processed: number, total: number) => void;
}

export interface PractitionerBatchRow {
  hoVaTen: string;
  soCCHN: string;
  ngayCapCCHN: Date;
  maDonVi: string;
  trangThaiLamViec: string;
  chucDanh: string | null;
  maNhanVienNoiBo: string | null;
}

export interface ActivityBatchRow {
  maNhanVien: string;
  tenHoatDong: string;
  chiTietVaiTro: string | null;
  ngayBatDau: Date;
  soGioTinChiQuyDoi: number;
  nguoiNhap: string;
  trangThaiDuyet: string;
  ngayDuyet: Date | null;
  nguoiDuyet: string | null;
  ghiChuDuyet: string | null;
  fileMinhChungUrl: string | null;
}

export class BatchProcessor {
  /**
   * Batch insert practitioners with ON CONFLICT handling
   */
  static async batchInsertPractitioners(
    practitioners: PractitionerBatchRow[],
    config: BatchConfig
  ): Promise<Map<string, { id: string; isNew: boolean }>> {
    const results = new Map<string, { id: string; isNew: boolean }>();
    const { batchSize, onProgress } = config;

    for (let i = 0; i < practitioners.length; i += batchSize) {
      const batch = practitioners.slice(i, i + batchSize);
      
      // Build VALUES placeholders
      const valueGroups: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      batch.forEach((p) => {
        valueGroups.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
        );
        params.push(
          p.hoVaTen,
          p.soCCHN,
          p.ngayCapCCHN,
          p.maDonVi,
          p.trangThaiLamViec,
          p.chucDanh,
          p.maNhanVienNoiBo
        );
        paramIndex += 7;
      });

      const sql = `
        INSERT INTO "NhanVien" (
          "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi",
          "TrangThaiLamViec", "ChucDanh", "MaNhanVienNoiBo"
        ) VALUES ${valueGroups.join(', ')}
        ON CONFLICT ("SoCCHN") DO UPDATE SET
          "HoVaTen" = EXCLUDED."HoVaTen",
          "NgayCapCCHN" = EXCLUDED."NgayCapCCHN",
          "ChucDanh" = EXCLUDED."ChucDanh",
          "TrangThaiLamViec" = EXCLUDED."TrangThaiLamViec",
          "MaNhanVienNoiBo" = EXCLUDED."MaNhanVienNoiBo"
        WHERE "NhanVien"."MaDonVi" = EXCLUDED."MaDonVi"
        RETURNING "MaNhanVien", "SoCCHN", (xmax = 0) AS is_new
      `;

      const result = await db.query<{
        MaNhanVien: string;
        SoCCHN: string;
        is_new: boolean;
      }>(sql, params);

      // Map results back
      result.forEach((row) => {
        results.set(row.SoCCHN, {
          id: row.MaNhanVien,
          isNew: row.is_new
        });
      });

      // Report progress
      const processed = Math.min(i + batchSize, practitioners.length);
      onProgress?.(processed, practitioners.length);
    }

    return results;
  }

  /**
   * Batch insert activities
   */
  static async batchInsertActivities(
    activities: ActivityBatchRow[],
    config: BatchConfig
  ): Promise<number> {
    let totalInserted = 0;
    const { batchSize, onProgress } = config;

    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);

      // Build VALUES placeholders
      const valueGroups: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      batch.forEach((a) => {
        valueGroups.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`
        );
        params.push(
          a.maNhanVien,
          a.tenHoatDong,
          a.chiTietVaiTro,
          a.ngayBatDau,
          a.soGioTinChiQuyDoi,
          a.nguoiNhap,
          a.trangThaiDuyet,
          a.ngayDuyet,
          a.nguoiDuyet,
          a.ghiChuDuyet,
          a.fileMinhChungUrl
        );
        paramIndex += 11;
      });

      const sql = `
        INSERT INTO "GhiNhanHoatDong" (
          "MaNhanVien", "TenHoatDong", "ChiTietVaiTro", "NgayBatDau",
          "SoGioTinChiQuyDoi", "NguoiNhap", "TrangThaiDuyet", "NgayDuyet",
          "NguoiDuyet", "GhiChuDuyet", "FileMinhChungUrl"
        ) VALUES ${valueGroups.join(', ')}
      `;

      await db.query(sql, params);
      totalInserted += batch.length;

      // Report progress
      const processed = Math.min(i + batchSize, activities.length);
      onProgress?.(processed, activities.length);
    }

    return totalInserted;
  }

  /**
   * Batch insert compliance cycles
   */
  static async batchInsertCycles(
    cycles: Array<{
      maNhanVien: string;
      ngayBatDau: Date;
      ngayKetThuc: Date;
      soTinChiYeuCau: number;
      trangThai: string;
    }>,
    config: BatchConfig
  ): Promise<number> {
    if (cycles.length === 0) return 0;

    let totalInserted = 0;
    const { batchSize } = config;

    for (let i = 0; i < cycles.length; i += batchSize) {
      const batch = cycles.slice(i, i + batchSize);

      // Build VALUES placeholders
      const valueGroups: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      batch.forEach((c) => {
        valueGroups.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`
        );
        params.push(
          c.maNhanVien,
          c.ngayBatDau,
          c.ngayKetThuc,
          c.soTinChiYeuCau,
          c.trangThai
        );
        paramIndex += 5;
      });

      const sql = `
        INSERT INTO "KyCNKT" (
          "MaNhanVien", "NgayBatDau", "NgayKetThuc",
          "SoTinChiYeuCau", "TrangThai"
        ) VALUES ${valueGroups.join(', ')}
        ON CONFLICT DO NOTHING
      `;

      const result = await db.query(sql, params);
      totalInserted += batch.length;
    }

    return totalInserted;
  }
}
