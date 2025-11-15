import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/repositories', () => ({
  danhMucHoatDongRepo: {
    findById: vi.fn(),
    findAll: vi.fn(),
    findGlobal: vi.fn(),
    findByUnit: vi.fn(),
    findAccessible: vi.fn(),
    filterGlobalCatalog: vi.fn(),
    filterUnitCatalog: vi.fn(),
    createWithOwnership: vi.fn(),
    updateWithOwnership: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    adoptToGlobal: vi.fn(),
    assertCanMutate: vi.fn(),
    countGlobal: vi.fn(),
    countByUnit: vi.fn(),
  },
  nhatKyHeThongRepo: {
    logCatalogChange: vi.fn(),
  },
}));

vi.mock('@/lib/db/schemas', () => ({
  CreateDanhMucHoatDongSchema: {
    parse: vi.fn((data) => data),
  },
  UpdateDanhMucHoatDongSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { GET, POST } from '@/app/api/activities/route';
import { GET as GET_BY_ID, PUT, DELETE } from '@/app/api/activities/[id]/route';
import { POST as RESTORE } from '@/app/api/activities/[id]/restore/route';
import { getCurrentUser } from '@/lib/auth/server';
import { danhMucHoatDongRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';

async function makeGetRequest(queryParams?: Record<string, string>) {
  const url = new URL('http://localhost/api/activities');
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  const req = new Request(url.toString(), { method: 'GET' });
  return (await GET(req as any)) as Response;
}

async function makePostRequest(body: any) {
  const req = new Request('http://localhost/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await POST(req as any)) as Response;
}

async function makeGetByIdRequest(id: string) {
  const req = new Request(`http://localhost/api/activities/${id}`, {
    method: 'GET',
  });
  const params = Promise.resolve({ id });
  return (await GET_BY_ID(req as any, { params } as any)) as Response;
}

async function makePutRequest(id: string, body: any) {
  const req = new Request(`http://localhost/api/activities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const params = Promise.resolve({ id });
  return (await PUT(req as any, { params } as any)) as Response;
}

async function makeDeleteRequest(id: string) {
  const req = new Request(`http://localhost/api/activities/${id}`, {
    method: 'DELETE',
  });
  const params = Promise.resolve({ id });
  return (await DELETE(req as any, { params } as any)) as Response;
}

async function makeRestoreRequest(id: string) {
  const req = new Request(`http://localhost/api/activities/${id}/restore`, {
    method: 'POST',
  });
  const params = Promise.resolve({ id });
  return (await RESTORE(req as any, { params } as any)) as Response;
}

const mockGlobalActivity = {
  MaDanhMuc: 'activity-global-1',
  TenDanhMuc: 'Global Activity 1',
  LoaiHoatDong: 'HoiThao',
  DonViTinh: 'gio',
  TyLeQuyDoi: 1.0,
  GioToiThieu: null,
  GioToiDa: null,
  YeuCauMinhChung: true,
  HieuLucTu: null,
  HieuLucDen: null,
  MaDonVi: null,
  NguoiTao: 'soyte-user-1',
  NguoiCapNhat: null,
  TaoLuc: new Date(),
  CapNhatLuc: new Date(),
  TrangThai: 'Active',
  DaXoaMem: false,
};

const mockUnitActivity = {
  MaDanhMuc: 'activity-unit-1',
  TenDanhMuc: 'Unit Activity 1',
  LoaiHoatDong: 'KhoaHoc',
  DonViTinh: 'gio',
  TyLeQuyDoi: 1.0,
  GioToiThieu: null,
  GioToiDa: null,
  YeuCauMinhChung: true,
  HieuLucTu: null,
  HieuLucDen: null,
  MaDonVi: 'unit-1',
  NguoiTao: 'donvi-user-1',
  NguoiCapNhat: null,
  TaoLuc: new Date(),
  CapNhatLuc: new Date(),
  TrangThai: 'Active',
  DaXoaMem: false,
};

describe('GET /api/activities - List Activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SoYTe can see all global and unit activities', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);
    (danhMucHoatDongRepo.filterGlobalCatalog as any).mockResolvedValueOnce({ items: [mockGlobalActivity], total: 1 });
    (danhMucHoatDongRepo.filterUnitCatalog as any).mockResolvedValueOnce({ items: [mockUnitActivity], total: 1 });

    const res = await makeGetRequest({ scope: 'all' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.global).toHaveLength(1);
    expect(json.unit).toHaveLength(1);
    expect(json.permissions.canCreateGlobal).toBe(true);
    expect(json.permissions.canAdoptToGlobal).toBe(true);
    expect(danhMucHoatDongRepo.filterUnitCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ includeAllUnits: true })
    );
  });

  it('DonVi can see global activities and their unit activities', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);
    (danhMucHoatDongRepo.filterGlobalCatalog as any).mockResolvedValueOnce({ items: [mockGlobalActivity], total: 1 });
    (danhMucHoatDongRepo.filterUnitCatalog as any).mockResolvedValueOnce({ items: [mockUnitActivity], total: 1 });

    const res = await makeGetRequest({ scope: 'all' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.global).toHaveLength(1);
    expect(json.unit).toHaveLength(1);
    expect(json.permissions.canCreateUnit).toBe(true);
    expect(json.permissions.canCreateGlobal).toBe(false);
    expect(json.permissions.canAdoptToGlobal).toBe(false);
    expect(danhMucHoatDongRepo.filterUnitCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 'unit-1' })
    );
  });

  it('DonVi without unitId gets 403', async () => {
    const user = { id: 'donvi-2', username: 'donvi@orphan.vn', role: 'DonVi', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const res = await makeGetRequest();
    expect(res.status).toBe(403);
    expect(danhMucHoatDongRepo.filterUnitCatalog).not.toHaveBeenCalled();
  });

  it('filters by scope=global returns only global activities', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);
    (danhMucHoatDongRepo.filterGlobalCatalog as any).mockResolvedValueOnce({ items: [mockGlobalActivity], total: 1 });

    const res = await makeGetRequest({ scope: 'global' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.global).toHaveLength(1);
    expect(json.unit).toHaveLength(0);
    expect(danhMucHoatDongRepo.filterUnitCatalog).not.toHaveBeenCalled();
  });

  it('filters by scope=unit returns only unit activities', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);
    (danhMucHoatDongRepo.filterUnitCatalog as any).mockResolvedValueOnce({ items: [mockUnitActivity], total: 1 });

    const res = await makeGetRequest({ scope: 'unit' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.global).toHaveLength(0);
    expect(json.unit).toHaveLength(1);
    expect(danhMucHoatDongRepo.filterGlobalCatalog).not.toHaveBeenCalled();
  });

  it('other roles only see global activities', async () => {
    const user = { id: 'practitioner-1', username: 'prac@unit1.vn', role: 'NguoiHanhNghe', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);
    (danhMucHoatDongRepo.filterGlobalCatalog as any).mockResolvedValueOnce({ items: [mockGlobalActivity], total: 1 });

    const res = await makeGetRequest();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.global).toHaveLength(1);
    expect(json.unit).toHaveLength(0);
    expect(danhMucHoatDongRepo.filterUnitCatalog).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid pagination inputs', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const res = await makeGetRequest({ page: '0', limit: '-10' });
    expect(res.status).toBe(400);
    expect(danhMucHoatDongRepo.filterGlobalCatalog).not.toHaveBeenCalled();
  });
});

