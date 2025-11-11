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

  it('shows toast when fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'File not found' }),
    });
    const { result } = renderHook(() => useEvidenceFile());

    await act(async () => {
      await result.current.downloadFile('/api/files/missing');
    });

    expect(toast).toHaveBeenCalled();
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
});
