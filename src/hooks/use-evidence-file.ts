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

const buildSignedUrlEndpoint = (fileUrl: string, disposition: 'inline' | 'attachment') => {
  const target = new URL(fileUrl, window.location.origin);
  target.searchParams.set('action', 'signed-url');
  target.searchParams.set('disposition', disposition);
  return target.toString();
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
    title: 'Kh�ng th? truy c?p t?p minh ch?ng',
    description: message,
    variant: 'destructive',
  });
};

export function useEvidenceFile(): UseEvidenceFileResult {
  const [activeAction, setActiveAction] = useState<EvidenceFileAction | null>(null);

  const fetchSignedUrl = useCallback(async (fileUrl: string, disposition: 'inline' | 'attachment') => {
    if (!fileUrl) {
      throw new Error('Thi?u du?ng d?n t?p minh ch?ng.');
    }

    const endpoint = buildSignedUrlEndpoint(fileUrl, disposition);
    const response = await fetch(endpoint);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Kh�ng th? sinh URL b?o m?t cho t?p n�y.');
    }

    if (!payload?.signedUrl) {
      throw new Error('Kh�ng n?m b?t du?c URL t?p minh ch?ng.');
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
          showErrorToast('Popup b? ch?n - vui l�ng cho ph�p popup d? xem t?p.');
        }
      } catch (error) {
        console.error('Evidence file action failed', error);
        const defaultMessage =
          action === 'download' ? 'Kh?ng th? t?i xu?ng t?p.' : 'Kh?ng th? xem t?p minh ch?ng.';
        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error && /Failed to fetch/i.test(error.message || ''));

        let message =
          error instanceof Error && !isNetworkError && error.message
            ? error.message
            : defaultMessage;

        if (isNetworkError) {
          message = 'Kh?ng th? k?t n?i t?i m?y ch? - vui l?ng th? l?i.';
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
