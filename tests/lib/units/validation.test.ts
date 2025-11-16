import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({
  db: {
    query: vi.fn(),
    queryOne: vi.fn(),
  },
}));

vi.mock('@/lib/db/repositories', () => ({
  donViRepo: {
    findById: vi.fn(),
  },
}));

import {
  UnitValidationError,
  ensureParentUnitActive,
  ensureNoCircularReference,
  getUnitDependencyCounts,
  ensureUnitDeletable,
} from '@/lib/units/validation';
import { db } from '@/lib/db/client';
import { donViRepo } from '@/lib/db/repositories';

describe('Unit Validation - UnitValidationError', () => {
  it('should create error with code and status', () => {
    const error = new UnitValidationError('TEST_ERROR', 'Test message', 400);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnitValidationError');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.status).toBe(400);
  });

  it('should include details when provided', () => {
    const details = { field: 'test', value: 123 };
    const error = new UnitValidationError('TEST_ERROR', 'Test message', 400, details);

    expect(error.details).toEqual(details);
  });

  it('should use default status 400', () => {
    const error = new UnitValidationError('TEST_ERROR', 'Test message');

    expect(error.status).toBe(400);
  });
});

describe('Unit Validation - ensureParentUnitActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when parentId is null', async () => {
    const result = await ensureParentUnitActive(null);

    expect(result).toBeNull();
    expect(donViRepo.findById).not.toHaveBeenCalled();
  });

  it('should return parent when it exists and is active', async () => {
    const parentUnit = {
      MaDonVi: 'parent-123',
      TenDonVi: 'Parent Unit',
      CapQuanLy: 'BenhVien' as const,
      MaDonViCha: null,
      TrangThai: true,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    };

    vi.mocked(donViRepo.findById).mockResolvedValue(parentUnit);

    const result = await ensureParentUnitActive('parent-123');

    expect(result).toEqual(parentUnit);
    expect(donViRepo.findById).toHaveBeenCalledWith('parent-123');
  });

  it('should throw PARENT_NOT_FOUND when parent does not exist', async () => {
    vi.mocked(donViRepo.findById).mockResolvedValue(null);

    await expect(ensureParentUnitActive('non-existent')).rejects.toThrow(UnitValidationError);
    await expect(ensureParentUnitActive('non-existent')).rejects.toThrow(
      'Đơn vị cha không tồn tại.'
    );

    try {
      await ensureParentUnitActive('non-existent');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).code).toBe('PARENT_NOT_FOUND');
    }
  });

  it('should throw PARENT_INACTIVE when parent is inactive', async () => {
    const inactiveParent = {
      MaDonVi: 'parent-123',
      TenDonVi: 'Inactive Parent',
      CapQuanLy: 'BenhVien' as const,
      MaDonViCha: null,
      TrangThai: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    };

    vi.mocked(donViRepo.findById).mockResolvedValue(inactiveParent);

    await expect(ensureParentUnitActive('parent-123')).rejects.toThrow(
      'Đơn vị cha đang bị vô hiệu hóa.'
    );

    try {
      await ensureParentUnitActive('parent-123');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).code).toBe('PARENT_INACTIVE');
    }
  });
});

describe('Unit Validation - ensureNoCircularReference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return void when unitId is null', async () => {
    await expect(ensureNoCircularReference(null, 'parent-123')).resolves.toBeUndefined();
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should return void when parentId is null', async () => {
    await expect(ensureNoCircularReference('unit-123', null)).resolves.toBeUndefined();
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should throw when unit is its own parent', async () => {
    await expect(ensureNoCircularReference('unit-123', 'unit-123')).rejects.toThrow(
      'Một đơn vị không thể là đơn vị cha của chính nó.'
    );

    try {
      await ensureNoCircularReference('unit-123', 'unit-123');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).code).toBe('CIRCULAR_REFERENCE');
    }
  });

  it('should pass when no circular reference exists', async () => {
    vi.mocked(db.query).mockResolvedValue([]);

    await expect(ensureNoCircularReference('unit-123', 'parent-456')).resolves.toBeUndefined();

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WITH RECURSIVE ancestors'),
      ['parent-456', 'unit-123']
    );
  });

  it('should throw when circular reference is detected', async () => {
    // Simulate finding the unit in its own ancestry chain
    vi.mocked(db.query).mockResolvedValue([{ MaDonVi: 'unit-123' }]);

    await expect(ensureNoCircularReference('unit-123', 'child-456')).rejects.toThrow(
      'Không thể chọn đơn vị con làm đơn vị cha.'
    );

    try {
      await ensureNoCircularReference('unit-123', 'child-456');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).code).toBe('CIRCULAR_REFERENCE');
    }
  });

  it('should detect multi-level circular reference', async () => {
    // Unit A -> Unit B -> Unit C, trying to set Unit C as parent of Unit A
    vi.mocked(db.query).mockResolvedValue([{ MaDonVi: 'unit-a' }]);

    await expect(ensureNoCircularReference('unit-a', 'unit-c')).rejects.toThrow(
      'Không thể chọn đơn vị con làm đơn vị cha.'
    );
  });
});

