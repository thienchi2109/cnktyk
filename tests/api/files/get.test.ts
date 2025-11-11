import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/storage/r2-client', () => ({
  r2Client: {
    getSignedUrl: vi.fn(),
    getFileMetadata: vi.fn(),
    fileExists: vi.fn(),
  },
}));

import { GET } from '@/app/api/files/[...filename]/route';
import { getCurrentUser } from '@/lib/auth/server';
import { r2Client } from '@/lib/storage/r2-client';

const params = {
  filename: ['evidence', 'file.pdf'],
};

const buildRequest = (query: string) => {
  const qs = query ? `?${query}` : '';
  return new Request(`http://localhost/api/files/evidence/file.pdf${qs}`);
};

describe('GET /api/files/[...filename]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({
      id: 'user-1',
      role: 'DonVi',
    });
    (r2Client.getSignedUrl as any).mockResolvedValue('https://signed');
  });

  it('passes attachment disposition to r2Client for signed-url action', async () => {
    const req = buildRequest('action=signed-url&disposition=attachment');
    const res = (await GET(req as any, { params })) as Response;

    expect(res.status).toBe(200);
    expect(r2Client.getSignedUrl).toHaveBeenCalledWith('evidence/file.pdf', 3600, 'attachment');
  });

  it('defaults to inline disposition on invalid input', async () => {
    const req = buildRequest('action=signed-url&disposition=download');
    const res = (await GET(req as any, { params })) as Response;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signedUrl).toBe('https://signed');
    expect(r2Client.getSignedUrl).toHaveBeenCalledWith('evidence/file.pdf', 3600, 'inline');
  });

  it('propagates custom expiry and disposition when redirecting without action', async () => {
    (r2Client.getSignedUrl as any).mockResolvedValueOnce('https://signed/');
    const req = buildRequest('disposition=attachment&expires=1800');
    const res = (await GET(req as any, { params })) as Response;

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://signed/');
    expect(r2Client.getSignedUrl).toHaveBeenCalledWith('evidence/file.pdf', 1800, 'attachment');
  });
});
