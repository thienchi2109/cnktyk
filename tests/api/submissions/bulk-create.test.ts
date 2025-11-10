import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/repositories', () => ({
  danhMucHoatDongRepo: {
    findById: vi.fn(),
  },
  ghiNhanHoatDongRepo: {
    findDuplicatePractitionerIds: vi.fn(),
    bulkCreate: vi.fn(),
  },
  nhanVienRepo: {
    resolveBulkCohortSelection: vi.fn(),
    validatePractitionersTenancy: vi.fn(),
  },
  nhatKyHeThongRepo: {
    logAction: vi.fn(),
  },
}));

import { POST } from '@/app/api/submissions/bulk-create/route';
import { getCurrentUser } from '@/lib/auth/server';
import {
  danhMucHoatDongRepo,
  ghiNhanHoatDongRepo,
  nhanVienRepo,
  nhatKyHeThongRepo,
} from '@/lib/db/repositories';
import { AUDIT_ACTIONS } from '@/types/audit-actions';

async function makeRequest(body: any, headers: Record<string, string> = {}) {
  const req = new Request('http://localhost/api/submissions/bulk-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return (await POST(req as any)) as Response;
}

// Use valid UUIDs for all IDs
const ACTIVITY_ID = '550e8400-e29b-41d4-a716-446655440001';
const UNIT_ID = '550e8400-e29b-41d4-a716-446655440011';
const OTHER_UNIT_ID = '550e8400-e29b-41d4-a716-446655440041';
const NON_EXISTENT_ACTIVITY_ID = '550e8400-e29b-41d4-a716-446655441111';
const USER_ID = '550e8400-e29b-41d4-a716-446655440031';
const PRACTITIONER_IDS = [
  '550e8400-e29b-41d4-a716-446655440021',
  '550e8400-e29b-41d4-a716-446655440022',
  '550e8400-e29b-41d4-a716-446655440023',
];

const [PRACTITIONER_ID_1, PRACTITIONER_ID_2, PRACTITIONER_ID_3] = PRACTITIONER_IDS;

const ADDITIONAL_PRACTITIONER_IDS = [
  '550e8400-e29b-41d4-a716-446655440024',
  '550e8400-e29b-41d4-a716-446655440025',
  '550e8400-e29b-41d4-a716-446655440026',
  '550e8400-e29b-41d4-a716-446655440027',
  '550e8400-e29b-41d4-a716-446655440028',
  '550e8400-e29b-41d4-a716-446655440029',
  '550e8400-e29b-41d4-a716-44665544002a',
];

const PRACTITIONER_ID_LOOKUP = {
  p1: PRACTITIONER_ID_1,
  p2: PRACTITIONER_ID_2,
  p3: PRACTITIONER_ID_3,
  p4: ADDITIONAL_PRACTITIONER_IDS[0],
  p5: ADDITIONAL_PRACTITIONER_IDS[1],
  p6: ADDITIONAL_PRACTITIONER_IDS[2],
  p7: ADDITIONAL_PRACTITIONER_IDS[3],
  p8: ADDITIONAL_PRACTITIONER_IDS[4],
  p9: ADDITIONAL_PRACTITIONER_IDS[5],
  p10: ADDITIONAL_PRACTITIONER_IDS[6],
} as const;

function id(key: keyof typeof PRACTITIONER_ID_LOOKUP) {
  return PRACTITIONER_ID_LOOKUP[key];
}

function selected(...keys: (keyof typeof PRACTITIONER_ID_LOOKUP)[]) {
  return keys.map((key) => id(key));
}

function dynamicPractitionerId(index: number) {
  return `00000000-0000-0000-0000-${(index + 1).toString().padStart(12, '0')}`;
}

const mockActivity = {
  MaDanhMuc: ACTIVITY_ID,
  TenDanhMuc: 'COVID-19 Safety Training',
  TyLeQuyDoi: 2.0,
  LoaiHoatDong: 'HoiThao',
  YeuCauMinhChung: true,
  TrangThai: 'Active',
  MaDonVi: UNIT_ID,
  HieuLucTu: new Date('2025-01-01'),
  HieuLucDen: new Date('2025-12-31'),
  DaXoaMem: false,
};

const mockPractitioners = [
  { MaNhanVien: PRACTITIONER_ID_1, HoVaTen: 'Nguyen Van A', MaDonVi: UNIT_ID },
  { MaNhanVien: PRACTITIONER_ID_2, HoVaTen: 'Tran Thi B', MaDonVi: UNIT_ID },
  { MaNhanVien: PRACTITIONER_ID_3, HoVaTen: 'Le Van C', MaDonVi: UNIT_ID },
];

describe('POST /api/submissions/bulk-create - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Task 8.2.1: Test full bulk create API endpoint (happy path)
  describe('8.2.1 - Happy Path', () => {
    it('successfully creates bulk submissions with manual cohort selection', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: mockPractitioners,
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: [
          { MaGhiNhan: 'sub-1', MaNhanVien: id('p1') },
          { MaGhiNhan: 'sub-2', MaNhanVien: id('p2') },
          { MaGhiNhan: 'sub-3', MaNhanVien: id('p3') },
        ],
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.created).toBe(3);
      expect(body.skipped).toBe(0);
      expect(body.failed).toBe(0);
      expect(body.details.submissionIds).toHaveLength(3);
      expect(body.message).toContain('Đã tạo 3 bản ghi');
    });

    it('successfully creates bulk submissions with "all" cohort mode', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: mockPractitioners,
        errors: [],
        normalizedSelection: {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: { trangThai: 'DangLamViec' },
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: mockPractitioners.map((p, i) => ({ MaGhiNhan: `sub-${i + 1}`, MaNhanVien: p.MaNhanVien })),
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: { trangThai: 'DangLamViec' },
          totalFiltered: 50,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.created).toBe(3);
    });

    it('sets initial status to "Nhap" when evidence is required', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        YeuCauMinhChung: true,
      });
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: [mockPractitioners[0]],
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);

      let capturedSubmissions: any[] = [];
      (ghiNhanHoatDongRepo.bulkCreate as any).mockImplementation((submissions: any[]) => {
        capturedSubmissions = submissions;
        return Promise.resolve({
          inserted: submissions.map((s, i) => ({ MaGhiNhan: `sub-${i + 1}`, MaNhanVien: s.MaNhanVien })),
          conflicts: [],
        });
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      await makeRequest(requestBody);

      expect(capturedSubmissions[0].TrangThaiDuyet).toBe('Nhap');
    });

    it('sets initial status to "ChoDuyet" when evidence is NOT required', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        YeuCauMinhChung: false,
      });
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: [mockPractitioners[0]],
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);

      let capturedSubmissions: any[] = [];
      (ghiNhanHoatDongRepo.bulkCreate as any).mockImplementation((submissions: any[]) => {
        capturedSubmissions = submissions;
        return Promise.resolve({
          inserted: submissions.map((s, i) => ({ MaGhiNhan: `sub-${i + 1}`, MaNhanVien: s.MaNhanVien })),
          conflicts: [],
        });
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      await makeRequest(requestBody);

      expect(capturedSubmissions[0].TrangThaiDuyet).toBe('ChoDuyet');
    });
  });

  // Task 8.2.2: Test duplicate handling (skip existing)
  describe('8.2.2 - Duplicate Handling', () => {
    it('skips duplicate submissions and reports them', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: mockPractitioners,
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      // p1 and p2 are already in DB
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce(selected('p1', 'p2'));
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: [{ MaGhiNhan: 'sub-3', MaNhanVien: id('p3') }],
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.created).toBe(1);
      expect(body.skipped).toBe(2);
      expect(body.details.duplicates).toContain(id('p1'));
      expect(body.details.duplicates).toContain(id('p2'));
      expect(body.message).toContain('bỏ qua 2 bản ghi trùng');
    });

    it('merges repository conflicts into duplicates list', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: mockPractitioners,
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce(selected('p1'));
      // Simulate DB conflict for p2 (race condition)
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: [{ MaGhiNhan: 'sub-3', MaNhanVien: id('p3') }],
        conflicts: [id('p2')], // p2 was inserted by another request after our duplicate check
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.created).toBe(1);
      expect(body.skipped).toBe(2);
      expect(body.details.duplicates).toContain(id('p1'));
      expect(body.details.duplicates).toContain(id('p2'));
    });

    it('returns 200 when all submissions are duplicates', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: mockPractitioners,
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce(selected('p1', 'p2', 'p3'));

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200); // 200, not 201, because nothing was created
      expect(body.success).toBe(true);
      expect(body.created).toBe(0);
      expect(body.skipped).toBe(3);
      expect(body.message).toContain('Đã tạo 0 bản ghi');
    });
  });

  // Task 8.2.3: Test authorization (DonVi vs SoYTe)
  describe('8.2.3 - Authorization', () => {
    it('allows DonVi users to create bulk submissions', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: [mockPractitioners[0]],
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: [{ MaGhiNhan: 'sub-1', MaNhanVien: id('p1') }],
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);

      expect(res.status).toBe(201);
    });

    it('allows SoYTe users to create bulk submissions', async () => {
      const user = { id: 'user-2', username: 'soyte@gov.vn', role: 'SoYTe', unitId: null };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        MaDonVi: null, // Global activity
      });
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: [mockPractitioners[0]],
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
        },
      });
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: [{ MaGhiNhan: 'sub-1', MaNhanVien: id('p1') }],
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);

      expect(res.status).toBe(201);
    });

    it('returns 401 when user is not authenticated', async () => {
      (getCurrentUser as any).mockResolvedValueOnce(null);

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 403 when user is NguoiHanhNghe (practitioner)', async () => {
      const user = { id: 'user-3', username: 'practitioner@example.com', role: 'NguoiHanhNghe', unitId: null };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe('Insufficient permissions');
    });

    it('returns 403 when DonVi user tries to use activity from different unit', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        MaDonVi: OTHER_UNIT_ID, // Different unit
      });

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe('Activity does not belong to this unit');
    });

    it('returns 403 when DonVi user tries to create submissions for practitioners from different unit', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: [{ MaNhanVien: id('p1'), HoVaTen: 'Nguyen Van A', MaDonVi: OTHER_UNIT_ID }],
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce(selected('p1')); // Mismatch

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe('Cannot create submissions for other units');
    });
  });

  // Task 8.2.4: Test error cases (invalid activity, invalid practitioners)
  describe('8.2.4 - Error Cases', () => {
    it('returns 404 when activity not found', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);

      const requestBody = {
        MaDanhMuc: NON_EXISTENT_ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Activity not found');
    });

    it('returns 400 when activity is soft-deleted', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        DaXoaMem: true,
      });

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Activity is not available');
    });

    it('returns 400 when activity is not active', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        TrangThai: 'Inactive',
      });

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Activity is not active');
    });

    it('returns 400 when activity validity has not started', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        HieuLucTu: new Date('2026-01-01'), // Future date
      });

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Activity is not yet valid');
    });

    it('returns 400 when activity validity has expired', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        HieuLucDen: new Date('2024-12-31'), // Past date
      });

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Activity validity has expired');
    });

    it('returns 400 when no practitioners selected in manual mode', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: [],
          excludedIds: [],
          filters: {},
          totalFiltered: 0,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('No practitioners selected');
    });

    it('returns 400 when end date is before start date', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
        NgayBatDau: '2025-02-10',
        NgayKetThuc: '2025-02-01', // Before start date
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('NgayKetThuc must be greater than or equal to NgayBatDau');
    });

    it('returns 400 for invalid request body schema', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        MaDanhMuc: 'not-a-uuid',
        cohort: 'invalid',
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });
  });

  // Task 8.2.5: Test audit log creation
  describe('8.2.5 - Audit Log Creation', () => {
    it('creates audit log entry with all required metadata', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: mockPractitioners,
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: mockPractitioners.map((p, i) => ({ MaGhiNhan: `sub-${i + 1}`, MaNhanVien: p.MaNhanVien })),
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1', 'p2', 'p3'),
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
      };

      await makeRequest(requestBody, { 'x-forwarded-for': '203.0.113.1' });

      expect(nhatKyHeThongRepo.logAction).toHaveBeenCalledWith(
        'user-1',
        AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
        'GhiNhanHoatDong',
        null,
        expect.objectContaining({
          activityId: ACTIVITY_ID,
          activityName: 'COVID-19 Safety Training',
          cohortMode: 'manual',
          totalSelected: 3,
          created: 3,
          skipped: 0,
          failed: 0,
          actorRole: 'DonVi',
          unitId: UNIT_ID,
          samplePractitionerIds: expect.arrayContaining(selected('p1', 'p2', 'p3')),
        }),
        '203.0.113.1'
      );
    });

    it('limits sample practitioner IDs to first 10', async () => {
      const manyPractitioners = Array.from({ length: 50 }, (_, i) => ({
        MaNhanVien: dynamicPractitionerId(i),
        HoVaTen: `Practitioner ${i + 1}`,
        MaDonVi: UNIT_ID,
      }));

      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: manyPractitioners,
        errors: [],
        normalizedSelection: {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: manyPractitioners.map((p, i) => ({ MaGhiNhan: `sub-${i + 1}`, MaNhanVien: p.MaNhanVien })),
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: {},
          totalFiltered: 50,
        },
      };

      await makeRequest(requestBody);

      expect(nhatKyHeThongRepo.logAction).toHaveBeenCalled();
      const auditCallArgs = (nhatKyHeThongRepo.logAction as any).mock.calls[0];
      const auditContent = auditCallArgs[4];

      expect(auditContent.samplePractitionerIds).toHaveLength(10);
      expect(auditContent.samplePractitionerIds).toEqual(
        manyPractitioners.slice(0, 10).map((p) => p.MaNhanVien)
      );
    });

    it('extracts IP address from various headers', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockActivity);
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: [mockPractitioners[0]],
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.bulkCreate as any).mockResolvedValueOnce({
        inserted: [{ MaGhiNhan: 'sub-1', MaNhanVien: id('p1') }],
        conflicts: [],
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      await makeRequest(requestBody, { 'cf-connecting-ip': '1.2.3.4' });

      const logCalls = (nhatKyHeThongRepo.logAction as any).mock.calls;
      expect(logCalls).toHaveLength(1);
      const [, , , , , ipAddress] = logCalls[0];
      expect(ipAddress).toBe('1.2.3.4');
    });
  });

  // Task 8.2.6: Test credit calculation on approval (note: this is tested in credit-engine tests)
  describe('8.2.6 - Credit Calculation Reference', () => {
    it('creates submissions with CreationMethod="bulk" field for tracking', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce({
        ...mockActivity,
        YeuCauMinhChung: false,
      });
      (nhanVienRepo.resolveBulkCohortSelection as any).mockResolvedValueOnce({
        practitioners: [mockPractitioners[0]],
        errors: [],
        normalizedSelection: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
        },
      });
      (nhanVienRepo.validatePractitionersTenancy as any).mockResolvedValueOnce([]);
      (ghiNhanHoatDongRepo.findDuplicatePractitionerIds as any).mockResolvedValueOnce([]);

      let capturedSubmissions: any[] = [];
      (ghiNhanHoatDongRepo.bulkCreate as any).mockImplementation((submissions: any[]) => {
        capturedSubmissions = submissions;
        return Promise.resolve({
          inserted: submissions.map((s, i) => ({ MaGhiNhan: `sub-${i + 1}`, MaNhanVien: s.MaNhanVien })),
          conflicts: [],
        });
      });
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce({});

      const requestBody = {
        MaDanhMuc: ACTIVITY_ID,
        cohort: {
          mode: 'manual',
          selectedIds: selected('p1'),
          excludedIds: [],
          filters: {},
          totalFiltered: 1,
        },
      };

      await makeRequest(requestBody);

      expect(capturedSubmissions[0].CreationMethod).toBe('bulk');
    });

    // Note: Credit calculation logic is tested in tests/lib/db/credit-engine.test.ts
    // The bulk-create endpoint creates submissions with proper initial status,
    // and the credit engine applies evidence validation rules during approval.
  });
});
