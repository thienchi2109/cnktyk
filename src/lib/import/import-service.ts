/**
 * Import Service - Handles database operations for bulk import
 */

import { db } from '@/lib/db/client';
import { PractitionerRow, ActivityRow } from './excel-processor';
import { 
  BatchProcessor, 
  PractitionerBatchRow, 
  ActivityBatchRow 
} from './batch-processor';

export interface ImportResult {
  practitionersCreated: number;
  practitionersUpdated: number;
  activitiesCreated: number;
  cyclesCreated: number;
  errors: string[];
  metrics?: {
    validationTime: number;
    practitionersTime: number;
    activitiesTime: number;
    totalTime: number;
    recordsPerSecond: number;
  };
}

export type ProgressPhase = 'validation' | 'practitioners' | 'activities' | 'audit';

export interface ProgressEvent {
  phase: ProgressPhase;
  processed: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentBatch?: number;
  totalBatches?: number;
}

export interface ImportOptions {
  batchSize?: number;
  onProgress?: (event: ProgressEvent) => void;
}

export class ImportService {
  /**
   * Execute full import with transaction and progress tracking
   */
  async executeImport(
    practitioners: PractitionerRow[],
    activities: ActivityRow[],
    unitId: string,
    userId: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const batchSize = options.batchSize || Number(process.env.IMPORT_BATCH_SIZE) || 100;
    const startTime = performance.now();
    const result: ImportResult = {
      practitionersCreated: 0,
      practitionersUpdated: 0,
      activitiesCreated: 0,
      cyclesCreated: 0,
      errors: [],
      metrics: {
        validationTime: 0,
        practitionersTime: 0,
        activitiesTime: 0,
        totalTime: 0,
        recordsPerSecond: 0
      }
    };

    try {
      // Start transaction with extended timeout
      const timeoutMs = Number(process.env.IMPORT_TIMEOUT_MS) || 120000;
      await db.query('BEGIN');
      await db.query(`SET statement_timeout = ${timeoutMs}`);

      // Phase 1: Import practitioners with batching
      const practitionersStart = performance.now();
      const practitionerMap = new Map<string, string>(); // CCHN -> MaNhanVien
      const cyclesToCreate: Array<{
        maNhanVien: string;
        ngayBatDau: Date;
        ngayKetThuc: Date;
        soTinChiYeuCau: number;
        trangThai: string;
      }> = [];

      // Check cross-unit conflicts first
      const crossUnitConflicts = new Set<string>();
      if (practitioners.length > 0) {
        const cchnList = practitioners.map(p => p.soCCHN).filter(Boolean);
        if (cchnList.length > 0) {
          const conflictResult = await db.query<{ SoCCHN: string; MaDonVi: string }>(
            `SELECT "SoCCHN", "MaDonVi" FROM "NhanVien" WHERE "SoCCHN" = ANY($1)`,
            [cchnList]
          );
          conflictResult.forEach(row => {
            if (row.MaDonVi !== unitId) {
              crossUnitConflicts.add(row.SoCCHN);
            }
          });
        }
      }

      // Filter out cross-unit conflicts and prepare batch rows
      const validPractitioners: PractitionerBatchRow[] = [];
      for (const p of practitioners) {
        // Skip cross-unit conflicts
        if (crossUnitConflicts.has(p.soCCHN)) {
          const maskedCCHN = p.soCCHN.slice(-4).padStart(p.soCCHN.length, '*');
          result.errors.push(`Bỏ qua dòng ${p.rowNumber}: Số CCHN thuộc đơn vị khác`);
          
          // Audit log for cross-unit conflict
          await db.query(
            `INSERT INTO "NhatKyHeThong" (
              "MaTaiKhoan", "HanhDong", "Bang", "NoiDung"
            ) VALUES ($1, $2, $3, $4)`,
            [
              userId,
              'IMPORT_SKIPPED_CROSS_UNIT',
              'NhanVien',
              JSON.stringify({
                maskedSoCCHN: maskedCCHN,
                attemptedUnitId: unitId,
                rowNumber: p.rowNumber,
                timestamp: new Date().toISOString()
              })
            ]
          );
          continue;
        }

        // Build ChucDanh from ChucVu and KhoaPhong
        let chucDanh = '';
        if (p.chucVu && p.khoaPhong) {
          chucDanh = `${p.chucVu} - ${p.khoaPhong}`;
        } else if (p.chucVu) {
          chucDanh = p.chucVu;
        } else if (p.khoaPhong) {
          chucDanh = p.khoaPhong;
        }

        validPractitioners.push({
          hoVaTen: p.hoVaTen,
          soCCHN: p.soCCHN,
          ngayCapCCHN: p.ngayCapCCHN,
          maDonVi: unitId,
          trangThaiLamViec: p.trangThaiLamViec || 'DangLamViec',
          chucDanh: chucDanh || null,
          maNhanVienNoiBo: (p.maNhanVien && p.maNhanVien.trim() !== '') ? p.maNhanVien.trim() : null
        });
      }

      // Batch insert practitioners
      const totalBatches = Math.ceil(validPractitioners.length / batchSize);
      let currentBatch = 0;
      const startProcessTime = performance.now();

      const insertResults = await BatchProcessor.batchInsertPractitioners(
        validPractitioners,
        {
          batchSize,
          onProgress: (processed, total) => {
            currentBatch = Math.ceil(processed / batchSize);
            const elapsed = performance.now() - startProcessTime;
            const rate = processed / (elapsed / 1000);
            const remaining = total - processed;
            const estimatedTimeRemaining = remaining > 0 ? (remaining / rate) * 1000 : 0;

            options.onProgress?.({
              phase: 'practitioners',
              processed,
              total,
              percentage: Math.round((processed / total) * 100),
              estimatedTimeRemaining: estimatedTimeRemaining > 0 ? Math.round(estimatedTimeRemaining) : undefined,
              currentBatch,
              totalBatches
            });
          }
        }
      );

      // Map results and count created/updated
      insertResults.forEach((value, cchn) => {
        practitionerMap.set(cchn, value.id);
        if (value.isNew) {
          result.practitionersCreated++;
          
          // Prepare cycle for batch insert
          const currentYear = new Date().getFullYear();
          cyclesToCreate.push({
            maNhanVien: value.id,
            ngayBatDau: new Date(currentYear, 0, 1),
            ngayKetThuc: new Date(currentYear + 5, 11, 31),
            soTinChiYeuCau: 120,
            trangThai: 'DangDienRa'
          });
        } else {
          result.practitionersUpdated++;
        }
      });

      // Batch insert cycles
      if (cyclesToCreate.length > 0) {
        await BatchProcessor.batchInsertCycles(cyclesToCreate, { batchSize });
        result.cyclesCreated = cyclesToCreate.length;
      }

      result.metrics!.practitionersTime = performance.now() - practitionersStart;

      // Phase 2: Import activities with batching
      const activitiesStart = performance.now();
      const validActivities: ActivityBatchRow[] = [];

      // Lookup missing practitioner IDs
      const missingCCHNs = new Set<string>();
      activities.forEach(a => {
        if (!practitionerMap.has(a.soCCHN)) {
          missingCCHNs.add(a.soCCHN);
        }
      });

      if (missingCCHNs.size > 0) {
        const lookupResult = await db.query<{ MaNhanVien: string; SoCCHN: string }>(
          `SELECT "MaNhanVien", "SoCCHN" FROM "NhanVien" 
           WHERE "SoCCHN" = ANY($1) AND "MaDonVi" = $2`,
          [Array.from(missingCCHNs), unitId]
        );
        lookupResult.forEach(row => {
          practitionerMap.set(row.SoCCHN, row.MaNhanVien);
        });
      }

      // Prepare activity batch rows
      for (const a of activities) {
        const maNhanVien = practitionerMap.get(a.soCCHN);

        if (!maNhanVien) {
          result.errors.push(
            `Lỗi dòng ${a.rowNumber}: Không tìm thấy nhân viên với Số CCHN "${a.soCCHN}" trong đơn vị`
          );
          continue;
        }

        const nguoiDuyet = ['DaDuyet', 'TuChoi'].includes(a.trangThaiDuyet) ? userId : null;

        validActivities.push({
          maNhanVien,
          tenHoatDong: a.tenHoatDong,
          hinhThucCapNhatKienThucYKhoa: a.hinhThucCapNhatKienThucYKhoa || null,
          chiTietVaiTro: a.chiTietVaiTro || null,
          donViToChuc: a.donViToChuc || null,
          ngayBatDau: a.ngayBatDau,
          ngayKetThuc: a.ngayKetThuc || null,
          soTiet: a.soTiet || null,
          soGioTinChiQuyDoi: a.soTinChi,
          bangChungSoGiayChungNhan: a.bangChungSoGiayChungNhan || null,
          nguoiNhap: userId,
          trangThaiDuyet: a.trangThaiDuyet,
          ngayDuyet: a.ngayDuyet || null,
          nguoiDuyet,
          ghiChuDuyet: a.ghiChuDuyet || null,
          fileMinhChungUrl: a.urlMinhChung || null
        });
      }

      // Batch insert activities
      const activitiesStartProcess = performance.now();
      const activityTotalBatches = Math.ceil(validActivities.length / batchSize);
      let activityCurrentBatch = 0;

      result.activitiesCreated = await BatchProcessor.batchInsertActivities(
        validActivities,
        {
          batchSize,
          onProgress: (processed, total) => {
            activityCurrentBatch = Math.ceil(processed / batchSize);
            const elapsed = performance.now() - activitiesStartProcess;
            const rate = processed / (elapsed / 1000);
            const remaining = total - processed;
            const estimatedTimeRemaining = remaining > 0 ? (remaining / rate) * 1000 : 0;

            options.onProgress?.({
              phase: 'activities',
              processed,
              total,
              percentage: Math.round((processed / total) * 100),
              estimatedTimeRemaining: estimatedTimeRemaining > 0 ? Math.round(estimatedTimeRemaining) : undefined,
              currentBatch: activityCurrentBatch,
              totalBatches: activityTotalBatches
            });
          }
        }
      );

      result.metrics!.activitiesTime = performance.now() - activitiesStart;

      // Phase 3: Audit trail
      options.onProgress?.({
        phase: 'audit',
        processed: 1,
        total: 1,
        percentage: 100
      });

      // Calculate final metrics
      result.metrics!.totalTime = performance.now() - startTime;
      const totalRecords = result.practitionersCreated + result.practitionersUpdated + result.activitiesCreated;
      result.metrics!.recordsPerSecond = totalRecords / (result.metrics!.totalTime / 1000);

      // Log audit trail with metrics
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
            metrics: result.metrics,
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
