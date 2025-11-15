import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/auth/server', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/db/repositories', () => ({
  donViRepo: {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/units/validation', () => ({
  UnitValidationError: class UnitValidationError extends Error {
    code: string;
    status: number;
    details?: unknown;

    constructor(code: string, message: string, status = 400, details?: unknown) {
      super(message);
      this.name = 'UnitValidationError';
      this.code = code;
      this.status = status;
      this.details = details;
    }
  },
  ensureParentUnitActive: vi.fn(),
  ensureNoCircularReference: vi.fn(),
  ensureUnitDeletable: vi.fn(),
  getUnitDependencyCounts: vi.fn(),
}));

vi.mock('@/lib/audit/logger', () => ({
  AuditLogger: {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logDelete: vi.fn(),
  },
}));

vi.mock('@/lib/audit/utils', () => ({
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/db/schemas', () => ({
  CreateDonViSchema: {
    parse: vi.fn((data) => data),
  },
  UpdateDonViSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { GET, POST } from '@/app/api/units/route';
import { GET as GET_BY_ID, PUT, DELETE } from '@/app/api/units/[id]/route';
import { requireAuth } from '@/lib/auth/server';
import { donViRepo } from '@/lib/db/repositories';
import {
  ensureParentUnitActive,
  ensureNoCircularReference,
  ensureUnitDeletable,
  getUnitDependencyCounts,
  UnitValidationError,
} from '@/lib/units/validation';
import { AuditLogger } from '@/lib/audit/logger';
import { CreateDonViSchema, UpdateDonViSchema } from '@/lib/db/schemas';

// Helper functions to create requests
async function makeGetRequest(queryParams?: Record<string, string>) {
  const url = new URL('http://localhost/api/units');
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  const req = new Request(url.toString(), { method: 'GET' });
  return (await GET(req as any)) as Response;
}

async function makePostRequest(body: any) {
  const req = new Request('http://localhost/api/units', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await POST(req as any)) as Response;
}

async function makeGetByIdRequest(id: string, withDependencies = false) {
  const url = new URL(`http://localhost/api/units/${id}`);
  if (withDependencies) {
    url.searchParams.set('withDependencies', 'true');
  }
  const req = new Request(url.toString(), { method: 'GET' });
  const params = Promise.resolve({ id });
  return (await GET_BY_ID(req as any, { params } as any)) as Response;
}

async function makePutRequest(id: string, body: any) {
  const req = new Request(`http://localhost/api/units/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const params = Promise.resolve({ id });
  return (await PUT(req as any, { params } as any)) as Response;
}

async function makeDeleteRequest(id: string) {
  const req = new Request(`http://localhost/api/units/${id}`, {
    method: 'DELETE',
  });
  const params = Promise.resolve({ id });
  return (await DELETE(req as any, { params } as any)) as Response;
}

// Mock data
const mockSoYTeUser = {
  user: {
    id: 'soyteuser-uuid',
    username: 'soyteadmin',
    role: 'SoYTe' as const,
    unitId: null,
  },
};

const mockDonViUser = {
  user: {
    id: 'donviuser-uuid',
    username: 'donviadmin',
    role: 'DonVi' as const,
    unitId: 'unit-123',
  },
};

const mockUnit = {
  MaDonVi: 'unit-123',
  TenDonVi: 'Bệnh viện A',
  CapQuanLy: 'BenhVien' as const,
  MaDonViCha: null,
  TrangThai: true,
  CreatedAt: new Date('2024-01-01'),
  UpdatedAt: new Date('2024-01-01'),
};

const mockChildUnit = {
  MaDonVi: 'unit-456',
  TenDonVi: 'Phòng Nội khoa',
  CapQuanLy: 'PhongKham' as const,
  MaDonViCha: 'unit-123',
  TrangThai: true,
  CreatedAt: new Date('2024-01-02'),
  UpdatedAt: new Date('2024-01-02'),
};

describe('Units API - GET /api/units', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all units for SoYTe role', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findAll).mockResolvedValue([mockUnit, mockChildUnit]);

    const response = await makeGetRequest();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.units).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(donViRepo.findAll).toHaveBeenCalled();
  });

  it('should return only own unit for DonVi role', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockDonViUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);

    const response = await makeGetRequest();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.units).toHaveLength(1);
    expect(data.units[0].MaDonVi).toBe('unit-123');
    expect(donViRepo.findById).toHaveBeenCalledWith('unit-123');
  });

  it('should filter units by search query', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findAll).mockResolvedValue([mockUnit, mockChildUnit]);

    const response = await makeGetRequest({ search: 'Nội khoa' });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.units).toHaveLength(1);
    expect(data.units[0].TenDonVi).toBe('Phòng Nội khoa');
  });

  it('should exclude inactive units by default', async () => {
    const inactiveUnit = { ...mockUnit, TrangThai: false };
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findAll).mockResolvedValue([mockUnit, inactiveUnit]);

    const response = await makeGetRequest();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.units).toHaveLength(1);
    expect(data.units[0].TrangThai).toBe(true);
  });

  it('should include inactive units when requested', async () => {
    const inactiveUnit = { ...mockUnit, MaDonVi: 'unit-inactive', TrangThai: false };
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findAll).mockResolvedValue([mockUnit, inactiveUnit]);

    const response = await makeGetRequest({ includeInactive: 'true' });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.units).toHaveLength(2);
  });
});

