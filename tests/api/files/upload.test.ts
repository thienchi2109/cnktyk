import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth and R2 client modules before importing the route
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/storage/r2-client', () => ({
  r2Client: {
    uploadFile: vi.fn(),
    isR2Configured: vi.fn(),
  },
}));

// Partially mock utils to control checksum while keeping other fns
vi.mock('@/lib/utils', async (importActual) => {
  const actual = (await importActual()) as any;
  return {
    ...actual,
    generateFileChecksum: vi.fn(async () => 'checksum123'),
  };
});

import { POST } from '@/app/api/files/upload/route';
import { getCurrentUser } from '@/lib/auth/server';
import { r2Client } from '@/lib/storage/r2-client';
import * as utils from '@/lib/utils';

async function makeRequest(formData?: FormData) {
  const req = new Request('http://localhost/api/files/upload', {
    method: 'POST',
    body: formData as any,
  });
  return (await POST(req as any)) as Response;
}

function makeFile(name: string, sizeBytes: number, type: string) {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('POST /api/files/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthorized', async () => {
    (getCurrentUser as any).mockResolvedValueOnce(null);
    const res = await makeRequest();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when no file provided', async () => {
    (getCurrentUser as any).mockResolvedValueOnce({ id: 'u1', role: 'NguoiHanhNghe' });
    const form = new FormData();
    const res = await makeRequest(form);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No file provided');
  });

  it('validates file type and rejects invalid types (schema validation)', async () => {
    (getCurrentUser as any).mockResolvedValueOnce({ id: 'u1', role: 'NguoiHanhNghe' });
    const form = new FormData();
    const file = makeFile('note.txt', 100, 'text/plain');
    form.append('file', file);
    const res = await makeRequest(form);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('File validation failed');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('validates file size limit 5MB (schema validation)', async () => {
    (getCurrentUser as any).mockResolvedValueOnce({ id: 'u1', role: 'NguoiHanhNghe' });
    const form = new FormData();
    const big = makeFile('big.pdf', 5 * 1024 * 1024 + 1, 'application/pdf');
    form.append('file', big);
    const res = await makeRequest(form);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('File validation failed');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('rejects invalid activityId (non-UUID) via schema', async () => {
    (getCurrentUser as any).mockResolvedValueOnce({ id: 'u1', role: 'NguoiHanhNghe' });
    const form = new FormData();
    const file = makeFile('a.pdf', 1024, 'application/pdf');
    form.append('file', file);
    form.append('activityId', 'not-a-uuid');
    const res = await makeRequest(form);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('File validation failed');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('handles R2 not configured (upload returns error)', async () => {
    (getCurrentUser as any).mockResolvedValueOnce({ id: 'u1', role: 'NguoiHanhNghe' });
    (r2Client.uploadFile as any).mockResolvedValueOnce({ success: false, error: 'Cloudflare R2 is not configured. File upload functionality is disabled.' });
    const form = new FormData();
    const file = makeFile('a.pdf', 1024, 'application/pdf');
    form.append('file', file);
    const res = await makeRequest(form);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Cloudflare R2 is not configured/i);
  });

  it('uploads successfully and returns file info', async () => {
    (getCurrentUser as any).mockResolvedValueOnce({ id: 'u1', role: 'NguoiHanhNghe' });
    const file = makeFile('evidence.jpg', 2048, 'image/jpeg');
    const form = new FormData();
    form.append('file', file);
    const activityId = '550e8400-e29b-41d4-a716-446655440000';
    form.append('activityId', activityId);

    // Mock R2 success
    (r2Client.uploadFile as any).mockImplementationOnce(async (_file: File, filename: string) => ({
      success: true,
      fileUrl: 'https://r2.dev/some/path',
      filename,
      metadata: {
        filename,
        originalName: _file.name,
        size: _file.size,
        mimeType: _file.type,
        checksum: 'checksum123',
        uploadedAt: new Date(),
        activityId,
      },
    }));

    const res = await makeRequest(form);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.file.originalName).toBe('evidence.jpg');
    expect(body.file.checksum).toBe('checksum123');
    expect(body.file.url).toBe('https://r2.dev/some/path');

    // Ensure filename contains activity prefix
    const calledWith = (r2Client.uploadFile as any).mock.calls[0][1] as string;
    expect(calledWith).toContain(`activity-${activityId}`);
  });
});