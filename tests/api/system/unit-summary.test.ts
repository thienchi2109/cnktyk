import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getSummary: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock('@/lib/db/repositories', () => ({
  getDohUnitComparisonSummary: mocks.getSummary,
}));

import { GET } from '@/app/api/system/unit-summary/[id]/route';

describe('GET /api/system/unit-summary/[id]', () => {
  beforeEach(() => {
    mocks.requireAuth.mockReset();
    mocks.getSummary.mockReset();
  });

  it('returns summary data for authorized SoYTe users', async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      user: { id: 'soyte', role: 'SoYTe' },
    });
    mocks.getSummary.mockResolvedValueOnce({
      id: 'unit-1',
      name: 'Đơn vị 1',
      type: 'BenhVien',
      totalPractitioners: 10,
      activePractitioners: 8,
      compliantPractitioners: 6,
      complianceRate: 75,
      pendingApprovals: 2,
      totalCredits: 120,
    });

    const response = (await GET(new NextRequest('http://localhost/api/system/unit-summary/unit-1'), {
      params: Promise.resolve({ id: 'unit-1' }),
    })) as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: 'unit-1', totalCredits: 120 });
    expect(mocks.getSummary).toHaveBeenCalledWith('unit-1');
  });

  it('rejects non-SoYTe roles with 403', async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      user: { id: 'unit-admin', role: 'DonVi' },
    });

    const response = (await GET(new NextRequest('http://localhost/api/system/unit-summary/unit-2'), {
      params: Promise.resolve({ id: 'unit-2' }),
    })) as Response;

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(mocks.getSummary).not.toHaveBeenCalled();
  });

  it('returns 404 when summary is missing', async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      user: { id: 'soyte', role: 'SoYTe' },
    });
    mocks.getSummary.mockResolvedValueOnce(null);

    const response = (await GET(new NextRequest('http://localhost/api/system/unit-summary/unit-3'), {
      params: Promise.resolve({ id: 'unit-3' }),
    })) as Response;

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
