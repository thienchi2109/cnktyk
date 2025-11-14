import React from 'react';
import { act } from 'react';
import { Root, createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/dashboard/unit-comparison-grid', () => ({
  UnitComparisonGrid: () => null,
}));

vi.mock('@/components/dashboard/unit-detail-sheet', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importer: () => Promise<any>) => {
    let Loaded: React.ComponentType<any> | null = null;
    importer().then((mod) => {
      Loaded = (mod as any).default || mod;
    });
    return (props: any) => (Loaded ? <Loaded {...props} /> : null);
  },
}));

import { DohDashboard } from '@/components/dashboard/doh-dashboard';

const originalFetch = global.fetch;
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('DohDashboard deep link handling', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as any).React = React;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    global.fetch = originalFetch;
  });

  it('fetches unit summary when initial unit is absent from current grid page', async () => {
    const getUrl = (input: RequestInfo | URL): string => {
      if (typeof input === 'string') {
        return input;
      }
      if (input instanceof URL) {
        return input.href;
      }
      return (input as Request).url;
    };

    const jsonResponse = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = getUrl(input);

      if (url.includes('/api/system/metrics')) {
        return jsonResponse({
          success: true,
          data: {
            totalUnits: 11,
            totalPractitioners: 100,
            activePractitioners: 90,
            complianceRate: 80,
            totalSubmissions: 50,
            pendingApprovals: 5,
            approvedThisMonth: 10,
            rejectedThisMonth: 2,
            totalCreditsAwarded: 500,
            atRiskPractitioners: 4,
          },
        });
      }

      if (url.includes('/api/system/units-performance')) {
        return jsonResponse({
          success: true,
          data: {
            items: [],
            totalItems: 0,
            totalPages: 0,
            page: 1,
            pageSize: 20,
            filters: { search: '' },
            sort: [],
          },
        });
      }

      if (url.includes('/api/system/unit-summary/unit-deep')) {
        return jsonResponse({
          success: true,
          data: {
            id: 'unit-deep',
            name: 'Đơn vị đặc biệt',
            type: 'BenhVien',
            totalPractitioners: 12,
            activePractitioners: 10,
            compliantPractitioners: 8,
            complianceRate: 80,
            pendingApprovals: 1,
            totalCredits: 150,
          },
        });
      }

      if (url.includes('/api/units/unit-deep/metrics')) {
        return jsonResponse({
          success: true,
          data: {
            totalPractitioners: 12,
            activePractitioners: 10,
            complianceRate: 80,
            pendingApprovals: 1,
            approvedThisMonth: 2,
            rejectedThisMonth: 0,
            atRiskPractitioners: 1,
          },
        });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DohDashboard userId="soyte" initialUnitId="unit-deep" />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await flushPromises();
      await flushPromises();
    });

    const summaryCall = fetchMock.mock.calls.find(([input]) =>
      getUrl(input).includes('/api/system/unit-summary/unit-deep'),
    );
    expect(summaryCall).toBeTruthy();

    expect(
      fetchMock.mock.calls.some(([input]) => getUrl(input).includes('/api/units/unit-deep/metrics')),
    ).toBe(true);
  });
});
