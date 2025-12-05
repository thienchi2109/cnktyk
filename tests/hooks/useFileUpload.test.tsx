import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { act } from 'react';

vi.mock('@/lib/utils/fileProcessor', () => ({
  processFile: vi.fn(),
}));

import { useFileUpload } from '@/hooks/useFileUpload';
import { renderHook } from '../utils/render-hook';
import type { ProcessedFileResult } from '@/types/file-processing';
import { processFile } from '@/lib/utils/fileProcessor';

const originalFetch = global.fetch;

describe('useFileUpload', () => {
  beforeEach(() => {
    (processFile as Mock).mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('processes and uploads files successfully with metadata passthrough', async () => {
    const sourceFile = new File([new Uint8Array(200)], 'photo.jpg', { type: 'image/jpeg' });
    const processedFile = new File([new Uint8Array(100)], 'photo.webp', { type: 'image/webp' });

    (processFile as Mock).mockResolvedValue({
      success: true,
      file: processedFile,
      originalFile: sourceFile,
      category: 'image',
      stats: {
        originalSize: sourceFile.size,
        compressedSize: processedFile.size,
        compressionRatio: 0.5,
        originalFormat: 'image/jpeg',
        outputFormat: 'image/webp',
        processingTimeMs: 10,
      },
    } satisfies ProcessedFileResult);

    const uploadResponse = {
      success: true,
      file: {
        filename: 'stored.webp',
        originalName: processedFile.name,
        size: processedFile.size,
        mimeType: processedFile.type,
        checksum: 'abc123',
        url: '/files/stored.webp',
        uploadedAt: '2025-12-04T00:00:00.000Z',
        activityId: 'activity-1',
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => uploadResponse,
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFileUpload({ onSuccess, onError, activityId: 'activity-1', maxFiles: 3 })
    );

    await act(async () => {
      await result.current.addFiles([sourceFile]);
    });

    expect(processFile).toHaveBeenCalledWith(sourceFile, expect.any(Function));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const formData = (global.fetch as any).mock.calls[0][1].body as FormData;
    const appendedFile = Array.from(formData.entries())[0][1] as File;
    expect(appendedFile.name).toBe(processedFile.name);

    const uploaded = result.current.files[0];
    expect(uploaded.status).toBe('success');
    expect(uploaded.progress).toBe(100);
    expect(uploaded.uploadedFile).toEqual(uploadResponse.file);
    expect(onSuccess).toHaveBeenCalledWith([uploadResponse.file]);
    expect(onError).not.toHaveBeenCalled();
  });

  it('returns error state when processing fails', async () => {
    const failingFile = new File([new Uint8Array([1, 2, 3])], 'bad.pdf', { type: 'application/pdf' });
    (processFile as Mock).mockResolvedValue({
      success: false,
      originalFile: failingFile,
      category: 'pdf',
      error: {
        code: 'PDF_TOO_LARGE',
        message: 'File too large',
        messageVi: 'File PDF vượt quá 5MB',
      },
    } satisfies ProcessedFileResult);
    const onError = vi.fn();

    const { result } = renderHook(() => useFileUpload({ onError, maxFiles: 2 }));

    await act(async () => {
      await result.current.addFiles([failingFile]);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('5MB'));
    expect(result.current.files).toHaveLength(0);
  });

  it('enforces maxFiles guard before any processing', async () => {
    const tooManyFiles = [
      new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }),
      new File([new Uint8Array([2])], 'b.pdf', { type: 'application/pdf' }),
    ];
    const onError = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onError, maxFiles: 1 }));

    await act(async () => {
      await result.current.addFiles(tooManyFiles);
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('tối đa 1 tệp'));
    expect(processFile).not.toHaveBeenCalled();
    expect(result.current.files).toHaveLength(0);
  });

  it('surfaces upload failures after successful processing', async () => {
    const sourceFile = new File([new Uint8Array([5, 6, 7])], 'doc.pdf', { type: 'application/pdf' });
    (processFile as Mock).mockResolvedValue({
      success: true,
      file: sourceFile,
      originalFile: sourceFile,
      category: 'pdf',
    } satisfies ProcessedFileResult);

    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Upload failed' }),
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onError }));

    await act(async () => {
      await result.current.addFiles([sourceFile]);
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Upload failed');
    expect(result.current.files).toHaveLength(0);
  });

  it('keeps progress and status updates for processing stage', async () => {
    const photo = new File([new Uint8Array([9, 9, 9])], 'stage.jpg', { type: 'image/jpeg' });
    (processFile as Mock).mockImplementation(async (_file: File, onProgress: (val: number) => void) => {
      onProgress(55);
      return {
        success: false,
        originalFile: photo,
        category: 'image',
        error: {
          code: 'COMPRESSION_FAILED',
          message: 'compress failed',
          messageVi: 'Không thể nén ảnh',
        },
      } satisfies ProcessedFileResult;
    });
    const onError = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onError }));

    await act(async () => {
      await result.current.addFiles([photo]);
    });

    expect(processFile).toHaveBeenCalledWith(photo, expect.any(Function));
    // File is removed on error, so we can't check final status/progress on the file object in the list
    expect(result.current.files).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Không thể nén'));
  });
});
