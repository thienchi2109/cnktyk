import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { compressImage, processFile } from '@/lib/utils/fileProcessor';
import { validatePDF, validateFileType } from '@/lib/utils/fileValidation';
import { FILE_SIGNATURES, MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_MB } from '@/types/file-processing';

// Polyfill Blob.arrayBuffer for jsdom if missing
Blob.prototype.arrayBuffer = function () {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(this);
  });
};

const mockImageCompression = vi.hoisted(() => {
  const fn = vi.fn(async (_file: File, options: any) => {
    options?.onProgress?.(42);
    const compressedBytes = new Uint8Array(200 * 1024); // 200KB
    return new Blob([compressedBytes], { type: options?.fileType ?? 'image/webp' });
  });
  (fn as any).getDataUrlFromFile = vi.fn(async () => 'data:image/webp;base64,AAAA');
  return fn;
});

vi.mock('browser-image-compression', () => ({
  __esModule: true,
  default: mockImageCompression,
}));

const OriginalImage = global.Image;

class MockImage {
  width = 800;
  height = 600;
  onload: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

describe('fileProcessor utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error jsdom Image override for dimension loading
    global.Image = MockImage;
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  it('compresses images to WebP and reports stats with progress', async () => {
    const originalBytes = new Uint8Array(2 * 1024 * 1024); // 2MB
    const originalFile = new File([originalBytes], 'photo.jpg', { type: 'image/jpeg' });
    const onProgress = vi.fn();

    const result = await compressImage(originalFile, undefined, onProgress);

    expect(result.success).toBe(true);
    expect(result.compressedFile?.type).toBe('image/webp');
    expect(result.stats).toMatchObject({
      originalSize: originalFile.size,
      compressedSize: 200 * 1024,
      outputFormat: 'image/webp',
    });
    expect(onProgress).toHaveBeenCalledWith(42);
  });

  it('rejects PDFs larger than 5MB with bilingual error', () => {
    const tooLargeBytes = new Uint8Array(MAX_PDF_SIZE_BYTES + 1);
    const pdfFile = new File([tooLargeBytes], 'large.pdf', { type: 'application/pdf' });

    const validation = validatePDF(pdfFile);

    expect(validation.isValid).toBe(false);
    expect(validation.error?.code).toBe('PDF_TOO_LARGE');
    expect(validation.error?.messageVi).toContain(`${MAX_PDF_SIZE_MB}MB`);
  });

  it('accepts PDF exactly at the limit', () => {
    const atLimitBytes = new Uint8Array(MAX_PDF_SIZE_BYTES);
    const pdfFile = new File([atLimitBytes], 'limit.pdf', { type: 'application/pdf' });

    const validation = validatePDF(pdfFile);

    expect(validation.isValid).toBe(true);
  });

  it('validates JPEG file signatures before processing', async () => {
    const jpegSignature = FILE_SIGNATURES['image/jpeg'];
    const paddedBytes = new Uint8Array([...jpegSignature, 0x00, 0x11, 0x22]);
    const jpegFile = new File([paddedBytes], 'photo.jpg', { type: 'image/jpeg' });

    const validation = await validateFileType(jpegFile);

    expect(validation.isValid).toBe(true);
    expect(validation.category).toBe('image');
    expect(validation.matchesSignature).toBe(true);
  });

  it('rejects files when MIME type and signature do not match', async () => {
    const pngSignature = FILE_SIGNATURES['image/png'];
    const fakePdf = new File([new Uint8Array([...pngSignature, 0x00, 0x01])], 'fake.pdf', {
      type: 'application/pdf',
    });

    const validation = await validateFileType(fakePdf);

    expect(validation.isValid).toBe(false);
    expect(validation.matchesSignature).toBe(false);
    expect(validation.error).toMatch(/signature/);
  });

  it('processes valid images end-to-end through compression flow', async () => {
    const jpegSignature = FILE_SIGNATURES['image/jpeg'];
    const paddedBytes = new Uint8Array([...jpegSignature, ...new Uint8Array(1024)]);
    const imageFile = new File([paddedBytes], 'image.jpg', { type: 'image/jpeg' });

    const result = await processFile(imageFile, vi.fn());

    expect(result.success).toBe(true);
    expect(result.category).toBe('image');
    expect(result.file).toBeInstanceOf(File);
    expect((result.file as File).type).toBe('image/webp');
    expect(result.stats?.originalSize).toBe(imageFile.size);
  });

  it('blocks unsupported file types with INVALID_FILE_TYPE error', async () => {
    const textFile = new File([new Uint8Array([1, 2, 3])], 'notes.txt', { type: 'text/plain' });

    const result = await processFile(textFile);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_FILE_TYPE');
  });

  it('halts processing for oversized PDFs with proper error code', async () => {
    const pdfSignature = FILE_SIGNATURES['application/pdf'];
    const tooLargeBytes = new Uint8Array(MAX_PDF_SIZE_BYTES + 10);
    tooLargeBytes.set(pdfSignature, 0); // Set signature at start
    const pdfFile = new File([tooLargeBytes], 'oversized.pdf', { type: 'application/pdf' });

    const result = await processFile(pdfFile);

    expect(result.success).toBe(false);
    expect(result.category).toBe('pdf');
    expect(result.error?.code).toBe('PDF_TOO_LARGE');
  });

  it('fails fast when compressed image cannot be decoded', async () => {
    const ErrorImage = class {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        // Use queueMicrotask to trigger error in next microtask
        queueMicrotask(() => {
          if (this.onerror) {
            this.onerror();
          }
        });
      }
    };
    // @ts-expect-error override Image to simulate decode failure
    global.Image = ErrorImage;

    // Use JPEG so it goes through compression path (not WebP optimization check)
    const jpegSignature = FILE_SIGNATURES['image/jpeg'];
    const originalFile = new File(
      [new Uint8Array([...jpegSignature, ...new Uint8Array(1024)])],
      'bad.jpg',
      { type: 'image/jpeg' }
    );
    const result = await compressImage(originalFile, undefined, vi.fn());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('COMPRESSION_FAILED');
  });

  it('does not hang on malformed WebP in fast-path optimization check', async () => {
    const ErrorImage = class {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        // Trigger error asynchronously to simulate decode failure
        queueMicrotask(() => {
          if (this.onerror) {
            this.onerror();
          }
        });
      }
    };
    // @ts-expect-error override Image to simulate decode failure
    global.Image = ErrorImage;

    // Small WebP file that would normally take the fast-path
    const webpSignature = FILE_SIGNATURES['image/webp'];
    const smallWebP = new File(
      [new Uint8Array([...webpSignature, ...new Uint8Array(512)])], // 512 bytes < 1MB
      'malformed.webp',
      { type: 'image/webp' }
    );

    // Should not hang - error should be caught and proceed to compression
    const result = await compressImage(smallWebP, undefined, vi.fn());

    // The fast-path check fails, so it proceeds to compression
    // Compression will also fail due to ErrorImage mock, resulting in COMPRESSION_FAILED
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('COMPRESSION_FAILED');
  });
});
