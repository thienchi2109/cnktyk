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
  cyclesCreated: number;
  errors: string[];
  metrics?: {
    validationTime: number;
    practitionersTime: number;
    totalTime: number;
    recordsPerSecond: number;
  };
}

export type ProgressPhase = 'validation' | 'practitioners' | 'audit';

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
   * Execute practitioners import with transaction and progress tracking
   * Note: Activities are now handled via separate bulk-submission feature
   */
  async executeImport(
    practitioners: PractitionerRow[],
    unitId: string,
    userId: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const batchSize = options.batchSize || Number(process.env.IMPORT_BATCH_SIZE) || 100;
    const startTime = performance.now();
    const result: ImportResult = {
      practitionersCreated: 0,
      practitionersUpdated: 0,
      cyclesCreated: 0,
      errors: [],
      metrics: {
        validationTime: 0,
        practitionersTime: 0,
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

        // Map fields directly - no combining of ChucVu and KhoaPhong
        validPractitioners.push({
          hoVaTen: p.hoVaTen,
          soCCHN: p.soCCHN,
          ngayCapCCHN: p.ngayCapCCHN,
          maDonVi: unitId,
          trangThaiLamViec: p.trangThaiLamViec || 'DangLamViec',
          chucDanh: p.chucVu || null,  // Column F: Chức vụ → ChucDanh
          maNhanVienNoiBo: (p.maNhanVien && p.maNhanVien.trim() !== '') ? p.maNhanVien.trim() : null,
          // Extended fields from Excel template
          ngaySinh: p.ngaySinh || null,           // Column C: Ngày sinh
          gioiTinh: p.gioiTinh || null,           // Column D: Giới tính
          khoaPhong: p.khoaPhong || null,         // Column E: Khoa/Phòng → KhoaPhong
          noiCapCCHN: p.noiCap || null,           // Column I: Nơi cấp
          phamViChuyenMon: p.phamViChuyenMon || null  // Column J: Phạm vi chuyên môn
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

      // Phase 2: Audit trail
      options.onProgress?.({
        phase: 'audit',
        processed: 1,
        total: 1,
        percentage: 100
      });

      // Calculate final metrics
      result.metrics!.totalTime = performance.now() - startTime;
      const totalRecords = result.practitionersCreated + result.practitionersUpdated;
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
          'BULK_IMPORT_PRACTITIONERS',
          'NhanVien',
          JSON.stringify({
            practitionersCreated: result.practitionersCreated,
            practitionersUpdated: result.practitionersUpdated,
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
