import { r2Client } from '@/lib/storage/r2-client';

export interface FileSizeReference {
  id: string;
  url: string;
  existingSize?: number | null;
}

export interface FileSizeResolutionItem extends FileSizeReference {
  size: number | null;
}

export interface FileSizeResolutionResult {
  files: FileSizeResolutionItem[];
  totalSizeBytes: number;
  missingCount: number;
  r2Configured: boolean;
}

const DEFAULT_CONCURRENCY = 8;

export function extractR2Key(url: string): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith('/api/files/')) {
    const path = url.slice('/api/files/'.length);
    const normalized = path.split('?')[0];
    return normalized.length > 0 ? normalized : null;
  }

  if (!url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    const normalized = url.replace(/^\/+/, '').split('?')[0];
    return normalized.length > 0 ? normalized : null;
  }

  try {
    const parsed = new URL(url);
    const normalized = parsed.pathname.replace(/^\/+/, '').split('?')[0];
    return normalized.length > 0 ? normalized : null;
  } catch (error) {
    console.warn(`Unable to parse evidence file URL: ${url}`, error);
    const segments = url.split('/').filter(Boolean);
    if (!segments.length) {
      return null;
    }
    const tail = segments.slice(-2).map((segment) => segment.split('?')[0]);
    const normalized = tail.join('/');
    return normalized.length > 0 ? normalized : null;
  }
}

export async function resolveFileSizes(
  references: FileSizeReference[],
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<FileSizeResolutionResult> {
  const files: FileSizeResolutionItem[] = references.map((reference) => ({
    ...reference,
    size: reference.existingSize ?? null,
  }));

  if (!files.length) {
    return {
      files,
      totalSizeBytes: 0,
      missingCount: 0,
      r2Configured: r2Client.isR2Configured(),
    };
  }

  const initialTotal = files.reduce((sum, file) => sum + (file.size ?? 0), 0);

  if (!r2Client.isR2Configured()) {
    return {
      files,
      totalSizeBytes: initialTotal,
      missingCount: files.filter((file) => file.size == null).length,
      r2Configured: false,
    };
  }

  const lookups = files
    .map((file) => {
      if (file.size != null) {
        return null;
      }
      const key = extractR2Key(file.url);
      if (!key) {
        return null;
      }
      return { file, key };
    })
    .filter(Boolean) as Array<{ file: FileSizeResolutionItem; key: string }>;

  const notFoundKeys: string[] = [];

  if (lookups.length > 0) {
    let cursor = 0;
    const workerCount = Math.min(Math.max(concurrency, 1), lookups.length);

    await Promise.all(
      Array.from({ length: workerCount }).map(async () => {
        while (true) {
          const currentIndex = cursor++;
          const entry = lookups[currentIndex];
          if (!entry) {
            break;
          }

          if (entry.file.size != null) {
            continue;
          }

          try {
            const metadata = await r2Client.getFileMetadata(entry.key);
            if (metadata && typeof metadata.size === 'number') {
              entry.file.size = metadata.size;
            }
          } catch (error) {
            const statusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
            if (statusCode === 404) {
              notFoundKeys.push(entry.key);
            } else {
              console.error(`Failed to fetch R2 metadata for ${entry.key}:`, error);
            }
          }
        }
      }),
    );
  }

  const totalSizeBytes = files.reduce((sum, file) => sum + (file.size ?? 0), 0);
  const missingCount = files.filter((file) => file.size == null).length;

  if (notFoundKeys.length > 0) {
    const sample = notFoundKeys.slice(0, 5).join(', ');
    console.warn(
      `R2 metadata missing for ${notFoundKeys.length} file(s). Sample keys: ${sample}${notFoundKeys.length > 5 ? '…' : ''}`,
    );
  }

  return {
    files,
    totalSizeBytes,
    missingCount,
    r2Configured: true,
  };
}
