import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: vi.fn(),
  },
}));

import { POST } from '@/app/api/cohorts/apply/route';
import { getCurrentUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

async function makeRequest(body: any, headers: Record<string, string> = {}) {
  const req = new Request('http://localhost/api/cohorts/apply', {
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
const USER_ID = '550e8400-e29b-41d4-a716-446655440031';
const PRACTITIONER_IDS = [
  '550e8400-e29b-41d4-a716-446655440021',
  '550e8400-e29b-41d4-a716-446655440022',
  '550e8400-e29b-41d4-a716-446655440023',
];

const mockPractitioners = PRACTITIONER_IDS.map((id, index) => ({
  MaNhanVien: id,
}));

describe('POST /api/cohorts/apply - Schema Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fix: Schema accepts optional activity fields', () => {
    it('accepts request WITH LoaiHoatDong and YeuCauMinhChung fields', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      // Mock manual mode resolution
      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners) // validatePractitionersTenancy check
        .mockResolvedValueOnce([{ inserted: 3 }]); // bulkCreate result

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'COVID-19 Safety Training',
          MaDanhMuc: ACTIVITY_ID,
          LoaiHoatDong: 'HoiThao', // ✅ This field was causing validation error before fix
          YeuCauMinhChung: true, // ✅ This field was causing validation error before fix
          NgayBatDau: '2025-01-15T10:00:00Z',
          NgayKetThuc: '2025-01-15T16:00:00Z',
          SoGioTinChiQuyDoi: 8,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      // Should succeed without validation error
      expect(res.status).not.toBe(400);
      expect(body.error).not.toBe('Validation error');
      expect(res.status).toBe(200);
      expect(body.created).toBe(3);
      expect(body.skipped).toBe(0);
      expect(body.total).toBe(3);
    });

    it('accepts request WITHOUT optional LoaiHoatDong and YeuCauMinhChung fields (backward compatibility)', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners)
        .mockResolvedValueOnce([{ inserted: 3 }]);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'COVID-19 Safety Training',
          MaDanhMuc: ACTIVITY_ID,
          // ✅ LoaiHoatDong and YeuCauMinhChung omitted - should still work
          NgayBatDau: '2025-01-15T10:00:00Z',
          NgayKetThuc: '2025-01-15T16:00:00Z',
          SoGioTinChiQuyDoi: 8,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      // Should succeed - backward compatible
      expect(res.status).toBe(200);
      expect(body.error).toBeUndefined();
      expect(body.created).toBe(3);
    });

    it('accepts request with only LoaiHoatDong (partial optional fields)', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners)
        .mockResolvedValueOnce([{ inserted: 3 }]);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Research Project',
          MaDanhMuc: ACTIVITY_ID,
          LoaiHoatDong: 'NghienCuu', // ✅ Only this field provided
          SoGioTinChiQuyDoi: 10,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.created).toBe(3);
    });

    it('accepts request with only YeuCauMinhChung (partial optional fields)', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners)
        .mockResolvedValueOnce([{ inserted: 3 }]);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Workshop',
          MaDanhMuc: ACTIVITY_ID,
          YeuCauMinhChung: false, // ✅ Only this field provided
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.created).toBe(3);
    });

    it('validates LoaiHoatDong must be a string when provided', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Training',
          MaDanhMuc: ACTIVITY_ID,
          LoaiHoatDong: 12345, // ❌ Invalid: should be string
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
      expect(body.details).toBeDefined();
    });

    it('validates YeuCauMinhChung must be a boolean when provided', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Training',
          MaDanhMuc: ACTIVITY_ID,
          YeuCauMinhChung: 'yes', // ❌ Invalid: should be boolean
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
      expect(body.details).toBeDefined();
    });
  });

  describe('Basic Validation', () => {
    it('returns 401 when user is not authenticated', async () => {
      (getCurrentUser as any).mockResolvedValueOnce(null);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 403 when user role is not DonVi or SoYTe', async () => {
      const user = { id: USER_ID, username: 'user@example.com', role: 'NguoiHanhNghe', unitId: null };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe('Forbidden');
    });

    it('validates required field TenHoatDong is present', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          // TenHoatDong missing
          MaDanhMuc: ACTIVITY_ID,
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });

    it('validates TenHoatDong is not empty', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: '', // Empty string
          MaDanhMuc: ACTIVITY_ID,
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });

    it('validates SoGioTinChiQuyDoi must be non-negative', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Test Activity',
          MaDanhMuc: ACTIVITY_ID,
          SoGioTinChiQuyDoi: -5, // Negative value
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });

    it('validates NgayBatDau must be valid ISO datetime when provided', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Test Activity',
          MaDanhMuc: ACTIVITY_ID,
          NgayBatDau: 'invalid-date', // Invalid datetime
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });

    it('validates MaDanhMuc must be valid UUID when provided', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Test Activity',
          MaDanhMuc: 'not-a-uuid', // Invalid UUID
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });
  });

  describe('Happy Path', () => {
    it('successfully creates submissions with manual mode', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners) // validatePractitionersTenancy
        .mockResolvedValueOnce([{ inserted: 3 }]); // bulkCreate

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Emergency Response Training',
          MaDanhMuc: ACTIVITY_ID,
          NgayBatDau: '2025-01-20T09:00:00Z',
          NgayKetThuc: '2025-01-20T17:00:00Z',
          SoGioTinChiQuyDoi: 8,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.created).toBe(3);
      expect(body.skipped).toBe(0);
      expect(body.total).toBe(3);
    });

    it('successfully creates submissions with "all" mode', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners) // Resolve practitioners from filters
        .mockResolvedValueOnce([{ inserted: 3 }]); // bulkCreate

      const requestBody = {
        selection: {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: {
            trangThai: 'DangLamViec',
          },
          totalFiltered: 50,
        },
        activity: {
          TenHoatDong: 'Annual Safety Training',
          MaDanhMuc: ACTIVITY_ID,
          SoGioTinChiQuyDoi: 4,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.created).toBe(3);
      expect(body.skipped).toBe(0);
      expect(body.total).toBe(3);
    });

    it('handles duplicates correctly (partial success)', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners)
        .mockResolvedValueOnce([{ inserted: 1 }]); // Only 1 created due to duplicates

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          filters: {},
          totalFiltered: 3,
        },
        activity: {
          TenHoatDong: 'Training Activity',
          MaDanhMuc: ACTIVITY_ID,
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.created).toBe(1);
      expect(body.skipped).toBe(2);
      expect(body.total).toBe(3);
    });

    it('returns empty result when no candidates match filters', async () => {
      const user = { id: USER_ID, username: 'admin@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any).mockResolvedValueOnce([]); // No practitioners found

      const requestBody = {
        selection: {
          mode: 'all',
          selectedIds: [],
          excludedIds: [],
          filters: {
            search: 'NonExistentName',
          },
          totalFiltered: 0,
        },
        activity: {
          TenHoatDong: 'Training',
          SoGioTinChiQuyDoi: 5,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.created).toBe(0);
      expect(body.skipped).toBe(0);
      expect(body.total).toBe(0);
    });
  });

  describe('Real-world Scenario: Wizard Integration', () => {
    it('handles exact payload from bulk submission wizard at step 3', async () => {
      // This simulates the exact scenario from the bug report
      const user = { id: USER_ID, username: 'donvi@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners)
        .mockResolvedValueOnce([{ inserted: 3 }]);

      // Exact payload structure sent by bulk-submission-wizard.tsx:200-206
      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS,
          excludedIds: [],
          totalFiltered: 3,
          filters: {},
        },
        activity: {
          MaDanhMuc: ACTIVITY_ID,
          TenHoatDong: 'COVID-19 Safety Training',
          LoaiHoatDong: 'HoiThao', // Sent by wizard
          YeuCauMinhChung: true, // Sent by wizard
          NgayBatDau: new Date('2025-01-15T10:00:00Z').toISOString(),
          NgayKetThuc: new Date('2025-01-15T16:00:00Z').toISOString(),
          SoGioTinChiQuyDoi: 2.0,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      // Before fix: This would return 400 with "Validation error"
      // After fix: This should succeed
      expect(res.status).toBe(200);
      expect(body.error).toBeUndefined();
      expect(body.created).toBe(3);
      expect(body.skipped).toBe(0);
      expect(body.total).toBe(3);
    });

    it('handles wizard payload with different activity types', async () => {
      const user = { id: USER_ID, username: 'donvi@unit1.vn', role: 'DonVi', unitId: UNIT_ID };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (db.query as any)
        .mockResolvedValueOnce(mockPractitioners.slice(0, 2))
        .mockResolvedValueOnce([{ inserted: 2 }]);

      const requestBody = {
        selection: {
          mode: 'manual',
          selectedIds: PRACTITIONER_IDS.slice(0, 2),
          excludedIds: [],
          totalFiltered: 2,
          filters: {},
        },
        activity: {
          MaDanhMuc: ACTIVITY_ID,
          TenHoatDong: 'Medical Research Project',
          LoaiHoatDong: 'NghienCuu', // Research type
          YeuCauMinhChung: false,
          NgayBatDau: new Date('2025-02-01T09:00:00Z').toISOString(),
          NgayKetThuc: new Date('2025-06-30T17:00:00Z').toISOString(),
          SoGioTinChiQuyDoi: 40,
        },
      };

      const res = await makeRequest(requestBody);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.created).toBe(2);
    });
  });
});
