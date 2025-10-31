import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  requireAuth: mocks.requireAuth,
  requireRole: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: mocks.query,
  },
}));

import { GET } from '@/app/api/system/metrics/route';

describe('GET /api/system/metrics', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.requireAuth.mockReset();
  });

  it('excludes SoYTe oversight units from totalUnits KPI', async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      user: { id: 'soyte-admin', role: 'SoYTe' },
    });

    mocks.query
      .mockResolvedValueOnce([{ count: '11' }])
      .mockResolvedValueOnce([{ count: '200' }])
      .mockResolvedValueOnce([{ count: '150' }])
      .mockResolvedValueOnce([{ count: '500' }])
      .mockResolvedValueOnce([{ count: '42' }])
      .mockResolvedValueOnce([{ count: '25' }])
      .mockResolvedValueOnce([{ count: '7' }])
      .mockResolvedValueOnce([{ total: '1234.5' }])
      .mockResolvedValueOnce([{ compliant_count: '120' }])
      .mockResolvedValueOnce([{ count: '18' }]);

    const response = (await GET(
      new Request('http://localhost/api/system/metrics'),
    )) as Response;

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.totalUnits).toBe(11);

    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toContain('"CapQuanLy" != $2');
    expect(params).toEqual(['HoatDong', 'SoYTe']);
  });
});
