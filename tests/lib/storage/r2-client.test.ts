import { describe, it, expect, vi, afterEach } from 'vitest';

const { mockGetSignedUrl, mockGetObjectCommand } = vi.hoisted(() => ({
  mockGetSignedUrl: vi.fn(),
  mockGetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    constructor() {}
  }

  class MockGetObjectCommand {
    constructor(input: any) {
      mockGetObjectCommand(input);
    }
  }

  class EmptyCommand {
    constructor() {}
  }

  return {
    S3Client: MockS3Client,
    PutObjectCommand: EmptyCommand,
    GetObjectCommand: MockGetObjectCommand,
    DeleteObjectCommand: EmptyCommand,
    HeadObjectCommand: EmptyCommand,
  };
});

const REQUIRED_ENV = {
  CF_R2_ACCOUNT_ID: 'test-account',
  CF_R2_ACCESS_KEY_ID: 'test-key',
  CF_R2_SECRET_ACCESS_KEY: 'test-secret',
  CF_R2_BUCKET_NAME: 'test-bucket',
  CF_R2_ENDPOINT: 'https://example.com',
  CF_R2_PUBLIC_URL: 'https://public.example.com',
};

const ORIGINAL_ENV = { ...process.env };

const loadClient = async () => {
  vi.resetModules();
  mockGetObjectCommand.mockReset();
  mockGetSignedUrl.mockReset();
  mockGetSignedUrl.mockResolvedValue('https://signed');
  process.env = { ...ORIGINAL_ENV, ...REQUIRED_ENV };
  const mod = await import('@/lib/storage/r2-client');
  return mod.r2Client;
};

const getLastDisposition = () => {
  const calls = mockGetObjectCommand.mock.calls;
  if (!calls.length) {
    throw new Error('GetObjectCommand was not invoked');
  }
  return calls[calls.length - 1][0]?.ResponseContentDisposition;
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('r2Client.getSignedUrl content disposition handling', () => {
  it('builds attachment headers for download actions', async () => {
    const client = await loadClient();
    await client.getSignedUrl('folder/file.pdf', 3600, 'attachment');

    expect(getLastDisposition()).toBe(
      'attachment; filename="file.pdf"; filename*=UTF-8\'\'file.pdf'
    );
  });

  it('uses inline disposition when requested', async () => {
    const client = await loadClient();
    await client.getSignedUrl('evidence/file.pdf', 900, 'inline');

    expect(getLastDisposition()).toBe('inline');
  });

  it('defaults to inline when disposition is omitted', async () => {
    const client = await loadClient();
    await client.getSignedUrl('evidence/file.pdf');

    expect(getLastDisposition()).toBe('inline');
  });

  it.each([
    {
      label: 'unicode filename',
      filename: 'evidence/Báo cáo.pdf',
      expected: "attachment; filename=\"Báo cáo.pdf\"; filename*=UTF-8''B%C3%A1o%20c%C3%A1o.pdf",
    },
    {
      label: 'filename with spaces',
      filename: 'reports/My Report.pdf',
      expected: "attachment; filename=\"My Report.pdf\"; filename*=UTF-8''My%20Report.pdf",
    },
    {
      label: 'filename with quotes',
      filename: 'exports/Report "Final".pdf',
      expected:
        "attachment; filename=\"Report 'Final'.pdf\"; filename*=UTF-8''Report%20%27Final%27.pdf",
    },
    {
      label: 'special characters',
      filename: 'exports/#report@2024.pdf',
      expected:
        "attachment; filename=\"#report@2024.pdf\"; filename*=UTF-8''%23report%402024.pdf",
    },
  ])('encodes %s correctly', async ({ filename, expected }) => {
    const client = await loadClient();
    await client.getSignedUrl(filename, 3600, 'attachment');

    expect(getLastDisposition()).toBe(expected);
  });

  it('falls back to download when filename is empty', async () => {
    const client = await loadClient();
    await client.getSignedUrl('', 3600, 'attachment');

    expect(getLastDisposition()).toBe("attachment; filename=\"download\"; filename*=UTF-8''download");
  });

  it('strips nested paths and control characters', async () => {
    const client = await loadClient();
    await client.getSignedUrl('nested/path/evil\r\nname.txt', 3600, 'attachment');

    expect(getLastDisposition()).toBe(
      "attachment; filename=\"evilname.txt\"; filename*=UTF-8''evilname.txt"
    );
  });
});