describe('POST /api/activities - Create Activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DonVi can create unit activity with auto-injected unitId', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const newActivity = {
      TenDanhMuc: 'New Unit Activity',
      LoaiHoatDong: 'Đào tạo',
      DonViTinh: 'Giờ',
      TyLeQuyDoi: 1.0,
      YeuCauMinhChung: true,
    };

    const created = { ...mockUnitActivity, MaDanhMuc: 'new-activity-1', ...newActivity };
    (danhMucHoatDongRepo.createWithOwnership as any).mockResolvedValueOnce(created);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePostRequest(newActivity);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.MaDonVi).toBe('unit-1');
    expect(danhMucHoatDongRepo.createWithOwnership).toHaveBeenCalledWith(
      expect.any(Object),
      'donvi-1',
      'unit-1'
    );
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'donvi-1',
      'CREATE',
      'new-activity-1',
      expect.objectContaining({
        scope: 'unit',
        unitId: 'unit-1',
        actorRole: 'DonVi',
      })
    );
  });

  it('DonVi cannot inject MaDonVi (security)', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const newActivity = {
      TenDanhMuc: 'New Activity',
      LoaiHoatDong: 'Đào tạo',
      DonViTinh: 'Giờ',
      TyLeQuyDoi: 1.0,
      YeuCauMinhChung: true,
      MaDonVi: 'unit-999', // Attempt to hijack another unit
    };

    const created = { ...mockUnitActivity, MaDanhMuc: 'new-activity-1', MaDonVi: 'unit-1' };
    (danhMucHoatDongRepo.createWithOwnership as any).mockResolvedValueOnce(created);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePostRequest(newActivity);

    expect(res.status).toBe(201);
    // Verify unitId was injected correctly, ignoring client input
    expect(danhMucHoatDongRepo.createWithOwnership).toHaveBeenCalledWith(
      expect.any(Object),
      'donvi-1',
      'unit-1' // Should be user's unit, not 'unit-999'
    );
  });

  it('SoYTe can create global activity', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const newActivity = {
      TenDanhMuc: 'New Global Activity',
      LoaiHoatDong: 'Hội thảo',
      DonViTinh: 'Giờ',
      TyLeQuyDoi: 1.0,
      YeuCauMinhChung: true,
    };

    const created = { ...mockGlobalActivity, MaDanhMuc: 'new-activity-2', ...newActivity };
    (danhMucHoatDongRepo.createWithOwnership as any).mockResolvedValueOnce(created);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePostRequest(newActivity);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.MaDonVi).toBeNull();
    expect(danhMucHoatDongRepo.createWithOwnership).toHaveBeenCalledWith(
      expect.any(Object),
      'soyte-1',
      null
    );
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'soyte-1',
      'CREATE',
      'new-activity-2',
      expect.objectContaining({
        scope: 'global',
        actorRole: 'SoYTe',
      })
    );
  });

  it('SoYTe can create unit-specific activity', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const newActivity = {
      TenDanhMuc: 'Unit Activity by SoYTe',
      LoaiHoatDong: 'Đào tạo',
      DonViTinh: 'Giờ',
      TyLeQuyDoi: 1.0,
      YeuCauMinhChung: true,
      MaDonVi: 'unit-5',
    };

    const created = { ...mockUnitActivity, MaDanhMuc: 'new-activity-3', ...newActivity };
    (danhMucHoatDongRepo.createWithOwnership as any).mockResolvedValueOnce(created);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePostRequest(newActivity);

    expect(res.status).toBe(201);
    expect(danhMucHoatDongRepo.createWithOwnership).toHaveBeenCalledWith(
      expect.any(Object),
      'soyte-1',
      'unit-5'
    );
  });

  it('other roles cannot create activities', async () => {
    const user = { id: 'practitioner-1', username: 'prac@unit1.vn', role: 'NguoiHanhNghe', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const res = await makePostRequest({});
    expect(res.status).toBe(403);
  });
});

