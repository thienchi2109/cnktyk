import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { toast } from '@/hooks/use-toast';
import { useEvidenceFile } from '@/hooks/use-evidence-file';
import { renderHook } from '../utils/render-hook';

const originalFetch = global.fetch;
const originalOpen = window.open;

describe('useEvidenceFile', () => {
  beforeEach(() => {
    (toast as any).mockReset();
    global.fetch = vi.fn();
    window.open = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.open = originalOpen;
    vi.restoreAllMocks();
  });

  it('downloads files using attachment disposition and anchor click', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ signedUrl: 'https://signed-url' }),
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      await result.current.downloadFile('/api/files/foo');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${window.location.origin}/api/files/foo?action=signed-url&disposition=attachment`
    );
    expect(clickSpy).toHaveBeenCalled();
    expect(result.current.activeAction).toBeNull();
  });

  it('tracks loading state for download operations', async () => {
    let resolveFetch: ((value: any) => void) | null = null;
    (global.fetch as any).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFetch = resolve;
        })
    );
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      const pending = result.current.downloadFile('/api/files/foo', 'foo.pdf');
      await Promise.resolve(); // flush state update
      expect(result.current.isLoading).toBe(true);
      expect(result.current.activeAction).toBe('download');

      resolveFetch?.({
        ok: true,
        json: async () => ({ signedUrl: 'https://signed-url' }),
      });

      await pending;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeAction).toBeNull();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('opens view action in new tab with inline disposition', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ signedUrl: 'https://inline-url' }),
    });
    (window.open as any).mockReturnValue({});
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      await result.current.viewFile('/api/files/foo');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${window.location.origin}/api/files/foo?action=signed-url&disposition=inline`
    );
    expect(window.open).toHaveBeenCalledWith('https://inline-url', '_blank', 'noopener');
    expect(result.current.activeAction).toBeNull();
  });

  it('resets loading state and surfaces server errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'File not found' }),
    });
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      const pending = result.current.viewFile('/api/files/missing');
      await Promise.resolve(); // flush state update
      expect(result.current.isLoading).toBe(true);
      expect(result.current.activeAction).toBe('view');
      await pending;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeAction).toBeNull();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'File not found',
      })
    );
  });

  it('warns when popup is blocked', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ signedUrl: 'https://inline-url' }),
    });
    (window.open as any).mockReturnValue(null);
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      await result.current.viewFile('/api/files/foo');
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringMatching(/Popup/),
      })
    );
  });

  it('shows retry guidance when network fails', async () => {
    (global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      await result.current.downloadFile('/api/files/network');
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringMatching(/vui lòng thử lại/i),
      })
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('normalizes direct R2 URLs to use the local signing endpoint', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ signedUrl: 'https://inline-url' }),
    });
    (window.open as any).mockReturnValue({});
    const { result } = renderHook(() => useEvidenceFile());
    const r2Url =
      'https://pub-3e9de70adc454c988e484c10a520c045.r2.dev/evidence/sample.pdf';

    await act(async () => {
      await result.current.viewFile(r2Url);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${window.location.origin}/api/files/evidence/sample.pdf?action=signed-url&disposition=inline`
    );
  });

  it('validates empty fileUrl before fetching', async () => {
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      await result.current.downloadFile('');
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Thiếu'),
      })
    );
    expect(result.current.isLoading).toBe(false);
  });
});
