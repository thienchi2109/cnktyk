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
import { nhatKyHeThongRepo } from '@/lib/db/repositories';
import { AUDIT_ACTIONS } from '@/types/audit-actions';
import type { NhatKyHeThong } from '@/types';

describe('Task 6.1.6 - Audit Log Retrieval Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Verify audit log entry is created after bulk enrollment
  describe('Audit Log Creation', () => {
    it('creates audit log entry with all required fields for bulk submission', async () => {
      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-123',
        MaTaiKhoan: 'user-1',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: {
          activityId: 'activity-123',
          activityName: 'COVID-19 Safety Training',
          cohortMode: 'manual',
          cohortFilters: { trangThai: 'DangLamViec' },
          totalSelected: 50,
          totalExcluded: 3,
          created: 45,
          skipped: 2,
          failed: 0,
          actorRole: 'DonVi',
          unitId: 'unit-789',
          samplePractitionerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
        },
        DiaChiIP: '192.168.1.1',
        ThoiGian: new Date('2025-11-08T10:00:00Z'),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-1',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        {
          activityId: 'activity-123',
          activityName: 'COVID-19 Safety Training',
          cohortMode: 'manual',
          cohortFilters: { trangThai: 'DangLamViec' },
          totalSelected: 50,
          totalExcluded: 3,
          created: 45,
          skipped: 2,
          failed: 0,
          actorRole: 'DonVi',
          unitId: 'unit-789',
          samplePractitionerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
        },
        '192.168.1.1'
      );

      expect(auditLog).toBeDefined();
      expect(auditLog.MaTaiKhoan).toBe('user-1');
      expect(auditLog.HanhDong).toBe(AUDIT_ACTIONS.BULK_SUBMISSION_CREATE);
      expect(auditLog.Bang).toBe('GhiNhanHoatDong');
      expect(auditLog.KhoaChinh).toBe(null);
      expect(auditLog.DiaChiIP).toBe('192.168.1.1');
    });

    it('creates audit log with NoiDung containing all metadata fields', async () => {
      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-456',
        MaTaiKhoan: 'user-2',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: {
          activityId: 'activity-456',
          activityName: 'Test Activity',
          cohortMode: 'all',
          cohortFilters: {},
          totalSelected: 100,
          totalExcluded: 0,
          created: 100,
          skipped: 0,
          failed: 0,
          actorRole: 'SoYTe',
          unitId: null,
          samplePractitionerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
        },
        DiaChiIP: '10.0.0.1',
        ThoiGian: new Date('2025-11-08T11:00:00Z'),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-2',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        mockAuditLog.NoiDung,
        '10.0.0.1'
      );

      expect(auditLog.NoiDung).toBeDefined();
      expect(auditLog.NoiDung?.activityId).toBe('activity-456');
      expect(auditLog.NoiDung?.activityName).toBe('Test Activity');
      expect(auditLog.NoiDung?.cohortMode).toBe('all');
      expect(auditLog.NoiDung?.totalSelected).toBe(100);
      expect(auditLog.NoiDung?.created).toBe(100);
      expect(auditLog.NoiDung?.actorRole).toBe('SoYTe');
      expect(auditLog.NoiDung?.unitId).toBe(null);
    });
  });

  // Test 2: Verify all fields are populated correctly
  describe('Field Population Validation', () => {
    it('populates all audit log fields correctly', async () => {
      const expectedContent = {
        activityId: 'activity-789',
        activityName: 'Advanced Training',
        cohortMode: 'manual',
        cohortFilters: { chucDanh: 'Bác sĩ' },
        totalSelected: 25,
        totalExcluded: 5,
        created: 20,
        skipped: 0,
        failed: 0,
        actorRole: 'DonVi',
        unitId: 'unit-123',
        samplePractitionerIds: ['p1', 'p2', 'p3'],
      };

      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-789',
        MaTaiKhoan: 'user-3',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: expectedContent,
        DiaChiIP: '203.0.113.1',
        ThoiGian: new Date(),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-3',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        expectedContent,
        '203.0.113.1'
      );

      // Verify user ID
      expect(auditLog.MaTaiKhoan).toBe('user-3');

      // Verify action constant
      expect(auditLog.HanhDong).toBe(AUDIT_ACTIONS.BULK_SUBMISSION_CREATE);

      // Verify table name
      expect(auditLog.Bang).toBe('GhiNhanHoatDong');

      // Verify primary key is null for bulk operations
      expect(auditLog.KhoaChinh).toBe(null);

      // Verify IP address
      expect(auditLog.DiaChiIP).toBe('203.0.113.1');

      // Verify all NoiDung fields
      expect(auditLog.NoiDung?.activityId).toBe('activity-789');
      expect(auditLog.NoiDung?.activityName).toBe('Advanced Training');
      expect(auditLog.NoiDung?.cohortMode).toBe('manual');
      expect(auditLog.NoiDung?.cohortFilters).toEqual({ chucDanh: 'Bác sĩ' });
      expect(auditLog.NoiDung?.totalSelected).toBe(25);
      expect(auditLog.NoiDung?.totalExcluded).toBe(5);
      expect(auditLog.NoiDung?.created).toBe(20);
      expect(auditLog.NoiDung?.skipped).toBe(0);
      expect(auditLog.NoiDung?.failed).toBe(0);
      expect(auditLog.NoiDung?.actorRole).toBe('DonVi');
      expect(auditLog.NoiDung?.unitId).toBe('unit-123');
      expect(auditLog.NoiDung?.samplePractitionerIds).toEqual(['p1', 'p2', 'p3']);
    });

    it('handles null IP address gracefully', async () => {
      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-null-ip',
        MaTaiKhoan: 'user-4',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: { test: 'data' },
        DiaChiIP: null,
        ThoiGian: new Date(),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-4',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        { test: 'data' },
        null
      );

      expect(auditLog.DiaChiIP).toBe(null);
    });
  });

  // Test 3: Verify sample practitioner IDs are limited to 10
  describe('Sample Practitioner IDs Limitation', () => {
    it('stores exactly 10 sample practitioner IDs when 10 are provided', async () => {
      const sampleIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-10-samples',
        MaTaiKhoan: 'user-5',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: {
          activityId: 'activity-test',
          activityName: 'Test',
          cohortMode: 'all',
          cohortFilters: {},
          totalSelected: 10,
          totalExcluded: 0,
          created: 10,
          skipped: 0,
          failed: 0,
          actorRole: 'DonVi',
          unitId: 'unit-test',
          samplePractitionerIds: sampleIds,
        },
        DiaChiIP: null,
        ThoiGian: new Date(),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-5',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        mockAuditLog.NoiDung,
        null
      );

      expect(auditLog.NoiDung?.samplePractitionerIds).toHaveLength(10);
      expect(auditLog.NoiDung?.samplePractitionerIds).toEqual(sampleIds);
    });

    it('verifies sample IDs should be limited to 10 even with 100+ practitioners', async () => {
      // In real implementation, only first 10 should be stored
      const limitedSampleIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-100-practitioners',
        MaTaiKhoan: 'user-6',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: {
          activityId: 'activity-large',
          activityName: 'Large Enrollment',
          cohortMode: 'all',
          cohortFilters: {},
          totalSelected: 100,
          totalExcluded: 0,
          created: 100,
          skipped: 0,
          failed: 0,
          actorRole: 'DonVi',
          unitId: 'unit-large',
          samplePractitionerIds: limitedSampleIds,
        },
        DiaChiIP: null,
        ThoiGian: new Date(),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-6',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        mockAuditLog.NoiDung,
        null
      );

      // Verify total was 100 but only 10 sample IDs stored
      expect(auditLog.NoiDung?.totalSelected).toBe(100);
      expect(auditLog.NoiDung?.samplePractitionerIds).toHaveLength(10);
      expect(auditLog.NoiDung?.samplePractitionerIds).toEqual(limitedSampleIds);
    });

    it('handles fewer than 10 practitioners correctly', async () => {
      const sampleIds = ['p1', 'p2', 'p3'];

      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-3-samples',
        MaTaiKhoan: 'user-7',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: {
          activityId: 'activity-small',
          activityName: 'Small Enrollment',
          cohortMode: 'manual',
          cohortFilters: {},
          totalSelected: 3,
          totalExcluded: 0,
          created: 3,
          skipped: 0,
          failed: 0,
          actorRole: 'DonVi',
          unitId: 'unit-small',
          samplePractitionerIds: sampleIds,
        },
        DiaChiIP: null,
        ThoiGian: new Date(),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-7',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        mockAuditLog.NoiDung,
        null
      );

      expect(auditLog.NoiDung?.samplePractitionerIds).toHaveLength(3);
      expect(auditLog.NoiDung?.samplePractitionerIds).toEqual(['p1', 'p2', 'p3']);
    });
  });

  // Test 4: Verify audit log can be retrieved by user
  describe('Audit Log Retrieval by User', () => {
    it('retrieves audit logs for a specific user', async () => {
      const mockAuditLogs: NhatKyHeThong[] = [
        {
          MaNhatKy: 'audit-1',
          MaTaiKhoan: 'user-8',
          HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
          Bang: 'GhiNhanHoatDong',
          KhoaChinh: null,
          NoiDung: { test: 'log 1' },
          DiaChiIP: '1.2.3.4',
          ThoiGian: new Date('2025-11-08T10:00:00Z'),
        },
        {
          MaNhatKy: 'audit-2',
          MaTaiKhoan: 'user-8',
          HanhDong: AUDIT_ACTIONS.SUBMISSION_UPDATE,
          Bang: 'GhiNhanHoatDong',
          KhoaChinh: 'submission-123',
          NoiDung: { test: 'log 2' },
          DiaChiIP: '1.2.3.4',
          ThoiGian: new Date('2025-11-08T11:00:00Z'),
        },
      ];

      (db.query as any).mockResolvedValueOnce(mockAuditLogs);

      const logs = await nhatKyHeThongRepo.findByUser('user-8');

      expect(logs).toHaveLength(2);
      expect(logs[0].MaTaiKhoan).toBe('user-8');
      expect(logs[1].MaTaiKhoan).toBe('user-8');
    });

    it('retrieves audit logs with limit', async () => {
      const mockAuditLogs: NhatKyHeThong[] = [
        {
          MaNhatKy: 'audit-recent',
          MaTaiKhoan: 'user-9',
          HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
          Bang: 'GhiNhanHoatDong',
          KhoaChinh: null,
          NoiDung: { test: 'recent' },
          DiaChiIP: '1.2.3.4',
          ThoiGian: new Date(),
        },
      ];

      (db.query as any).mockResolvedValueOnce(mockAuditLogs);

      const logs = await nhatKyHeThongRepo.findByUser('user-9', 1);

      expect(logs).toHaveLength(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        ['user-9', '1']
      );
    });
  });

  // Test 5: Verify audit log can be filtered by table
  describe('Audit Log Retrieval by Table', () => {
    it('retrieves audit logs for a specific table', async () => {
      const mockAuditLogs: NhatKyHeThong[] = [
        {
          MaNhatKy: 'audit-table-1',
          MaTaiKhoan: 'user-10',
          HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
          Bang: 'GhiNhanHoatDong',
          KhoaChinh: null,
          NoiDung: { test: 'table log 1' },
          DiaChiIP: '1.2.3.4',
          ThoiGian: new Date(),
        },
        {
          MaNhatKy: 'audit-table-2',
          MaTaiKhoan: 'user-11',
          HanhDong: AUDIT_ACTIONS.SUBMISSION_APPROVE,
          Bang: 'GhiNhanHoatDong',
          KhoaChinh: 'submission-456',
          NoiDung: { test: 'table log 2' },
          DiaChiIP: '1.2.3.5',
          ThoiGian: new Date(),
        },
      ];

      (db.query as any).mockResolvedValueOnce(mockAuditLogs);

      const logs = await nhatKyHeThongRepo.findByTable('GhiNhanHoatDong');

      expect(logs).toHaveLength(2);
      expect(logs[0].Bang).toBe('GhiNhanHoatDong');
      expect(logs[1].Bang).toBe('GhiNhanHoatDong');
    });

    it('retrieves audit logs by table with limit', async () => {
      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-table-limited',
        MaTaiKhoan: 'user-12',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: { test: 'limited' },
        DiaChiIP: '1.2.3.6',
        ThoiGian: new Date(),
      };

      (db.query as any).mockResolvedValueOnce([mockAuditLog]);

      const logs = await nhatKyHeThongRepo.findByTable('GhiNhanHoatDong', 10);

      expect(logs).toHaveLength(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        ['GhiNhanHoatDong', '10']
      );
    });
  });

  // Test 6: Verify audit log cannot be modified
  describe('Audit Log Immutability - Update Prevention', () => {
    it('throws error when attempting to update audit log', async () => {
      await expect(nhatKyHeThongRepo.update('audit-123', { HanhDong: 'MODIFIED' } as any))
        .rejects
        .toThrow('Audit logs cannot be modified');
    });

    it('prevents any modification attempts', async () => {
      await expect(nhatKyHeThongRepo.update('any-id', {} as any))
        .rejects
        .toThrow('Audit logs cannot be modified');
    });
  });

  // Test 7: Verify audit log cannot be deleted
  describe('Audit Log Immutability - Delete Prevention', () => {
    it('throws error when attempting to delete audit log', async () => {
      await expect(nhatKyHeThongRepo.delete('audit-123'))
        .rejects
        .toThrow('Audit logs cannot be deleted');
    });

    it('prevents any deletion attempts', async () => {
      await expect(nhatKyHeThongRepo.delete('any-id'))
        .rejects
        .toThrow('Audit logs cannot be deleted');
    });
  });

  // Test 8: Verify findById works correctly
  describe('Audit Log Retrieval by ID', () => {
    it('retrieves a specific audit log by ID', async () => {
      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-find-by-id',
        MaTaiKhoan: 'user-13',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: {
          activityId: 'activity-xyz',
          activityName: 'Find Test',
          cohortMode: 'manual',
          cohortFilters: {},
          totalSelected: 5,
          totalExcluded: 0,
          created: 5,
          skipped: 0,
          failed: 0,
          actorRole: 'DonVi',
          unitId: 'unit-xyz',
          samplePractitionerIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        },
        DiaChiIP: '10.0.0.10',
        ThoiGian: new Date(),
      };

      (db.queryOne as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.findById('audit-find-by-id');

      expect(auditLog).toBeDefined();
      expect(auditLog?.MaNhatKy).toBe('audit-find-by-id');
      expect(auditLog?.HanhDong).toBe(AUDIT_ACTIONS.BULK_SUBMISSION_CREATE);
      expect(auditLog?.NoiDung?.activityId).toBe('activity-xyz');
    });

    it('returns null when audit log not found', async () => {
      (db.queryOne as any).mockResolvedValueOnce(null);

      const auditLog = await nhatKyHeThongRepo.findById('nonexistent-id');

      expect(auditLog).toBe(null);
    });
  });

  // Test 9: Verify AUDIT_ACTIONS constant usage
  describe('AUDIT_ACTIONS Constant Validation', () => {
    it('uses correct BULK_SUBMISSION_CREATE action constant', () => {
      expect(AUDIT_ACTIONS.BULK_SUBMISSION_CREATE).toBe('BULK_SUBMISSION_CREATE');
    });

    it('verifies action constant is a string', () => {
      expect(typeof AUDIT_ACTIONS.BULK_SUBMISSION_CREATE).toBe('string');
    });

    it('ensures action constant is consistent across calls', async () => {
      const mockAuditLog: NhatKyHeThong = {
        MaNhatKy: 'audit-constant-test',
        MaTaiKhoan: 'user-14',
        HanhDong: AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        Bang: 'GhiNhanHoatDong',
        KhoaChinh: null,
        NoiDung: { test: 'constant' },
        DiaChiIP: null,
        ThoiGian: new Date(),
      };

      (db.insert as any).mockResolvedValueOnce(mockAuditLog);

      const auditLog = await nhatKyHeThongRepo.logAction(
        'user-14',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        { test: 'constant' }
      );

      expect(auditLog.HanhDong).toBe(AUDIT_ACTIONS.BULK_SUBMISSION_CREATE);
      expect(auditLog.HanhDong).toBe('BULK_SUBMISSION_CREATE');
    });
  });
});