describe('GET /api/activities/[id] - Get Activity Details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns activity details for authenticated user', async () => {
    const user = { id: 'user-1', username: 'user@example.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);
    (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockGlobalActivity);

    const res = await makeGetByIdRequest('activity-global-1');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.MaDanhMuc).toBe('activity-global-1');
  });

  it('returns 404 for non-existent activity', async () => {
    const user = { id: 'user-1', username: 'user@example.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);
    (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);

    const res = await makeGetByIdRequest('non-existent');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/activities/[id] - Update Activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DonVi can update their own unit activity', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const updateData = { TenDanhMuc: 'Updated Activity Name' };
    const updated = { ...mockUnitActivity, ...updateData };

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: true,
      activity: mockUnitActivity,
    });
    (danhMucHoatDongRepo.updateWithOwnership as any).mockResolvedValueOnce(updated);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePutRequest('activity-unit-1', updateData);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.TenDanhMuc).toBe('Updated Activity Name');
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'donvi-1',
      'UPDATE',
      'activity-unit-1',
      expect.objectContaining({
        scope: 'unit',
        actorRole: 'DonVi',
      })
    );
  });

  it('DonVi cannot update global activity', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: false,
      reason: 'Cannot modify global activities',
      activity: mockGlobalActivity,
    });
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePutRequest('activity-global-1', { TenDanhMuc: 'Attempt' });

    expect(res.status).toBe(403);
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'donvi-1',
      'UPDATE_DENIED',
      'activity-global-1',
      expect.objectContaining({
        reason: 'Cannot modify global activities',
      })
    );
  });

  it('DonVi cannot update another unit activity', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const otherUnitActivity = { ...mockUnitActivity, MaDonVi: 'unit-2' };

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: false,
      reason: 'Can only modify activities from your unit',
      activity: otherUnitActivity,
    });
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePutRequest('activity-unit-2', { TenDanhMuc: 'Attempt' });

    expect(res.status).toBe(403);
  });

  it('SoYTe can adopt unit activity to global', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const adopted = { ...mockUnitActivity, MaDonVi: null };

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: true,
      activity: mockUnitActivity,
    });
    (danhMucHoatDongRepo.adoptToGlobal as any).mockResolvedValueOnce(adopted);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePutRequest('activity-unit-1', { MaDonVi: null });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.MaDonVi).toBeNull();
    expect(danhMucHoatDongRepo.adoptToGlobal).toHaveBeenCalledWith('activity-unit-1', 'soyte-1');
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'soyte-1',
      'ADOPT_TO_GLOBAL',
      'activity-unit-1',
      expect.objectContaining({
        scopeBefore: 'unit',
        scopeAfter: 'global',
      })
    );
  });

  it('SoYTe can update any activity', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const updateData = { TenDanhMuc: 'Updated by SoYTe' };
    const updated = { ...mockGlobalActivity, ...updateData };

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: true,
      activity: mockGlobalActivity,
    });
    (danhMucHoatDongRepo.updateWithOwnership as any).mockResolvedValueOnce(updated);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makePutRequest('activity-global-1', updateData);

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/activities/[id] - Soft Delete Activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DonVi can soft delete their own unit activity', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const softDeleted = { ...mockUnitActivity, DaXoaMem: true };

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: true,
      activity: mockUnitActivity,
    });
    (danhMucHoatDongRepo.softDelete as any).mockResolvedValueOnce(softDeleted);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makeDeleteRequest('activity-unit-1');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain('soft deleted');
    expect(json.activity.DaXoaMem).toBe(true);
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'donvi-1',
      'SOFT_DELETE',
      'activity-unit-1',
      expect.objectContaining({
        scope: 'unit',
        actorRole: 'DonVi',
      })
    );
  });

  it('DonVi cannot delete global activity', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: false,
      reason: 'Cannot modify global activities',
      activity: mockGlobalActivity,
    });
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makeDeleteRequest('activity-global-1');

    expect(res.status).toBe(403);
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'donvi-1',
      'DELETE_DENIED',
      'activity-global-1',
      expect.objectContaining({
        reason: 'Cannot modify global activities',
      })
    );
  });

  it('SoYTe can soft delete any activity', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const softDeleted = { ...mockGlobalActivity, DaXoaMem: true };

    (danhMucHoatDongRepo.assertCanMutate as any).mockResolvedValueOnce({
      canMutate: true,
      activity: mockGlobalActivity,
    });
    (danhMucHoatDongRepo.softDelete as any).mockResolvedValueOnce(softDeleted);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makeDeleteRequest('activity-global-1');

    expect(res.status).toBe(200);
  });
});

