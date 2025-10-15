/**
 * Import Service - Handles database operations for bulk import
 */

import { db } from '@/lib/db/client';
import { PractitionerRow, ActivityRow } from './excel-processor';

export interface ImportResult {
  practitionersCreated: number;
  practitionersUpdated: number;
  activitiesCreated: number;
  cyclesCreated: number;
  errors: string[];
}

export class ImportService {
  /**
   * Execute full import with transaction
   */
  async executeImport(
    practitioners: PractitionerRow[],
    activities: ActivityRow[],
    unitId: string,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      practitionersCreated: 0,
      practitionersUpdated: 0,
      activitiesCreated: 0,
      cyclesCreated: 0,
      errors: []
    };

    try {
      // Start transaction
      await db.query('BEGIN');

      // Import practitioners
      const practitionerMap = new Map<string, string>(); // CCHN -> MaNhanVien

      for (const p of practitioners) {
        try {
          // Build ChucDanh from ChucVu and KhoaPhong
          let chucDanh = '';
          if (p.chucVu && p.khoaPhong) {
            chucDanh = `${p.chucVu} - ${p.khoaPhong}`;
          } else if (p.chucVu) {
            chucDanh = p.chucVu;
          } else if (p.khoaPhong) {
            chucDanh = p.khoaPhong;
          }

          // Upsert practitioner
          const practitionerResult = await db.query<{ MaNhanVien: string; is_new: boolean }>(
            `
            INSERT INTO "NhanVien" (
              "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi", 
              "TrangThaiLamViec", "ChucDanh"
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT ("SoCCHN") DO UPDATE SET
              "HoVaTen" = EXCLUDED."HoVaTen",
              "NgayCapCCHN" = EXCLUDED."NgayCapCCHN",
              "ChucDanh" = EXCLUDED."ChucDanh",
              "MaDonVi" = EXCLUDED."MaDonVi"
            RETURNING "MaNhanVien", 
              (xmax = 0) AS is_new
            `,
            [
              p.hoVaTen,
              p.soCCHN,
              p.ngayCapCCHN,
              unitId,
              'DangLamViec',
              chucDanh || null
            ]
          );

          const practitioner = practitionerResult[0];
          practitionerMap.set(p.soCCHN, practitioner.MaNhanVien);

          if (practitioner.is_new) {
            result.practitionersCreated++;
          } else {
            result.practitionersUpdated++;
          }

          // Create default compliance cycle if new practitioner
          if (practitioner.is_new) {
            const currentYear = new Date().getFullYear();
            const cycleStart = new Date(currentYear, 0, 1); // Jan 1
            const cycleEnd = new Date(currentYear + 5, 11, 31); // Dec 31, 5 years later

            await db.query(
              `
              INSERT INTO "KyCNKT" (
                "MaNhanVien", "NgayBatDau", "NgayKetThuc", 
                "SoTinChiYeuCau", "TrangThai"
              ) VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT DO NOTHING
              `,
              [
                practitioner.MaNhanVien,
                cycleStart,
                cycleEnd,
                120,
                'DangDienRa'
              ]
            );

            result.cyclesCreated++;
          }
        } catch (error) {
          result.errors.push(
            `Lỗi khi nhập nhân viên dòng ${p.rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Import activities
      for (const a of activities) {
        try {
          // Get practitioner ID
          let maNhanVien = practitionerMap.get(a.soCCHN);

          // If not in imported practitioners, look up in database
          if (!maNhanVien) {
            const lookupResult = await db.query<{ MaNhanVien: string }>(
              `SELECT "MaNhanVien" FROM "NhanVien" WHERE "SoCCHN" = $1`,
              [a.soCCHN]
            );

            if (lookupResult.length === 0) {
              result.errors.push(
                `Lỗi dòng ${a.rowNumber}: Không tìm thấy nhân viên với Số CCHN "${a.soCCHN}"`
              );
              continue;
            }

            maNhanVien = lookupResult[0].MaNhanVien;
          }

          // Determine NguoiDuyet based on status
          const nguoiDuyet = ['DaDuyet', 'TuChoi'].includes(a.trangThaiDuyet) ? userId : null;

          // Insert activity
          await db.query(
            `
            INSERT INTO "GhiNhanHoatDong" (
              "MaNhanVien", "TenHoatDong", "ChiTietVaiTro", "NgayBatDau",
              "SoGioTinChiQuyDoi", "NguoiNhap", "TrangThaiDuyet", "NgayDuyet",
              "NguoiDuyet", "GhiChuDuyet", "FileMinhChungUrl"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `,
            [
              maNhanVien,
              a.tenHoatDong,
              a.vaiTro || null,
              a.ngayHoatDong,
              a.soTinChi,
              userId,
              a.trangThaiDuyet,
              a.ngayDuyet || null,
              nguoiDuyet,
              a.ghiChuDuyet || null,
              a.urlMinhChung || null
            ]
          );

          result.activitiesCreated++;
        } catch (error) {
          result.errors.push(
            `Lỗi khi nhập hoạt động dòng ${a.rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Log audit trail
      await db.query(
        `
        INSERT INTO "NhatKyHeThong" (
          "MaTaiKhoan", "HanhDong", "Bang", "NoiDung"
        ) VALUES ($1, $2, $3, $4)
        `,
        [
          userId,
          'BULK_IMPORT',
          'NhanVien,GhiNhanHoatDong',
          JSON.stringify({
            practitionersCreated: result.practitionersCreated,
            practitionersUpdated: result.practitionersUpdated,
            activitiesCreated: result.activitiesCreated,
            cyclesCreated: result.cyclesCreated,
            timestamp: new Date().toISOString()
          })
        ]
      );

      // Commit transaction
      await db.query('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      throw error;
    }
  }
}
