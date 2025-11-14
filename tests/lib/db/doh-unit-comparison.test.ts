import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: mocks.query,
    queryOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getDohUnitComparisonPage } from '@/lib/db/repositories';

describe('getDohUnitComparisonPage', () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it('reports total count even when requested page has no rows', async () => {
    mocks.query.mockResolvedValueOnce([]); // paginated rows
    mocks.query.mockResolvedValueOnce([{ total_count: '30' }]);

    const result = await getDohUnitComparisonPage({ page: 5, pageSize: 20 });

    expect(result.items).toHaveLength(0);
    expect(result.totalItems).toBe(30);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(5);
  });
});
