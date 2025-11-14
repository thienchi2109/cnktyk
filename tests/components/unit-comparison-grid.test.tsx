import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  UnitComparisonGrid,
  UnitSortState,
  UnitComparisonRow,
} from '@/components/dashboard/unit-comparison-grid';

vi.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');

const DropdownMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const DropdownMenuTrigger = ({ children }: { children: React.ReactElement }) => children;

  const DropdownMenuContent = ({ children, ...props }: { children: React.ReactNode }) => (
    <div role="menu" {...props}>
      {children}
    </div>
  );

  const DropdownMenuItem = React.forwardRef<HTMLButtonElement, any>(
    ({ children, onSelect, ...props }, ref) => (
      <button
        ref={ref}
        role="menuitem"
        onClick={(event) => {
          event.preventDefault();
          onSelect?.(event);
        }}
        {...props}
      >
        {children}
      </button>
    ),
  );

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  };
});

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
    vi.useRealTimers();
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
          onUnitDetailClick={() => {}}
          onUnitDetailHover={() => {}}
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
            onUnitDetailClick={() => {}}
            onUnitDetailHover={() => {}}
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

  it('invokes detail callbacks for hover prefetch and click', () => {
    vi.useFakeTimers();
    const rows: UnitComparisonRow[] = [makeUnit(0)];
    const clickSpy = vi.fn();
    const hoverSpy = vi.fn();

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
          onUnitDetailClick={clickSpy}
          onUnitDetailHover={hoverSpy}
        />,
      );
    });

    const actionTrigger = container.querySelector('button[aria-label="Thao tác Đơn vị 1"]');
    expect(actionTrigger).toBeTruthy();

    act(() => {
      actionTrigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    act(() => {
      vi.advanceTimersByTime(160);
      vi.runOnlyPendingTimers();
    });

    expect(hoverSpy).toHaveBeenCalledWith(rows[0].id);

    act(() => {
      actionTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const menuItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
      el.textContent?.includes('Xem chi tiết'),
    );
    expect(menuItem).toBeTruthy();

    act(() => {
      menuItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const [unitId, payload, trigger] = clickSpy.mock.calls[0];
    expect(unitId).toBe(rows[0].id);
    expect(payload).toEqual(rows[0]);
    expect(trigger).toBe(actionTrigger);
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
          onUnitDetailClick={() => {}}
          onUnitDetailHover={() => {}}
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
          onUnitDetailClick={() => {}}
          onUnitDetailHover={() => {}}
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
