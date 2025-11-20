'use client';

import { useCallback, useState } from 'react';

import { toast } from '@/hooks/use-toast';

export type EvidenceFileAction = 'download' | 'view';

export interface UseEvidenceFileResult {
  isLoading: boolean;
  activeAction: EvidenceFileAction | null;
  downloadFile: (fileUrl: string, filename?: string | null) => Promise<void>;
  viewFile: (fileUrl: string) => Promise<void>;
}

const stripQuery = (value: string) => value.split('?')[0] || '';

const buildSignedUrlEndpoint = (fileUrl: string, disposition: 'inline' | 'attachment') => {
  const target = new URL(fileUrl, window.location.origin);
  target.searchParams.set('action', 'signed-url');
  target.searchParams.set('disposition', disposition);
  return target.toString();
};

const normalizeFileEndpoint = (fileUrl: string) => {
  const trimmed = fileUrl.trim();
  if (!trimmed) {
    throw new Error('Thiếu đường dẫn tệp minh chứng.');
  }

  if (trimmed.startsWith('/api/files/')) {
    return `${window.location.origin}${stripQuery(trimmed)}`;
  }

  if (trimmed.startsWith('api/files/')) {
    return `${window.location.origin}/${stripQuery(trimmed)}`;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const path = stripQuery(parsed.pathname).replace(/^\/+/, '');

    if (!path) {
      throw new Error('Thiếu đường dẫn tệp minh chứng.');
    }

    if (path.startsWith('api/files/')) {
      return `${window.location.origin}/${path}`;
    }

    return `${window.location.origin}/api/files/${path}`;
  } catch {
    const normalizedPath = stripQuery(trimmed.replace(/^\/+/, ''));
    if (!normalizedPath) {
      throw new Error('Thiếu đường dẫn tệp minh chứng.');
    }
    return `${window.location.origin}/api/files/${normalizedPath}`;
  }
};

const triggerDownload = (signedUrl: string, filename?: string | null) => {
  const anchor = document.createElement('a');
  anchor.href = signedUrl;
  anchor.rel = 'noopener noreferrer';
  if (filename) {
    anchor.download = filename;
  }
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const showErrorToast = (message: string) => {
  toast({
    title: 'Không thể truy cập tệp minh chứng',
    description: message,
    variant: 'destructive',
  });
};

export function useEvidenceFile(): UseEvidenceFileResult {
  const [activeAction, setActiveAction] = useState<EvidenceFileAction | null>(null);

  const fetchSignedUrl = useCallback(async (fileUrl: string, disposition: 'inline' | 'attachment') => {
    const normalizedUrl = normalizeFileEndpoint(fileUrl);
    const endpoint = buildSignedUrlEndpoint(normalizedUrl, disposition);
    const response = await fetch(endpoint);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Không thể sinh URL bảo mật cho tệp này.');
    }

    if (!payload?.signedUrl) {
      throw new Error('Không nắm bắt được URL tệp minh chứng.');
    }

    return payload.signedUrl as string;
  }, []);

  const handleFileAction = useCallback(
    async (fileUrl: string, action: EvidenceFileAction, filename?: string | null) => {
      setActiveAction(action);
      try {
        const signedUrl = await fetchSignedUrl(fileUrl, action === 'download' ? 'attachment' : 'inline');

        if (action === 'download') {
          triggerDownload(signedUrl, filename || undefined);
          return;
        }

        const popup = window.open(signedUrl, '_blank', 'noopener');
        if (!popup) {
          showErrorToast('Popup bị chặn - vui lòng cho phép popup để xem tệp.');
        }
      } catch (error) {
        console.error('Evidence file action failed', error);
        const defaultMessage =
          action === 'download' ? 'Không thể tải xuống tệp.' : 'Không thể xem tệp minh chứng.';
        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error && /Failed to fetch/i.test(error.message || ''));

        let message =
          error instanceof Error && !isNetworkError && error.message
            ? error.message
            : defaultMessage;

        if (isNetworkError) {
          message = 'Không thể kết nối tới máy chủ - vui lòng thử lại.';
        }

        showErrorToast(message);
      } finally {
        setActiveAction(null);
      }
    },
    [fetchSignedUrl]
  );

  const downloadFile = useCallback(
    (fileUrl: string, filename?: string | null) => handleFileAction(fileUrl, 'download', filename),
    [handleFileAction]
  );

  const viewFile = useCallback(
    (fileUrl: string) => handleFileAction(fileUrl, 'view'),
    [handleFileAction]
  );

  return {
    isLoading: activeAction !== null,
    activeAction,
    downloadFile,
    viewFile,
  };
}
