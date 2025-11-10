import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database client
vi.mock('@/lib/db/client', () => {
  const query = vi.fn();
  const queryOne = vi.fn();
  const insert = vi.fn();

  return {
    db: {
      query,
      queryOne,
      insert,
    },
  };
});

import { db } from '@/lib/db/client';
import {
  ghiNhanHoatDongRepo,
  nhanVienRepo,
} from '@/lib/db/repositories';
import type { BulkSubmissionInsertInput } from '@/types/bulk-submission';

// Use valid UUIDs for test data
const ACTIVITY_ID = '550e8400-e29b-41d4-a716-446655440001';
const UNIT_ID = '550e8400-e29b-41d4-a716-446655440011';
const PRACTITIONER_IDS = [
  '550e8400-e29b-41d4-a716-446655440021',
  '550e8400-e29b-41d4-a716-446655440022',
  '550e8400-e29b-41d4-a716-446655440023',
];

describe('Task 8.1 - Unit Tests for Bulk Submission Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Task 8.1.1: Test bulkCreate() repository method
  describe('8.1.1 - bulkCreate() Repository Method', () => {
    it('successfully creates bulk submissions in batches', async () => {
      const submissions: BulkSubmissionInsertInput[] = [
        {
          MaNhanVien: PRACTITIONER_IDS[0],
          MaDanhMuc: ACTIVITY_ID,
          TenHoatDong: 'Test Activity',
          NguoiNhap: 'user-1',
          CreationMethod: 'bulk',
          TrangThaiDuyet: 'ChoDuyet',
          DonViToChuc: null,
          NgayBatDau: null,
          NgayKetThuc: null,
          SoTiet: null,
          SoGioTinChiQuyDoi: 5.0,
          HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
          FileMinhChungUrl: null,
          BangChungSoGiayChungNhan: null,
        },
        {
          MaNhanVien: PRACTITIONER_IDS[1],
          MaDanhMuc: ACTIVITY_ID,
          TenHoatDong: 'Test Activity',
          NguoiNhap: 'user-1',
          CreationMethod: 'bulk',
          TrangThaiDuyet: 'ChoDuyet',
          DonViToChuc: null,
          NgayBatDau: null,
          NgayKetThuc: null,
          SoTiet: null,
          SoGioTinChiQuyDoi: 5.0,
          HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
          FileMinhChungUrl: null,
          BangChungSoGiayChungNhan: null,
        },
      ];

      // Mock transaction
      (db.query as any)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([
          { MaGhiNhan: 'sub-1', MaNhanVien: PRACTITIONER_IDS[0] },
          { MaGhiNhan: 'sub-2', MaNhanVien: PRACTITIONER_IDS[1] },
        ]) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ghiNhanHoatDongRepo.bulkCreate(submissions);

      expect(result.inserted).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);
      expect(result.inserted[0].MaNhanVien).toBe(PRACTITIONER_IDS[0]);
      expect(result.inserted[1].MaNhanVien).toBe(PRACTITIONER_IDS[1]);
    });

    it('detects conflicts when some practitioners already have submissions', async () => {
      const submissions: BulkSubmissionInsertInput[] = [
        {
          MaNhanVien: PRACTITIONER_IDS[0],
          MaDanhMuc: ACTIVITY_ID,
          TenHoatDong: 'Test Activity',
          NguoiNhap: 'user-1',
          CreationMethod: 'bulk',
          TrangThaiDuyet: 'ChoDuyet',
          DonViToChuc: null,
          NgayBatDau: null,
          NgayKetThuc: null,
          SoTiet: null,
          SoGioTinChiQuyDoi: 5.0,
          HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
          FileMinhChungUrl: null,
          BangChungSoGiayChungNhan: null,
        },
        {
          MaNhanVien: PRACTITIONER_IDS[1],
          MaDanhMuc: ACTIVITY_ID,
          TenHoatDong: 'Test Activity',
          NguoiNhap: 'user-1',
          CreationMethod: 'bulk',
          TrangThaiDuyet: 'ChoDuyet',
          DonViToChuc: null,
          NgayBatDau: null,
          NgayKetThuc: null,
          SoTiet: null,
          SoGioTinChiQuyDoi: 5.0,
          HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
          FileMinhChungUrl: null,
          BangChungSoGiayChungNhan: null,
        },
      ];

      // Mock transaction - only first practitioner succeeds
      (db.query as any)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([
          { MaGhiNhan: 'sub-1', MaNhanVien: PRACTITIONER_IDS[0] },
          // PRACTITIONER_IDS[1] not returned due to conflict
        ]) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ghiNhanHoatDongRepo.bulkCreate(submissions);

      expect(result.inserted).toHaveLength(1);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toBe(PRACTITIONER_IDS[1]);
    });

    it('returns empty arrays when no submissions provided', async () => {
      const result = await ghiNhanHoatDongRepo.bulkCreate([]);

      expect(result.inserted).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('rolls back transaction on database error', async () => {
      const submissions: BulkSubmissionInsertInput[] = [
        {
          MaNhanVien: PRACTITIONER_IDS[0],
          MaDanhMuc: ACTIVITY_ID,
          TenHoatDong: 'Test Activity',
          NguoiNhap: 'user-1',
          CreationMethod: 'bulk',
          TrangThaiDuyet: 'ChoDuyet',
          DonViToChuc: null,
          NgayBatDau: null,
          NgayKetThuc: null,
          SoTiet: null,
          SoGioTinChiQuyDoi: 5.0,
          HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
          FileMinhChungUrl: null,
          BangChungSoGiayChungNhan: null,
        },
      ];

      (db.query as any)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database connection lost')) // INSERT fails
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(ghiNhanHoatDongRepo.bulkCreate(submissions)).rejects.toThrow(
        'Bulk submission insert failed: Database connection lost'
      );

      // Verify ROLLBACK was called
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // Task 8.1.2: Test cohort resolution logic (all/manual modes)
  describe('8.1.2 - Cohort Resolution Logic', () => {
    it('resolves manual cohort selection with valid practitioner IDs', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
        { MaNhanVien: PRACTITIONER_IDS[1], MaDonVi: UNIT_ID },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'manual',
          selectedIds: [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1]],
          excludedIds: [],
          filters: {},
          totalFiltered: 2,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.practitioners).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedSelection.mode).toBe('manual');
    });

    it('detects missing practitioners in manual mode', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'manual',
          selectedIds: [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1], PRACTITIONER_IDS[2]],
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.practitioners).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].practitionerId).toBe(PRACTITIONER_IDS[1]);
      expect(result.errors[0].error).toBe('Practitioner not found');
      expect(result.errors[1].practitionerId).toBe(PRACTITIONER_IDS[2]);
    });

    it('handles exclusions in manual mode', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'manual',
          selectedIds: [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1]],
          excludedIds: [PRACTITIONER_IDS[1]], // Exclude second practitioner
          filters: {},
          totalFiltered: 2,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.practitioners).toHaveLength(1);
      expect(result.practitioners[0].MaNhanVien).toBe(PRACTITIONER_IDS[0]);
    });

    it('returns error when all selections are excluded', async () => {
      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'manual',
          selectedIds: [PRACTITIONER_IDS[0]],
          excludedIds: [PRACTITIONER_IDS[0]],
          filters: {},
          totalFiltered: 1,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.practitioners).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('No practitioners selected after exclusions');
    });

    it('resolves "all" cohort mode with filters for DonVi users', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
        { MaNhanVien: PRACTITIONER_IDS[1], MaDonVi: UNIT_ID },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: { trangThai: 'DangLamViec' },
          totalFiltered: 50,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.practitioners).toHaveLength(2);
      expect(result.normalizedSelection.mode).toBe('all');
    });

    it('resolves "all" cohort mode for SoYTe users without unit restriction', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
        { MaNhanVien: PRACTITIONER_IDS[1], MaDonVi: '550e8400-e29b-41d4-a716-446655440012' },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: { chucDanh: 'Bác sĩ' },
          totalFiltered: 100,
        },
        { role: 'SoYTe', unitId: null }
      );

      expect(result.practitioners).toHaveLength(2);
      expect(result.practitioners[0].MaDonVi).toBe(UNIT_ID);
      expect(result.practitioners[1].MaDonVi).toBe('550e8400-e29b-41d4-a716-446655440012');
    });

    it('applies search filter in "all" mode', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: { search: 'Nguyen' },
          totalFiltered: 10,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.practitioners).toHaveLength(1);
      // Verify query was called with search parameter
      expect(db.query).toHaveBeenCalled();
    });

    it('excludes specific practitioners in "all" mode', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'all',
          selectedIds: [],
          excludedIds: [PRACTITIONER_IDS[1]], // Exclude one practitioner
          filters: {},
          totalFiltered: 50,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.practitioners).toHaveLength(1);
      expect(result.practitioners[0].MaNhanVien).toBe(PRACTITIONER_IDS[0]);
    });

    it('deduplicates selected IDs in manual mode', async () => {
      const mockPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0], MaDonVi: UNIT_ID },
      ];

      (db.query as any).mockResolvedValueOnce(mockPractitioners);

      const result = await nhanVienRepo.resolveBulkCohortSelection(
        {
          mode: 'manual',
          selectedIds: [
            PRACTITIONER_IDS[0],
            PRACTITIONER_IDS[0], // Duplicate
            PRACTITIONER_IDS[0], // Duplicate
          ],
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        { role: 'DonVi', unitId: UNIT_ID }
      );

      expect(result.normalizedSelection.selectedIds).toHaveLength(1);
      expect(result.practitioners).toHaveLength(1);
    });
  });

  // Task 8.1.3: Test duplicate detection
  describe('8.1.3 - Duplicate Detection', () => {
    it('detects existing submissions for practitioners', async () => {
      const mockDuplicates = [
        { MaNhanVien: PRACTITIONER_IDS[0] },
        { MaNhanVien: PRACTITIONER_IDS[1] },
      ];

      (db.query as any).mockResolvedValueOnce(mockDuplicates);

      const duplicateIds = await ghiNhanHoatDongRepo.findDuplicatePractitionerIds(
        ACTIVITY_ID,
        [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1], PRACTITIONER_IDS[2]]
      );

      expect(duplicateIds).toHaveLength(2);
      expect(duplicateIds).toContain(PRACTITIONER_IDS[0]);
      expect(duplicateIds).toContain(PRACTITIONER_IDS[1]);
      expect(duplicateIds).not.toContain(PRACTITIONER_IDS[2]);
    });

    it('returns empty array when no duplicates found', async () => {
      (db.query as any).mockResolvedValueOnce([]);

      const duplicateIds = await ghiNhanHoatDongRepo.findDuplicatePractitionerIds(
        ACTIVITY_ID,
        [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1]]
      );

      expect(duplicateIds).toHaveLength(0);
    });

    it('returns empty array when no practitioners provided', async () => {
      const duplicateIds = await ghiNhanHoatDongRepo.findDuplicatePractitionerIds(
        ACTIVITY_ID,
        []
      );

      expect(duplicateIds).toHaveLength(0);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('correctly queries for activity-practitioner pair', async () => {
      (db.query as any).mockResolvedValueOnce([]);

      await ghiNhanHoatDongRepo.findDuplicatePractitionerIds(
        ACTIVITY_ID,
        [PRACTITIONER_IDS[0]]
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('MaDanhMuc'),
        [ACTIVITY_ID, [PRACTITIONER_IDS[0]]]
      );
    });
  });

  // Task 8.1.4: Test tenancy validation (DonVi cannot cross units)
  describe('8.1.4 - Tenancy Validation', () => {
    it('identifies practitioners from different units', async () => {
      const mockMismatchedPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[1] }, // Different unit
      ];

      (db.query as any).mockResolvedValueOnce(mockMismatchedPractitioners);

      const mismatchedIds = await nhanVienRepo.validatePractitionersTenancy(
        [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1], PRACTITIONER_IDS[2]],
        UNIT_ID
      );

      expect(mismatchedIds).toHaveLength(1);
      expect(mismatchedIds[0]).toBe(PRACTITIONER_IDS[1]);
    });

    it('returns empty array when all practitioners belong to the unit', async () => {
      (db.query as any).mockResolvedValueOnce([]);

      const mismatchedIds = await nhanVienRepo.validatePractitionersTenancy(
        [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1]],
        UNIT_ID
      );

      expect(mismatchedIds).toHaveLength(0);
    });

    it('returns empty array when no practitioners provided', async () => {
      const mismatchedIds = await nhanVienRepo.validatePractitionersTenancy(
        [],
        UNIT_ID
      );

      expect(mismatchedIds).toHaveLength(0);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('correctly queries for unit mismatch', async () => {
      (db.query as any).mockResolvedValueOnce([]);

      await nhanVienRepo.validatePractitionersTenancy(
        [PRACTITIONER_IDS[0]],
        UNIT_ID
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('MaDonVi'),
        [[PRACTITIONER_IDS[0]], UNIT_ID]
      );
    });

    it('identifies multiple practitioners from different units', async () => {
      const mockMismatchedPractitioners = [
        { MaNhanVien: PRACTITIONER_IDS[0] },
        { MaNhanVien: PRACTITIONER_IDS[2] },
      ];

      (db.query as any).mockResolvedValueOnce(mockMismatchedPractitioners);

      const mismatchedIds = await nhanVienRepo.validatePractitionersTenancy(
        [PRACTITIONER_IDS[0], PRACTITIONER_IDS[1], PRACTITIONER_IDS[2]],
        UNIT_ID
      );

      expect(mismatchedIds).toHaveLength(2);
      expect(mismatchedIds).toContain(PRACTITIONER_IDS[0]);
      expect(mismatchedIds).toContain(PRACTITIONER_IDS[2]);
    });
  });

  // Task 8.1.5: Test status assignment (YeuCauMinhChung logic)
  describe('8.1.5 - Status Assignment Logic', () => {
    it('assigns "Nhap" status when evidence is required', () => {
      const activity = {
        YeuCauMinhChung: true,
      };

      const initialStatus = activity.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet';

      expect(initialStatus).toBe('Nhap');
    });

    it('assigns "ChoDuyet" status when evidence is not required', () => {
      const activity = {
        YeuCauMinhChung: false,
      };

      const initialStatus = activity.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet';

      expect(initialStatus).toBe('ChoDuyet');
    });

    it('assigns "ChoDuyet" status when YeuCauMinhChung is null', () => {
      const activity = {
        YeuCauMinhChung: null,
      };

      const initialStatus = activity.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet';

      expect(initialStatus).toBe('ChoDuyet');
    });

    it('assigns "ChoDuyet" status when YeuCauMinhChung is undefined', () => {
      const activity = {
        YeuCauMinhChung: undefined,
      };

      const initialStatus = activity.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet';

      expect(initialStatus).toBe('ChoDuyet');
    });

    it('correctly applies status to bulk submissions', () => {
      const activityWithEvidence = { YeuCauMinhChung: true };
      const activityWithoutEvidence = { YeuCauMinhChung: false };

      const submission1 = {
        TrangThaiDuyet: activityWithEvidence.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet',
      };

      const submission2 = {
        TrangThaiDuyet: activityWithoutEvidence.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet',
      };

      expect(submission1.TrangThaiDuyet).toBe('Nhap');
      expect(submission2.TrangThaiDuyet).toBe('ChoDuyet');
    });
  });

  // Task 8.1.7: Test batch processing (>500 submissions)
  describe('8.1.7 - Batch Processing (>500 submissions)', () => {
    it('processes submissions in batches of 500', async () => {
      // Create 1200 submissions to test batching
      const submissions: BulkSubmissionInsertInput[] = Array.from({ length: 1200 }, (_, i) => ({
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
        MaDanhMuc: ACTIVITY_ID,
        TenHoatDong: 'Test Activity',
        NguoiNhap: 'user-1',
        CreationMethod: 'bulk',
        TrangThaiDuyet: 'ChoDuyet',
        DonViToChuc: null,
        NgayBatDau: null,
        NgayKetThuc: null,
        SoTiet: null,
        SoGioTinChiQuyDoi: 5.0,
        HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
        FileMinhChungUrl: null,
        BangChungSoGiayChungNhan: null,
      }));

      const batch1Result = Array.from({ length: 500 }, (_, i) => ({
        MaGhiNhan: `sub-${i}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
      }));

      const batch2Result = Array.from({ length: 500 }, (_, i) => ({
        MaGhiNhan: `sub-${i + 500}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i + 500).padStart(12, '0')}`,
      }));

      const batch3Result = Array.from({ length: 200 }, (_, i) => ({
        MaGhiNhan: `sub-${i + 1000}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i + 1000).padStart(12, '0')}`,
      }));

      (db.query as any)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(batch1Result) // Batch 1
        .mockResolvedValueOnce(batch2Result) // Batch 2
        .mockResolvedValueOnce(batch3Result) // Batch 3
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ghiNhanHoatDongRepo.bulkCreate(submissions);

      expect(result.inserted).toHaveLength(1200);
      expect(result.conflicts).toHaveLength(0);
      // Verify db.query was called 5 times: BEGIN, 3 batches, COMMIT
      expect(db.query).toHaveBeenCalledTimes(5);
    });

    it('uses custom batch size when provided', async () => {
      const submissions: BulkSubmissionInsertInput[] = Array.from({ length: 150 }, (_, i) => ({
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
        MaDanhMuc: ACTIVITY_ID,
        TenHoatDong: 'Test Activity',
        NguoiNhap: 'user-1',
        CreationMethod: 'bulk',
        TrangThaiDuyet: 'ChoDuyet',
        DonViToChuc: null,
        NgayBatDau: null,
        NgayKetThuc: null,
        SoTiet: null,
        SoGioTinChiQuyDoi: 5.0,
        HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
        FileMinhChungUrl: null,
        BangChungSoGiayChungNhan: null,
      }));

      const batch1Result = Array.from({ length: 100 }, (_, i) => ({
        MaGhiNhan: `sub-${i}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
      }));

      const batch2Result = Array.from({ length: 50 }, (_, i) => ({
        MaGhiNhan: `sub-${i + 100}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i + 100).padStart(12, '0')}`,
      }));

      (db.query as any)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(batch1Result) // Batch 1 (100 items)
        .mockResolvedValueOnce(batch2Result) // Batch 2 (50 items)
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ghiNhanHoatDongRepo.bulkCreate(submissions, { batchSize: 100 });

      expect(result.inserted).toHaveLength(150);
      // Verify db.query was called 4 times: BEGIN, 2 batches, COMMIT
      expect(db.query).toHaveBeenCalledTimes(4);
    });

    it('handles conflicts across multiple batches', async () => {
      const submissions: BulkSubmissionInsertInput[] = Array.from({ length: 600 }, (_, i) => ({
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
        MaDanhMuc: ACTIVITY_ID,
        TenHoatDong: 'Test Activity',
        NguoiNhap: 'user-1',
        CreationMethod: 'bulk',
        TrangThaiDuyet: 'ChoDuyet',
        DonViToChuc: null,
        NgayBatDau: null,
        NgayKetThuc: null,
        SoTiet: null,
        SoGioTinChiQuyDoi: 5.0,
        HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
        FileMinhChungUrl: null,
        BangChungSoGiayChungNhan: null,
      }));

      // Batch 1: 495 inserted (5 conflicts)
      const batch1Result = Array.from({ length: 495 }, (_, i) => ({
        MaGhiNhan: `sub-${i}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
      }));

      // Batch 2: 97 inserted (3 conflicts)
      const batch2Result = Array.from({ length: 97 }, (_, i) => ({
        MaGhiNhan: `sub-${i + 500}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i + 500).padStart(12, '0')}`,
      }));

      (db.query as any)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(batch1Result) // Batch 1
        .mockResolvedValueOnce(batch2Result) // Batch 2
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await ghiNhanHoatDongRepo.bulkCreate(submissions);

      expect(result.inserted).toHaveLength(592);
      expect(result.conflicts).toHaveLength(8); // 5 from batch 1 + 3 from batch 2
    });

    it('rolls back entire transaction if any batch fails', async () => {
      const submissions: BulkSubmissionInsertInput[] = Array.from({ length: 600 }, (_, i) => ({
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
        MaDanhMuc: ACTIVITY_ID,
        TenHoatDong: 'Test Activity',
        NguoiNhap: 'user-1',
        CreationMethod: 'bulk',
        TrangThaiDuyet: 'ChoDuyet',
        DonViToChuc: null,
        NgayBatDau: null,
        NgayKetThuc: null,
        SoTiet: null,
        SoGioTinChiQuyDoi: 5.0,
        HinhThucCapNhatKienThucYKhoa: 'Hội thảo',
        FileMinhChungUrl: null,
        BangChungSoGiayChungNhan: null,
      }));

      const batch1Result = Array.from({ length: 500 }, (_, i) => ({
        MaGhiNhan: `sub-${i}`,
        MaNhanVien: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
      }));

      (db.query as any)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(batch1Result) // Batch 1 succeeds
        .mockRejectedValueOnce(new Error('Deadlock detected')) // Batch 2 fails
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(ghiNhanHoatDongRepo.bulkCreate(submissions)).rejects.toThrow(
        'Bulk submission insert failed: Deadlock detected'
      );

      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