describe('Units API - POST /api/units', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create new unit with valid data as SoYTe', async () => {
    const newUnitData = {
      TenDonVi: 'Bệnh viện B',
      CapQuanLy: 'BenhVien' as const,
      MaDonViCha: null,
      TrangThai: true,
    };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(CreateDonViSchema.parse).mockReturnValue(newUnitData);
    vi.mocked(ensureParentUnitActive).mockResolvedValue(null);
    vi.mocked(donViRepo.create).mockResolvedValue({ ...newUnitData, MaDonVi: 'new-unit-id' } as any);

    const response = await makePostRequest(newUnitData);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.unit).toBeDefined();
    expect(data.unit.TenDonVi).toBe('Bệnh viện B');
    expect(donViRepo.create).toHaveBeenCalledWith(expect.objectContaining(newUnitData));
    expect(AuditLogger.logCreate).toHaveBeenCalledWith(
      'DonVi',
      'new-unit-id',
      expect.anything(),
      'soyteuser-uuid',
      '127.0.0.1'
    );
  });

  it('should create unit with parent unit', async () => {
    const newUnitData = {
      TenDonVi: 'Phòng Khám Nhi',
      CapQuanLy: 'PhongKham' as const,
      MaDonViCha: 'unit-123',
      TrangThai: true,
    };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(CreateDonViSchema.parse).mockReturnValue(newUnitData);
    vi.mocked(ensureParentUnitActive).mockResolvedValue(mockUnit as any);
    vi.mocked(donViRepo.create).mockResolvedValue({ ...newUnitData, MaDonVi: 'new-child-unit-id' } as any);

    const response = await makePostRequest(newUnitData);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.unit.MaDonViCha).toBe('unit-123');
    expect(ensureParentUnitActive).toHaveBeenCalledWith('unit-123');
  });

  it('should reject creation by DonVi role', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockDonViUser as any);

    const response = await makePostRequest({ TenDonVi: 'Test Unit' });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should reject creation with invalid parent unit', async () => {
    const newUnitData = {
      TenDonVi: 'Test Unit',
      CapQuanLy: 'PhongKham' as const,
      MaDonViCha: 'invalid-parent',
      TrangThai: true,
    };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(CreateDonViSchema.parse).mockReturnValue(newUnitData);
    vi.mocked(ensureParentUnitActive).mockRejectedValue(
      new UnitValidationError('PARENT_NOT_FOUND', 'Đơn vị cha không tồn tại.')
    );

    const response = await makePostRequest(newUnitData);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('PARENT_NOT_FOUND');
    expect(data.message).toBe('Đơn vị cha không tồn tại.');
  });

  it('should reject creation with inactive parent unit', async () => {
    const newUnitData = {
      TenDonVi: 'Test Unit',
      CapQuanLy: 'PhongKham' as const,
      MaDonViCha: 'inactive-parent',
      TrangThai: true,
    };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(CreateDonViSchema.parse).mockReturnValue(newUnitData);
    vi.mocked(ensureParentUnitActive).mockRejectedValue(
      new UnitValidationError('PARENT_INACTIVE', 'Đơn vị cha đang bị vô hiệu hóa.')
    );

    const response = await makePostRequest(newUnitData);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('PARENT_INACTIVE');
  });
});

describe('Units API - GET /api/units/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unit details as SoYTe', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);

    const response = await makeGetByIdRequest('unit-123');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.unit).toBeDefined();
    expect(data.unit.MaDonVi).toBe('unit-123');
    expect(donViRepo.findById).toHaveBeenCalledWith('unit-123');
  });

  it('should return unit with dependencies when requested', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(getUnitDependencyCounts).mockResolvedValue({
      childUnits: 2,
      practitioners: 5,
      userAccounts: 3,
    });

    const response = await makeGetByIdRequest('unit-123', true);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.unit).toBeDefined();
    expect(data.dependents).toBeDefined();
    expect(data.dependents.childUnits).toBe(2);
    expect(data.dependents.practitioners).toBe(5);
    expect(data.dependents.userAccounts).toBe(3);
  });

  it('should return 404 for non-existent unit', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(null);

    const response = await makeGetByIdRequest('non-existent');
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Unit not found');
  });

  it('should reject access by non-SoYTe role', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockDonViUser as any);

    const response = await makeGetByIdRequest('unit-123');

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });
});

