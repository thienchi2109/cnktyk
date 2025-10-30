import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  UnitComparisonGrid,
  UnitSortState,
  UnitComparisonRow,
} from '@/components/dashboard/unit-comparison-grid';

const makeUnit = (index: number): UnitComparisonRow => ({
  id: `unit-${index + 1}`,
  name: `Đơn vị ${index + 1}`,
  type: index % 2 === 0 ? 'Bệnh viện' : 'Phòng khám',
  totalPractitioners: 120 + index,
  activePractitioners: 80 + (index % 10),
  compliantPractitioners: 60 + (index % 7),
  complianceRate: 75 + (index % 15),
  pendingApprovals: index % 5,
  totalCredits: 230 + index * 3,
});

describe('UnitComparisonGrid', () => {
  let container: HTMLDivElement;
  let root: Root;

  const defaultSort: UnitSortState[] = [
    { field: 'compliance', direction: 'desc' },
    { field: 'name', direction: 'asc' },
  ];

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the first page summary for a high-volume dataset', () => {
    const rows = Array.from({ length: 20 }, (_, index) => makeUnit(index));
    const onSortChange = vi.fn();

    act(() => {
      root.render(
        <UnitComparisonGrid
          rows={rows}
          isLoading={false}
          error={null}
          page={1}
          pageSize={20}
          totalItems={60}
          totalPages={3}
          sort={defaultSort}
          onSortChange={onSortChange}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          onRetry={() => {}}
        />,
      );
    });

    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(20);
    expect(container.textContent).toContain('Hiển thị 1 - 20 trên tổng 60 đơn vị');
  });

  it('invokes sort change handlers for single and multi-column interactions', () => {
    const rows = Array.from({ length: 5 }, (_, index) => makeUnit(index));
    const sortSpy = vi.fn();
    let sortState: UnitSortState[] = defaultSort;

    const renderWithSort = () => {
      act(() => {
        root.render(
          <UnitComparisonGrid
            rows={rows}
            isLoading={false}
            error={null}
            page={1}
            pageSize={20}
            totalItems={5}
            totalPages={1}
            sort={sortState}
            onSortChange={(next) => {
              sortState = next;
              sortSpy(next);
              renderWithSort();
            }}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            onRetry={() => {}}
          />,
        );
      });
    };

    renderWithSort();

    const headerButtons = Array.from(container.querySelectorAll('thead th button'));
    const complianceButton = headerButtons.find((btn) =>
      btn.textContent?.includes('Tỷ lệ tuân thủ'),
    );
    const nameButton = headerButtons.find((btn) => btn.textContent?.includes('Đơn vị'));

    expect(complianceButton).toBeTruthy();
    expect(nameButton).toBeTruthy();

    act(() => {
      complianceButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(sortSpy).toHaveBeenLastCalledWith([{ field: 'compliance', direction: 'asc' }]);

    act(() => {
      nameButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    });

    expect(sortSpy).toHaveBeenLastCalledWith([
      { field: 'compliance', direction: 'asc' },
      { field: 'name', direction: 'desc' },
    ]);
  });

  it('renders detail link to canonical route', () => {
    const rows: UnitComparisonRow[] = [
      {
        id: 'unit-1',
        name: 'Đơn vị 1',
        type: 'BenhVien',
        totalPractitioners: 10,
        activePractitioners: 8,
        compliantPractitioners: 6,
        complianceRate: 75,
        pendingApprovals: 1,
        totalCredits: 100,
      },
    ];

    act(() => {
      root.render(
        <UnitComparisonGrid
          rows={rows}
          isLoading={false}
          error={null}
          page={1}
          pageSize={20}
          totalItems={1}
          totalPages={1}
          sort={defaultSort}
          onSortChange={() => {}}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          onRetry={() => {}}
        />,
      );
    });

    const link = container.querySelector('a[href="/dashboard/units/unit-1"]');
    expect(link).toBeTruthy();
  });

  it('triggers pagination handlers', () => {
    const rows = Array.from({ length: 20 }, (_, index) => makeUnit(index));
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    act(() => {
      root.render(
        <UnitComparisonGrid
          rows={rows}
          isLoading={false}
          error={null}
          page={2}
          pageSize={20}
          totalItems={60}
          totalPages={3}
          sort={defaultSort}
          onSortChange={() => {}}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          onRetry={() => {}}
        />,
      );
    });

    const nextButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === 'Sau',
    );
    const pageSizeSelect = container.querySelector('select');

    expect(nextButton).toBeTruthy();
    expect(pageSizeSelect).toBeTruthy();

    act(() => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onPageChange).toHaveBeenCalledWith(3);

    act(() => {
      if (pageSizeSelect) {
        pageSizeSelect.value = '30';
        pageSizeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    expect(onPageSizeChange).toHaveBeenCalledWith(30);
  });

  it('renders error state and invokes retry handler', () => {
    const onRetry = vi.fn();

    act(() => {
      root.render(
        <UnitComparisonGrid
          rows={[]}
          isLoading={false}
          error="Không thể tải dữ liệu"
          page={1}
          pageSize={20}
          totalItems={0}
          totalPages={0}
          sort={defaultSort}
          onSortChange={() => {}}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          onRetry={onRetry}
        />,
      );
    });

    expect(container.textContent).toContain('Không thể tải dữ liệu');

    const retryButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Thử lại'),
    );

    expect(retryButton).toBeTruthy();

    act(() => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
