import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnitDetailSheet from '@/components/dashboard/unit-detail-sheet';
import type { UnitMetrics } from '@/types/dashboard';
import { unitMetricsQueryKey } from '@/lib/dashboard/unit-metrics';

const successPayload = (data: Partial<UnitMetrics> = {}) => ({
  success: true,
  data: {
    totalPractitioners: 42,
    activePractitioners: 38,
    complianceRate: 88,
    pendingApprovals: 3,
    approvedThisMonth: 5,
    rejectedThisMonth: 1,
    atRiskPractitioners: 2,
    ...data,
  },
});

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('UnitDetailSheet', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  const originalFetch = global.fetch;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as any).React = React;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    global.fetch = vi.fn();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    queryClient.clear();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const renderSheet = (props: Partial<React.ComponentProps<typeof UnitDetailSheet>> = {}) => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <UnitDetailSheet
            open
            unitId="unit-1"
            onOpenChange={() => {}}
            unitSummary={{
              id: 'unit-1',
              name: 'Đơn vị 1',
              type: 'Bệnh viện',
              totalPractitioners: 42,
              activePractitioners: 38,
              compliantPractitioners: 30,
              complianceRate: 88,
              pendingApprovals: 3,
              totalCredits: 120,
            }}
            {...props}
          />
        </QueryClientProvider>,
      );
    });
  };

  it('fetches metrics on open and renders the fetched values', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(successPayload()),
    });

    renderSheet();

    await act(async () => {
      await flushPromises();
      await flushPromises();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/units/unit-1/metrics', expect.any(Object));
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Đang hoạt động');
    expect(bodyText).toContain('38');
  });

  it('displays initial data immediately when provided', () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(successPayload({ activePractitioners: 50 })),
    });

    renderSheet({
      initialData: {
        totalPractitioners: 60,
        activePractitioners: 55,
        complianceRate: 92,
        pendingApprovals: 4,
        approvedThisMonth: 6,
        rejectedThisMonth: 1,
        atRiskPractitioners: 2,
        totalCredits: 140,
        compliantPractitioners: 40,
      },
    });

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('55');
  });

  it('shows error feedback when the fetch fails', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    renderSheet();

    await act(async () => {
      await flushPromises();
      await flushPromises();
    });

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Không thể tải số liệu đơn vị');
  });

  it('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(successPayload()),
    });

    renderSheet({ onOpenChange });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('stores fetched metrics under the expected query key', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(successPayload({ pendingApprovals: 9 })),
    });

    renderSheet();

    await act(async () => {
      await flushPromises();
    });

    const cached = queryClient.getQueryData(unitMetricsQueryKey('unit-1')) as UnitMetrics | undefined;
    expect(cached?.pendingApprovals).toBe(9);
  });
});