describe('Unit Validation - getUnitDependencyCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all zeros when unit has no dependencies', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' });

    const result = await getUnitDependencyCounts('unit-123');

    expect(result).toEqual({
      childUnits: 0,
      practitioners: 0,
      userAccounts: 0,
    });

    expect(db.queryOne).toHaveBeenCalledTimes(3);
    expect(db.queryOne).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM "DonVi"'),
      ['unit-123']
    );
    expect(db.queryOne).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM "NhanVien"'),
      ['unit-123']
    );
    expect(db.queryOne).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM "TaiKhoan"'),
      ['unit-123']
    );
  });

  it('should return correct counts when unit has dependencies', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '3' })  // child units
      .mockResolvedValueOnce({ count: '10' }) // practitioners
      .mockResolvedValueOnce({ count: '5' }); // user accounts

    const result = await getUnitDependencyCounts('unit-123');

    expect(result).toEqual({
      childUnits: 3,
      practitioners: 10,
      userAccounts: 5,
    });
  });

  it('should handle null counts gracefully', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await getUnitDependencyCounts('unit-123');

    expect(result).toEqual({
      childUnits: 0,
      practitioners: 0,
      userAccounts: 0,
    });
  });

  it('should only count active dependencies', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '2' })
      .mockResolvedValueOnce({ count: '5' })
      .mockResolvedValueOnce({ count: '3' });

    await getUnitDependencyCounts('unit-123');

    // Verify queries filter by active status
    expect(db.queryOne).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('"TrangThai" = true'),
      ['unit-123']
    );
    expect(db.queryOne).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"TrangThaiLamViec" = \'DangLamViec\''),
      ['unit-123']
    );
    expect(db.queryOne).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('"TrangThai" = true'),
      ['unit-123']
    );
  });
});

describe('Unit Validation - ensureUnitDeletable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass when unit has no dependencies', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' });

    const result = await ensureUnitDeletable('unit-123');

    expect(result).toEqual({
      childUnits: 0,
      practitioners: 0,
      userAccounts: 0,
    });
  });

  it('should throw when unit has child units', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '2' })
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' });

    await expect(ensureUnitDeletable('unit-123')).rejects.toThrow(
      'Không thể vô hiệu hóa đơn vị đang có đơn vị con, nhân sự hoặc tài khoản hoạt động.'
    );

    try {
      await ensureUnitDeletable('unit-123');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).code).toBe('UNIT_HAS_DEPENDENCIES');
      expect((error as UnitValidationError).status).toBe(409);
      expect((error as UnitValidationError).details).toEqual({
        childUnits: 2,
        practitioners: 0,
        userAccounts: 0,
      });
    }
  });

  it('should throw when unit has practitioners', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '5' })
      .mockResolvedValueOnce({ count: '0' });

    try {
      await ensureUnitDeletable('unit-123');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).details).toEqual({
        childUnits: 0,
        practitioners: 5,
        userAccounts: 0,
      });
    }
  });

  it('should throw when unit has user accounts', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '3' });

    try {
      await ensureUnitDeletable('unit-123');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).details).toEqual({
        childUnits: 0,
        practitioners: 0,
        userAccounts: 3,
      });
    }
  });

  it('should throw when unit has multiple types of dependencies', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '2' })
      .mockResolvedValueOnce({ count: '10' })
      .mockResolvedValueOnce({ count: '5' });

    try {
      await ensureUnitDeletable('unit-123');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitValidationError);
      expect((error as UnitValidationError).code).toBe('UNIT_HAS_DEPENDENCIES');
      expect((error as UnitValidationError).status).toBe(409);
      expect((error as UnitValidationError).details).toEqual({
        childUnits: 2,
        practitioners: 10,
        userAccounts: 5,
      });
    }
  });

  it('should allow deletion when counts are exactly at boundary (0)', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' });

    await expect(ensureUnitDeletable('unit-123')).resolves.toBeDefined();
  });

  it('should reject deletion when any count is > 0', async () => {
    // Test with just 1 child unit
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '1' })
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' });

    await expect(ensureUnitDeletable('unit-123')).rejects.toThrow(UnitValidationError);
  });
});

describe('Unit Validation - Integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate complete create workflow with parent', async () => {
    const parentUnit = {
      MaDonVi: 'parent-123',
      TenDonVi: 'Parent Hospital',
      CapQuanLy: 'BenhVien' as const,
      MaDonViCha: null,
      TrangThai: true,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    };

    vi.mocked(donViRepo.findById).mockResolvedValue(parentUnit);

    const result = await ensureParentUnitActive('parent-123');

    expect(result).toEqual(parentUnit);
    expect(donViRepo.findById).toHaveBeenCalledWith('parent-123');
  });

  it('should validate complete update workflow changing parent', async () => {
    const newParent = {
      MaDonVi: 'new-parent-456',
      TenDonVi: 'New Parent',
      CapQuanLy: 'SoYTe' as const,
      MaDonViCha: null,
      TrangThai: true,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    };

    vi.mocked(donViRepo.findById).mockResolvedValue(newParent);
    vi.mocked(db.query).mockResolvedValue([]);

    // Validate parent is active
    const parent = await ensureParentUnitActive('new-parent-456');
    expect(parent).toEqual(newParent);

    // Validate no circular reference
    await expect(
      ensureNoCircularReference('unit-123', 'new-parent-456')
    ).resolves.toBeUndefined();
  });

  it('should validate complete delete workflow', async () => {
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' })
      .mockResolvedValueOnce({ count: '0' });

    const counts = await ensureUnitDeletable('unit-123');

    expect(counts).toEqual({
      childUnits: 0,
      practitioners: 0,
      userAccounts: 0,
    });
  });

  it('should reject complex hierarchy manipulation', async () => {
    // Scenario: Unit A has child Unit B, trying to make Unit B the parent of Unit A
    vi.mocked(db.query).mockResolvedValue([{ MaDonVi: 'unit-a' }]);

    await expect(ensureNoCircularReference('unit-a', 'unit-b')).rejects.toThrow(
      'Không thể chọn đơn vị con làm đơn vị cha.'
    );
  });
});
