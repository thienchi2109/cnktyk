/**
 * File Upload API Route
 * Handles secure file uploads to Cloudflare R2 with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { r2Client } from '@/lib/storage/r2-client';
import { generateSecureFilename, generateFileChecksum, validateFileType, validateFileSize } from '@/lib/utils';
import { FileUploadSchema } from '@/lib/db/schemas';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const activityId = formData.get('activityId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file using Zod schema
    const validationResult = FileUploadSchema.safeParse({
      file,
      activityId: activityId || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'File validation failed',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    // Additional server-side validation
    if (!validateFileType(file)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPG, and PNG files are allowed.' },
        { status: 400 }
      );
    }

    if (!validateFileSize(file, 10)) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    // Generate secure filename and checksum
    const filename = generateSecureFilename(file.name, activityId || undefined);
    const checksum = await generateFileChecksum(file);

    // Upload to R2
    const uploadResult = await r2Client.uploadFile(file, filename, {
      originalName: file.name,
      checksum,
      activityId: activityId || undefined,
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      file: {
        filename: uploadResult.filename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        checksum,
        url: uploadResult.fileUrl,
        uploadedAt: new Date().toISOString(),
        activityId: activityId || null,
      },
    });

  } catch (error) {
    console.error('File upload error:', error);
    
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