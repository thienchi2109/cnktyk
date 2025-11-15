/**
 * File Management API Routes
 * Handles file retrieval, metadata, and deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { r2Client } from '@/lib/storage/r2-client';

interface RouteParams {
  params: {
    filename?: string[];
  };
}

type DispositionMode = 'inline' | 'attachment';

const buildFilenameFromParams = (params: RouteParams['params']): string | null => {
  const segments = params.filename ?? [];
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  const joined = segments.join('/');
  try {
    return decodeURIComponent(joined);
  } catch {
    return joined;
  }
};

const parseDisposition = (value: string | null): DispositionMode => {
  if (!value) return 'inline';
  const normalized = value.toLowerCase();
  return normalized === 'attachment' ? 'attachment' : 'inline';
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const filename = buildFilenameFromParams(params);
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const disposition = parseDisposition(searchParams.get('disposition'));
    const expiresParam = Number.parseInt(searchParams.get('expires') || '3600', 10);
    const expiresIn = Number.isFinite(expiresParam) && expiresParam > 0 ? expiresParam : 3600;

    switch (action) {
      case 'metadata': {
        const metadata = await r2Client.getFileMetadata(filename);
        if (!metadata) {
          return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ metadata });
      }
      case 'signed-url': {
        const signedUrl = await r2Client.getSignedUrl(filename, expiresIn, disposition);
        return NextResponse.json({ signedUrl });
      }
      case 'exists': {
        const exists = await r2Client.fileExists(filename);
        return NextResponse.json({ exists });
      }
      default: {
        const defaultSignedUrl = await r2Client.getSignedUrl(filename, expiresIn, disposition);
        return NextResponse.redirect(defaultSignedUrl);
      }
    }
  } catch (error) {
    console.error('File retrieval error:', error);

    if (error instanceof Error && error.message.includes('Cloudflare R2 is not configured')) {
      return NextResponse.json(
        { error: 'File storage is not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['SoYTe', 'DonVi'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const filename = buildFilenameFromParams(params);
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    const exists = await r2Client.fileExists(filename);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const deleted = await r2Client.deleteFile(filename);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
