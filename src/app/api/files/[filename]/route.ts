/**
 * File Management API Routes
 * Handles file retrieval, metadata, and deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { r2Client } from '@/lib/storage/r2-client';

interface RouteParams {
  params: Promise<{
    filename: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { filename } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle different actions
    switch (action) {
      case 'metadata':
        // Get file metadata
        const metadata = await r2Client.getFileMetadata(filename);
        if (!metadata) {
          return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ metadata });

      case 'signed-url':
        // Get signed URL for secure access
        const expiresIn = parseInt(searchParams.get('expires') || '3600');
        const signedUrl = await r2Client.getSignedUrl(filename, expiresIn);
        return NextResponse.json({ signedUrl });

      case 'exists':
        // Check if file exists
        const exists = await r2Client.fileExists(filename);
        return NextResponse.json({ exists });

      default:
        // Default: redirect to signed URL
        const defaultSignedUrl = await r2Client.getSignedUrl(filename);
        return NextResponse.redirect(defaultSignedUrl);
    }

  } catch (error) {
    console.error('File retrieval error:', error);
    
    // Handle R2 configuration errors gracefully
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
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only allow SoYTe and DonVi users to delete files
    if (!['SoYTe', 'DonVi'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { filename } = await params;

    // Check if file exists
    const exists = await r2Client.fileExists(filename);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete file from R2
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