describe('Units API - PUT /api/units/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update unit name', async () => {
    const updates = { TenDonVi: 'Bệnh viện A - Đổi tên' };
    const updatedUnit = { ...mockUnit, ...updates };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(UpdateDonViSchema.parse).mockReturnValue(updates);
    vi.mocked(donViRepo.update).mockResolvedValue(updatedUnit);

    const response = await makePutRequest('unit-123', updates);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.unit.TenDonVi).toBe('Bệnh viện A - Đổi tên');
    expect(donViRepo.update).toHaveBeenCalledWith('unit-123', updates);
    expect(AuditLogger.logUpdate).toHaveBeenCalled();
  });

  it('should update parent unit with validation', async () => {
    const updates = { MaDonViCha: 'new-parent-123' };
    const updatedUnit = { ...mockUnit, ...updates };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(UpdateDonViSchema.parse).mockReturnValue(updates);
    vi.mocked(ensureParentUnitActive).mockResolvedValue({} as any);
    vi.mocked(ensureNoCircularReference).mockResolvedValue(undefined);
    vi.mocked(donViRepo.update).mockResolvedValue(updatedUnit);

    const response = await makePutRequest('unit-123', updates);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(ensureParentUnitActive).toHaveBeenCalledWith('new-parent-123');
    expect(ensureNoCircularReference).toHaveBeenCalledWith('unit-123', 'new-parent-123');
  });

  it('should reject update with circular reference', async () => {
    const updates = { MaDonViCha: 'unit-456' };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(UpdateDonViSchema.parse).mockReturnValue(updates);
    vi.mocked(ensureParentUnitActive).mockResolvedValue({} as any);
    vi.mocked(ensureNoCircularReference).mockRejectedValue(
      new UnitValidationError('CIRCULAR_REFERENCE', 'Không thể chọn đơn vị con làm đơn vị cha.')
    );

    const response = await makePutRequest('unit-123', updates);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('CIRCULAR_REFERENCE');
  });

  it('should return 404 for non-existent unit', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(null);

    const response = await makePutRequest('non-existent', { TenDonVi: 'Test' });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Unit not found');
  });

  it('should reject update with no changes', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(UpdateDonViSchema.parse).mockReturnValue({});

    const response = await makePutRequest('unit-123', {});

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No changes provided');
  });

  it('should reject update by non-SoYTe role', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockDonViUser as any);

    const response = await makePutRequest('unit-123', { TenDonVi: 'Test' });

    expect(response.status).toBe(403);
  });
});

describe('Units API - DELETE /api/units/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete unit without dependencies', async () => {
    const deactivatedUnit = { ...mockUnit, TrangThai: false };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(ensureUnitDeletable).mockResolvedValue({
      childUnits: 0,
      practitioners: 0,
      userAccounts: 0,
    });
    vi.mocked(donViRepo.update).mockResolvedValue(deactivatedUnit);

    const response = await makeDeleteRequest('unit-123');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Đơn vị đã được vô hiệu hóa.');
    expect(donViRepo.update).toHaveBeenCalledWith('unit-123', { TrangThai: false });
    expect(AuditLogger.logDelete).toHaveBeenCalled();
  });

  it('should reject deletion of unit with child units', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(ensureUnitDeletable).mockRejectedValue(
      new UnitValidationError(
        'UNIT_HAS_DEPENDENCIES',
        'Không thể vô hiệu hóa đơn vị đang có đơn vị con, nhân sự hoặc tài khoản hoạt động.',
        409,
        { childUnits: 2, practitioners: 0, userAccounts: 0 }
      )
    );

    const response = await makeDeleteRequest('unit-123');
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('UNIT_HAS_DEPENDENCIES');
    expect(data.details).toEqual({ childUnits: 2, practitioners: 0, userAccounts: 0 });
  });

  it('should reject deletion of unit with practitioners', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(ensureUnitDeletable).mockRejectedValue(
      new UnitValidationError(
        'UNIT_HAS_DEPENDENCIES',
        'Không thể vô hiệu hóa đơn vị đang có đơn vị con, nhân sự hoặc tài khoản hoạt động.',
        409,
        { childUnits: 0, practitioners: 5, userAccounts: 0 }
      )
    );

    const response = await makeDeleteRequest('unit-123');
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.details.practitioners).toBe(5);
  });

  it('should reject deletion of unit with user accounts', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(mockUnit);
    vi.mocked(ensureUnitDeletable).mockRejectedValue(
      new UnitValidationError(
        'UNIT_HAS_DEPENDENCIES',
        'Không thể vô hiệu hóa đơn vị đang có đơn vị con, nhân sự hoặc tài khoản hoạt động.',
        409,
        { childUnits: 0, practitioners: 0, userAccounts: 3 }
      )
    );

    const response = await makeDeleteRequest('unit-123');
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.details.userAccounts).toBe(3);
  });

  it('should handle already inactive unit', async () => {
    const inactiveUnit = { ...mockUnit, TrangThai: false };

    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(inactiveUnit);

    const response = await makeDeleteRequest('unit-123');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Unit already inactive');
    expect(donViRepo.update).not.toHaveBeenCalled();
  });

  it('should return 404 for non-existent unit', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSoYTeUser as any);
    vi.mocked(donViRepo.findById).mockResolvedValue(null);

    const response = await makeDeleteRequest('non-existent');

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Unit not found');
  });

  it('should reject deletion by non-SoYTe role', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockDonViUser as any);

    const response = await makeDeleteRequest('unit-123');

    expect(response.status).toBe(403);
  });
});