describe('POST /api/activities/[id]/restore - Restore Soft-Deleted Activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DonVi can restore their own soft-deleted unit activity', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const softDeleted = { ...mockUnitActivity, DaXoaMem: true };
    const restored = { ...mockUnitActivity, DaXoaMem: false };

    (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(softDeleted);
    (danhMucHoatDongRepo.restore as any).mockResolvedValueOnce(restored);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makeRestoreRequest('activity-unit-1');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain('restored');
    expect(json.activity.DaXoaMem).toBe(false);
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'donvi-1',
      'RESTORE',
      'activity-unit-1',
      expect.objectContaining({
        scope: 'unit',
        actorRole: 'DonVi',
      })
    );
  });

  it('DonVi cannot restore another unit activity', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const otherUnitActivity = { ...mockUnitActivity, MaDonVi: 'unit-2', DaXoaMem: true };

    (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(otherUnitActivity);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makeRestoreRequest('activity-unit-2');

    expect(res.status).toBe(403);
    expect(nhatKyHeThongRepo.logCatalogChange).toHaveBeenCalledWith(
      'donvi-1',
      'RESTORE_DENIED',
      'activity-unit-2',
      expect.objectContaining({
        reason: 'Can only restore activities from your unit',
      })
    );
  });

  it('returns 400 if activity is not soft-deleted', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(mockUnitActivity); // Not soft-deleted

    const res = await makeRestoreRequest('activity-unit-1');

    expect(res.status).toBe(400);
  });

  it('SoYTe can restore any soft-deleted activity', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const softDeleted = { ...mockGlobalActivity, DaXoaMem: true };
    const restored = { ...mockGlobalActivity, DaXoaMem: false };

    (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(softDeleted);
    (danhMucHoatDongRepo.restore as any).mockResolvedValueOnce(restored);
    (nhatKyHeThongRepo.logCatalogChange as any).mockResolvedValueOnce(undefined);

    const res = await makeRestoreRequest('activity-global-1');

    expect(res.status).toBe(200);
  });
});

