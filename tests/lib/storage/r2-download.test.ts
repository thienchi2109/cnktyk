import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import { sdkStreamMixin } from '@smithy/util-stream';

// Mock AWS SDK before importing r2Client
const mockSend = vi.fn();
const mockS3Client = vi.fn().mockImplementation(() => ({
  send: mockSend,
}));

vi.mock('@aws-sdk/client-s3', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: mockS3Client,
    GetObjectCommand: vi.fn((params) => ({ params })),
  };
});

describe('R2 Download Functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Set up R2 environment variables
    process.env = {
      ...originalEnv,
      CF_R2_ACCOUNT_ID: 'test-account',
      CF_R2_ACCESS_KEY_ID: 'test-access-key',
      CF_R2_SECRET_ACCESS_KEY: 'test-secret',
      CF_R2_BUCKET_NAME: 'test-bucket',
      CF_R2_ENDPOINT: 'https://test.r2.cloudflarestorage.com',
      CF_R2_PUBLIC_URL: 'https://test.r2.dev',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('downloadFileStream', () => {
    it('returns a readable stream when file exists', async () => {
      // Create a mock readable stream
      const mockBody = Readable.from([Buffer.from('test content')]);
      const sdkStream = sdkStreamMixin(mockBody);

      mockSend.mockResolvedValue({
        Body: sdkStream,
        ContentLength: 12,
        ContentType: 'application/pdf',
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const stream = await r2Client.downloadFileStream('evidence/test.pdf');

      expect(stream).toBeInstanceOf(Readable);

      // Verify command was called with correct params
      expect(mockSend).toHaveBeenCalled();

      // Read stream content
      const chunks: Buffer[] = [];
      for await (const chunk of stream!) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const content = Buffer.concat(chunks).toString();
      expect(content).toBe('test content');
    });

    it('returns null when file does not exist', async () => {
      const notFoundError = new Error('NoSuchKey');
      (notFoundError as any).name = 'NoSuchKey';
      mockSend.mockRejectedValue(notFoundError);

      const { r2Client } = await import('@/lib/storage/r2-client');
      const stream = await r2Client.downloadFileStream('evidence/missing.pdf');

      expect(stream).toBeNull();
    });

    it('returns null when file has NotFound error', async () => {
      const notFoundError = new Error('NotFound');
      (notFoundError as any).name = 'NotFound';
      mockSend.mockRejectedValue(notFoundError);

      const { r2Client } = await import('@/lib/storage/r2-client');
      const stream = await r2Client.downloadFileStream('evidence/missing.pdf');

      expect(stream).toBeNull();
    });

    it('returns null on network errors', async () => {
      mockSend.mockRejectedValue(new Error('Network timeout'));

      const { r2Client } = await import('@/lib/storage/r2-client');
      const stream = await r2Client.downloadFileStream('evidence/test.pdf');

      expect(stream).toBeNull();
    });

    it('returns null when R2 is not configured', async () => {
      process.env.CF_R2_ACCOUNT_ID = '';

      vi.resetModules();
      const { r2Client } = await import('@/lib/storage/r2-client');
      const stream = await r2Client.downloadFileStream('evidence/test.pdf');

      expect(stream).toBeNull();
    });

    it('handles large files with streaming', async () => {
      // Create a large mock stream (10KB)
      const largeContent = Buffer.alloc(10240, 'a');
      const mockBody = Readable.from([largeContent]);
      const sdkStream = sdkStreamMixin(mockBody);

      mockSend.mockResolvedValue({
        Body: sdkStream,
        ContentLength: 10240,
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const stream = await r2Client.downloadFileStream('evidence/large.pdf');

      expect(stream).toBeInstanceOf(Readable);

      const chunks: Buffer[] = [];
      for await (const chunk of stream!) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const content = Buffer.concat(chunks);
      expect(content.length).toBe(10240);
    });

    it('handles Web ReadableStream (Cloudflare Workers)', async () => {
      // Mock Web ReadableStream (as returned by Cloudflare R2)
      const encoder = new TextEncoder();
      const webStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('web stream content'));
          controller.close();
        },
      });

      mockSend.mockResolvedValue({
        Body: webStream,
        ContentLength: 18,
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const stream = await r2Client.downloadFileStream('evidence/test.pdf');

      expect(stream).toBeInstanceOf(Readable);

      const chunks: Buffer[] = [];
      for await (const chunk of stream!) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const content = Buffer.concat(chunks).toString();
      expect(content).toBe('web stream content');
    });
  });

  describe('downloadFile', () => {
    it('downloads file as Buffer', async () => {
      const mockBody = Readable.from([Buffer.from('buffer content')]);
      const sdkStream = sdkStreamMixin(mockBody);

      mockSend.mockResolvedValue({
        Body: sdkStream,
        ContentLength: 14,
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/test.pdf');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer?.toString()).toBe('buffer content');
    });

    it('returns null when file does not exist', async () => {
      const notFoundError = new Error('NoSuchKey');
      (notFoundError as any).name = 'NoSuchKey';
      mockSend.mockRejectedValue(notFoundError);

      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/missing.pdf');

      expect(buffer).toBeNull();
    });

    it('handles empty files', async () => {
      const mockBody = Readable.from([]);
      const sdkStream = sdkStreamMixin(mockBody);

      mockSend.mockResolvedValue({
        Body: sdkStream,
        ContentLength: 0,
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/empty.pdf');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer?.length).toBe(0);
    });

    it('concatenates multiple chunks correctly', async () => {
      const chunk1 = Buffer.from('Hello ');
      const chunk2 = Buffer.from('World');
      const chunk3 = Buffer.from('!');
      const mockBody = Readable.from([chunk1, chunk2, chunk3]);
      const sdkStream = sdkStreamMixin(mockBody);

      mockSend.mockResolvedValue({
        Body: sdkStream,
        ContentLength: 12,
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/test.pdf');

      expect(buffer?.toString()).toBe('Hello World!');
    });

    it('handles binary data correctly', async () => {
      // Create binary data (PDF header)
      const binaryData = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      const mockBody = Readable.from([binaryData]);
      const sdkStream = sdkStreamMixin(mockBody);

      mockSend.mockResolvedValue({
        Body: sdkStream,
        ContentType: 'application/pdf',
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/test.pdf');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(Buffer.compare(buffer!, binaryData)).toBe(0);
    });

    it('converts string chunks to Buffer', async () => {
      const mockBody = Readable.from(['string', ' ', 'chunks']);
      const sdkStream = sdkStreamMixin(mockBody);

      mockSend.mockResolvedValue({
        Body: sdkStream,
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/test.pdf');

      expect(buffer?.toString()).toBe('string chunks');
    });

    it('returns null on stream errors', async () => {
      const errorStream = new Readable({
        read() {
          this.destroy(new Error('Stream error'));
        },
      });
      const sdkStream = sdkStreamMixin(errorStream);

      mockSend.mockResolvedValue({
        Body: sdkStream,
      });

      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/test.pdf');

      expect(buffer).toBeNull();
    });

    it('returns null when R2 is not configured', async () => {
      process.env.CF_R2_BUCKET_NAME = '';

      vi.resetModules();
      const { r2Client } = await import('@/lib/storage/r2-client');
      const buffer = await r2Client.downloadFile('evidence/test.pdf');

      expect(buffer).toBeNull();
    });
  });

  describe('Configuration validation', () => {
    it('detects missing configuration', async () => {
      process.env.CF_R2_ACCESS_KEY_ID = '';
      process.env.CF_R2_SECRET_ACCESS_KEY = '';

      vi.resetModules();
      const { r2Client } = await import('@/lib/storage/r2-client');

      expect(r2Client.isR2Configured()).toBe(false);
    });

    it('detects complete configuration', async () => {
      const { r2Client } = await import('@/lib/storage/r2-client');

      expect(r2Client.isR2Configured()).toBe(true);
    });

    it('logs warning when configuration is incomplete', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.CF_R2_ENDPOINT = '';

      vi.resetModules();
      await import('@/lib/storage/r2-client');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cloudflare R2 not configured'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