describe('Pagination Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('paginates global activities with limit and page', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const mockGlobal = Array.from({ length: 100 }, (_, i) => ({
      ...mockGlobalActivity,
      MaDanhMuc: `global-${i}`,
      TenDanhMuc: `Global Activity ${i}`,
    }));

    (danhMucHoatDongRepo.filterGlobalCatalog as any).mockResolvedValueOnce({
      items: mockGlobal.slice(0, 10),
      total: 100,
    });

    const res = await makeGetRequest({ scope: 'global', page: '1', limit: '10' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.global).toHaveLength(10);
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.limit).toBe(10);
    expect(json.pagination.totalGlobal).toBe(100);
    expect(json.pagination.totalPages.global).toBe(10);
    expect(danhMucHoatDongRepo.filterGlobalCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 })
    );
  });

  it('paginates to page 2 with correct offset', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    const mockUnit = Array.from({ length: 50 }, (_, i) => ({
      ...mockUnitActivity,
      MaDanhMuc: `unit-${i}`,
      TenDanhMuc: `Unit Activity ${i}`,
    }));

    (danhMucHoatDongRepo.filterUnitCatalog as any).mockResolvedValueOnce({
      items: mockUnit.slice(10, 20),
      total: 50,
    });

    const res = await makeGetRequest({ scope: 'unit', page: '2', limit: '10' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.unit).toHaveLength(10);
    expect(json.pagination.page).toBe(2);
    expect(json.pagination.limit).toBe(10);
    expect(json.pagination.totalUnit).toBe(50);
    expect(json.pagination.totalPages.unit).toBe(5);
    expect(danhMucHoatDongRepo.filterUnitCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 'unit-1', limit: 10, offset: 10 })
    );
  });

  it('handles pagination without limit parameter (uses default 25)', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    (danhMucHoatDongRepo.filterGlobalCatalog as any).mockResolvedValueOnce({ items: [], total: 0 });

    await makeGetRequest({ scope: 'global', page: '1' });

    expect(danhMucHoatDongRepo.filterGlobalCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25, offset: 0 })
    );
  });

  it('handles pagination without page parameter (defaults to page 1)', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    (danhMucHoatDongRepo.filterUnitCatalog as any).mockResolvedValueOnce({ items: [], total: 0 });

    await makeGetRequest({ scope: 'unit', limit: '20' });

    expect(danhMucHoatDongRepo.filterUnitCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 'unit-1', limit: 20, offset: 0 })
    );
  });

  it('requests all unit activities for SoYTe tenants', async () => {
    const user = { id: 'soyte-1', username: 'soyte@admin.vn', role: 'SoYTe', unitId: undefined };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    (danhMucHoatDongRepo.filterUnitCatalog as any).mockResolvedValueOnce({ items: [], total: 0 });

    await makeGetRequest({ scope: 'unit', page: '1', limit: '10' });

    expect(danhMucHoatDongRepo.filterUnitCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ includeAllUnits: true, limit: 10, offset: 0 })
    );
  });

  it('returns correct pagination metadata for "all" scope', async () => {
    const user = { id: 'donvi-1', username: 'donvi@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
    (getCurrentUser as any).mockResolvedValueOnce(user);

    (danhMucHoatDongRepo.filterGlobalCatalog as any).mockResolvedValueOnce({
      items: [mockGlobalActivity],
      total: 1,
    });
    (danhMucHoatDongRepo.filterUnitCatalog as any).mockResolvedValueOnce({
      items: [mockUnitActivity],
      total: 1,
    });

    const res = await makeGetRequest({ scope: 'all', page: '1', limit: '10' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pagination.totalGlobal).toBe(1);
    expect(json.pagination.totalUnit).toBe(1);
    expect(json.pagination.totalPages.global).toBe(1);
    expect(json.pagination.totalPages.unit).toBe(1);
  });
});
