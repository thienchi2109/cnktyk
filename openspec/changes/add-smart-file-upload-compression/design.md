# Design Document: Smart File Upload Compression

**Change ID:** `add-smart-file-upload-compression`  
**Version:** 1.0  
**Last Updated:** 2025-12-04

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         FileUpload Component (UI Layer)                │    │
│  │  • File selection (drag-drop / click)                  │    │
│  │  • Visual feedback (progress, compression stats)       │    │
│  └────────────────┬──────────────────────────────────────┘    │
│                   │ File object                                 │
│                   ▼                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │       useFileUpload Hook (Orchestration Layer)         │    │
│  │  • State management (pending → processing → uploading) │    │
│  │  • Error handling                                      │    │
│  │  • Progress tracking                                   │    │
│  └────────────────┬──────────────────────────────────────┘    │
│                   │ calls                                       │
│                   ▼                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │      fileProcessor Utility (Processing Layer)          │    │
│  │                                                        │    │
│  │  ┌──────────────────────────────────────┐            │    │
│  │  │  1. detectFileType()                 │            │    │
│  │  │     • Check MIME type                │            │    │
│  │  │     • Validate magic bytes           │            │    │
│  │  └──────────────┬───────────────────────┘            │    │
│  │                 │                                     │    │
│  │      ┌──────────┴──────────┐                        │    │
│  │      │                     │                        │    │
│  │      ▼                     ▼                        │    │
│  │  ┌────────┐          ┌─────────┐                  │    │
│  │  │ Image? │          │  PDF?   │                  │    │
│  │  └───┬────┘          └────┬────┘                  │    │
│  │      │                    │                        │    │
│  │      ▼                    ▼                        │    │
│  │  ┌────────────────┐  ┌──────────────┐            │    │
│  │  │ compressImage()│  │validatePDF() │            │    │
│  │  │ • WebP convert │  │ • Size check │            │    │
│  │  │ • Resize       │  │ • Reject >5MB│            │    │
│  │  │ • Quality 0.8  │  └──────────────┘            │    │
│  │  └────────────────┘                              │    │
│  └────────────────┬──────────────────────────────────┘    │
│                   │ Processed file (File/Blob)             │
│                   ▼                                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         uploadToServer() (Network Layer)               │    │
│  │  • FormData construction                               │    │
│  │  • POST to /api/files/upload                           │    │
│  │  • Progress tracking                                   │    │
│  └────────────────┬──────────────────────────────────────┘    │
│                   │                                            │
└───────────────────┼────────────────────────────────────────────┘
                    │ HTTPS
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Next.js API Route                           │
│                   /api/files/upload                              │
│  • Existing validation (MIME, size, checksum)                   │
│  • Upload to R2                                                 │
│  • Return URL + metadata                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── lib/
│   └── utils/
│       └── fileProcessor.ts          # NEW - Core compression logic
├── hooks/
│   └── useFileUpload.ts              # NEW - Upload orchestration hook
├── types/
│   └── file-processing.ts            # NEW - TypeScript types
├── components/
│   └── ui/
│       └── file-upload.tsx           # MODIFIED - Add compression UI
└── app/
    └── api/
        └── files/
            └── upload/
                └── route.ts          # MODIFIED - Accept WebP, update validation
```

---

## Core Module: `fileProcessor.ts`

### Public API

```typescript
// src/lib/utils/fileProcessor.ts

/**
 * Main entry point for file processing
 * Routes files to appropriate handler (compress vs validate)
 */
export async function processFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProcessedFileResult>;

/**
 * Compress image files to WebP format
 * Uses browser-image-compression library
 */
export async function compressImage(
  file: File,
  options?: ImageCompressionOptions,
  onProgress?: (progress: number) => void
): Promise<CompressedImageResult>;

/**
 * Validate PDF file size
 * Rejects files >5MB immediately
 */
export function validatePDF(file: File): ValidationResult;

/**
 * Validate file type using MIME + magic bytes
 * Prevents malicious file renaming attacks
 */
export async function validateFileType(file: File): Promise<FileTypeValidation>;

/**
 * Read file signature (magic bytes) from buffer
 */
async function readFileSignature(file: File): Promise<number[]>;
```

### TypeScript Types

```typescript
// src/types/file-processing.ts

export type FileCategory = 'image' | 'pdf' | 'other';

export interface ProcessedFileResult {
  success: boolean;
  file?: File | Blob;
  originalFile: File;
  category: FileCategory;
  stats?: CompressionStats;
  error?: ProcessingError;
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;  // e.g., 0.85 = 85% reduction
  originalFormat: string;
  outputFormat: string;
  dimensions?: {
    width: number;
    height: number;
  };
  processingTimeMs: number;
}

export interface ProcessingError {
  code: 'COMPRESSION_FAILED' | 'PDF_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'UNKNOWN';
  message: string;
  messageVi: string;
  details?: string;
}

export interface ImageCompressionOptions {
  maxSizeMB: number;           // Default: 1.0
  maxWidthOrHeight: number;    // Default: 1920
  fileType: string;            // Default: 'image/webp'
  quality: number;             // Default: 0.8
  useWebWorker: boolean;       // Default: true
}

export interface FileTypeValidation {
  isValid: boolean;
  category: FileCategory;
  detectedMimeType: string;
  matchesSignature: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: ProcessingError;
}

// Magic byte signatures for file type detection
export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF
  'application/pdf': [0x25, 0x50, 0x44, 0x46],  // %PDF
};

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ACCEPTED_PDF_TYPE = 'application/pdf';
export const MAX_PDF_SIZE_MB = 5;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
```

### Implementation Details

```typescript
// src/lib/utils/fileProcessor.ts
import imageCompression from 'browser-image-compression';
import type {
  ProcessedFileResult,
  CompressionStats,
  ProcessingError,
  ImageCompressionOptions,
  ValidationResult,
  FileTypeValidation,
  FileCategory,
} from '@/types/file-processing';
import {
  FILE_SIGNATURES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPE,
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_SIZE_MB,
} from '@/types/file-processing';

// Error messages
const ERRORS = {
  PDF_TOO_LARGE: {
    code: 'PDF_TOO_LARGE' as const,
    message: `PDF file exceeds ${MAX_PDF_SIZE_MB}MB. Please compress the PDF file before uploading.`,
    messageVi: `File PDF có dung lượng vượt quá ${MAX_PDF_SIZE_MB}MB. Vui lòng nén để giảm dung lượng file PDF trước khi tải lên.`,
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE' as const,
    message: 'Invalid file type. Only images (JPG, PNG, WebP) and PDF are accepted.',
    messageVi: 'Loại tệp không hợp lệ. Chỉ chấp nhận ảnh (JPG, PNG, WebP) và PDF.',
  },
  COMPRESSION_FAILED: {
    code: 'COMPRESSION_FAILED' as const,
    message: 'Image compression failed. Please try again or choose a different image.',
    messageVi: 'Không thể nén ảnh. Vui lòng thử lại hoặc chọn ảnh khác.',
  },
};

// Default compression options
const DEFAULT_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxSizeMB: 1.0,
  maxWidthOrHeight: 1920,
  fileType: 'image/webp',
  quality: 0.8,
  useWebWorker: true,
};

/**
 * Main entry point - routes file to appropriate processor
 */
export async function processFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProcessedFileResult> {
  const startTime = Date.now();

  // Step 1: Validate file type (MIME + signature)
  const typeValidation = await validateFileType(file);
  
  if (!typeValidation.isValid) {
    return {
      success: false,
      originalFile: file,
      category: 'other',
      error: {
        ...ERRORS.INVALID_FILE_TYPE,
        details: typeValidation.error,
      },
    };
  }

  // Step 2: Route to appropriate handler
  const category = typeValidation.category;

  try {
    if (category === 'image') {
      // Compress images
      const result = await compressImage(file, DEFAULT_COMPRESSION_OPTIONS, onProgress);
      
      if (!result.success) {
        return {
          success: false,
          originalFile: file,
          category: 'image',
          error: result.error,
        };
      }

      return {
        success: true,
        file: result.compressedFile,
        originalFile: file,
        category: 'image',
        stats: result.stats,
      };
    } 
    else if (category === 'pdf') {
      // Validate PDF size
      const validation = validatePDF(file);
      
      if (!validation.isValid) {
        return {
          success: false,
          originalFile: file,
          category: 'pdf',
          error: validation.error,
        };
      }

      // PDF is valid, return as-is
      return {
        success: true,
        file: file,
        originalFile: file,
        category: 'pdf',
      };
    }
    else {
      // Unsupported file type
      return {
        success: false,
        originalFile: file,
        category: 'other',
        error: ERRORS.INVALID_FILE_TYPE,
      };
    }
  } catch (error) {
    return {
      success: false,
      originalFile: file,
      category,
      error: {
        code: 'UNKNOWN',
        message: 'An unexpected error occurred during file processing',
        messageVi: 'Đã xảy ra lỗi khi xử lý tệp',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Compress image to WebP format
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = DEFAULT_COMPRESSION_OPTIONS,
  onProgress?: (progress: number) => void
): Promise<{
  success: boolean;
  compressedFile?: File;
  stats?: CompressionStats;
  error?: ProcessingError;
}> {
  const startTime = Date.now();
  const originalSize = file.size;

  try {
    // Setup options with progress callback
    const compressionOptions = {
      ...options,
      onProgress: (progress: number) => {
        // browser-image-compression reports progress 0-100
        onProgress?.(progress);
      },
    };

    // Perform compression
    const compressedBlob = await imageCompression(file, compressionOptions);
    
    // Get image dimensions (if available)
    let dimensions: { width: number; height: number } | undefined;
    try {
      const img = await imageCompression.getDataUrlFromFile(compressedBlob);
      const image = new Image();
      await new Promise((resolve) => {
        image.onload = resolve;
        image.src = img;
      });
      dimensions = { width: image.width, height: image.height };
    } catch {
      // Dimensions optional, ignore errors
    }

    // Convert Blob to File with proper name
    const extension = options.fileType === 'image/webp' ? 'webp' : 'jpg';
    const originalName = file.name.replace(/\.[^.]+$/, `.${extension}`);
    const compressedFile = new File([compressedBlob], originalName, {
      type: options.fileType,
      lastModified: Date.now(),
    });

    const compressedSize = compressedFile.size;
    const compressionRatio = 1 - (compressedSize / originalSize);
    const processingTimeMs = Date.now() - startTime;

    return {
      success: true,
      compressedFile,
      stats: {
        originalSize,
        compressedSize,
        compressionRatio,
        originalFormat: file.type,
        outputFormat: options.fileType,
        dimensions,
        processingTimeMs,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        ...ERRORS.COMPRESSION_FAILED,
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Validate PDF file size
 */
export function validatePDF(file: File): ValidationResult {
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return {
      isValid: false,
      error: ERRORS.PDF_TOO_LARGE,
    };
  }

  return { isValid: true };
}

/**
 * Validate file type using MIME + magic bytes
 */
export async function validateFileType(file: File): Promise<FileTypeValidation> {
  const mimeType = file.type;

  // Check if MIME type is accepted
  const isAcceptedImage = ACCEPTED_IMAGE_TYPES.includes(mimeType);
  const isAcceptedPdf = mimeType === ACCEPTED_PDF_TYPE;

  if (!isAcceptedImage && !isAcceptedPdf) {
    return {
      isValid: false,
      category: 'other',
      detectedMimeType: mimeType,
      matchesSignature: false,
      error: 'File type not accepted',
    };
  }

  // Read file signature (magic bytes)
  const signature = await readFileSignature(file);
  const expectedSignature = FILE_SIGNATURES[mimeType];

  if (!expectedSignature) {
    // No signature defined for this type, trust MIME
    return {
      isValid: true,
      category: isAcceptedImage ? 'image' : 'pdf',
      detectedMimeType: mimeType,
      matchesSignature: true, // Assume valid
    };
  }

  // Compare signatures
  const matchesSignature = expectedSignature.every(
    (byte, index) => signature[index] === byte
  );

  if (!matchesSignature) {
    return {
      isValid: false,
      category: 'other',
      detectedMimeType: mimeType,
      matchesSignature: false,
      error: 'File signature does not match MIME type (possible malicious file)',
    };
  }

  return {
    isValid: true,
    category: isAcceptedImage ? 'image' : 'pdf',
    detectedMimeType: mimeType,
    matchesSignature: true,
  };
}

/**
 * Read first N bytes of file to get magic bytes signature
 */
async function readFileSignature(file: File): Promise<number[]> {
  const BYTES_TO_READ = 8; // Read first 8 bytes
  const slice = file.slice(0, BYTES_TO_READ);
  const buffer = await slice.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

/**
 * Helper: Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Helper: Format compression ratio as percentage
 */
export function formatCompressionRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
```

---

## Upload Hook: `useFileUpload.ts`

```typescript
// src/hooks/useFileUpload.ts
'use client';

import { useState, useCallback } from 'react';
import { processFile } from '@/lib/utils/fileProcessor';
import type { ProcessedFileResult } from '@/types/file-processing';

export interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  checksum: string;
  url: string;
  uploadedAt: string;
  activityId?: string;
}

export interface FileWithStatus {
  id: string;
  file: File;
  originalFile: File;
  status: 'pending' | 'processing' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  processedResult?: ProcessedFileResult;
  uploadedFile?: UploadedFile;
}

export interface UseFileUploadOptions {
  onSuccess?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  activityId?: string;
  maxFiles?: number;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { onSuccess, onError, activityId, maxFiles = 5 } = options;
  const [files, setFiles] = useState<FileWithStatus[]>([]);

  /**
   * Add and process files
   */
  const addFiles = useCallback(
    async (newFiles: File[]) => {
      if (files.length + newFiles.length > maxFiles) {
        onError?.(`Chỉ có thể tải lên tối đa ${maxFiles} tệp.`);
        return;
      }

      // Create file status objects
      const filesWithStatus: FileWithStatus[] = newFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        file,
        originalFile: file,
        status: 'pending' as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...filesWithStatus]);

      // Process and upload each file
      for (const fileStatus of filesWithStatus) {
        await processAndUploadFile(fileStatus);
      }
    },
    [files.length, maxFiles, onError]
  );

  /**
   * Process file (compression/validation) then upload
   */
  const processAndUploadFile = async (fileStatus: FileWithStatus) => {
    const { id, originalFile } = fileStatus;

    try {
      // Step 1: Process file (compression or validation)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'processing' as const, progress: 0 } : f
        )
      );

      const processedResult = await processFile(originalFile, (progress) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, progress: Math.round(progress) } : f
          )
        );
      });

      if (!processedResult.success) {
        throw new Error(processedResult.error?.messageVi || processedResult.error?.message || 'Processing failed');
      }

      // Step 2: Upload processed file
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'uploading' as const,
                progress: 0,
                file: processedResult.file as File,
                processedResult,
              }
            : f
        )
      );

      const formData = new FormData();
      formData.append('file', processedResult.file!);
      if (activityId) {
        formData.append('activityId', activityId);
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Step 3: Success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'success' as const,
                progress: 100,
                uploadedFile: result.file,
              }
            : f
        )
      );

      // Notify parent
      if (onSuccess) {
        const uploadedFiles = files
          .filter((f) => f.status === 'success' && f.uploadedFile)
          .map((f) => f.uploadedFile!);
        uploadedFiles.push(result.file);
        onSuccess(uploadedFiles);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );

      onError?.(errorMessage);
    }
  };

  /**
   * Remove a file from the list
   */
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  /**
   * Clear all files
   */
  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    isUploading: files.some((f) => f.status === 'uploading' || f.status === 'processing'),
  };
}
```

---

## Updated FileUpload Component

### Key Changes to `src/components/ui/file-upload.tsx`

```typescript
// MODIFIED SECTIONS ONLY (not complete file)

import { useFileUpload } from '@/hooks/useFileUpload';
import { formatBytes, formatCompressionRatio } from '@/lib/utils/fileProcessor';

export function FileUpload({
  onUpload,
  onError,
  maxFiles = 5,
  maxSize = 5,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'],
  activityId,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const { files, addFiles, removeFile, isUploading } = useFileUpload({
    onSuccess: onUpload,
    onError,
    activityId,
    maxFiles,
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(Array.from(selectedFiles));
    }
    e.target.value = '';
  }, [addFiles]);

  const getStatusIcon = (file: FileWithStatus) => {
    switch (file.status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-medical-blue" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-medical-green" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-medical-red" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (file: FileWithStatus): string => {
    switch (file.status) {
      case 'processing':
        return `Đang xử lý ${file.progress}%`;
      case 'uploading':
        return `Đang tải lên ${file.progress}%`;
      case 'success':
        return 'Tải lên thành công';
      case 'error':
        return file.error || 'Lỗi';
      default:
        return 'Chờ xử lý';
    }
  };

  const renderCompressionStats = (file: FileWithStatus) => {
    if (!file.processedResult?.stats) return null;

    const { stats } = file.processedResult;
    
    return (
      <div className="text-xs text-green-600 mt-1">
        ✓ Đã nén: {formatBytes(stats.originalSize)} → {formatBytes(stats.compressedSize)}
        {' '}({formatCompressionRatio(stats.compressionRatio)} giảm)
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area - same as before */}
      
      {/* File List with enhanced status */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Tệp đã chọn:</h4>
          
          {files.map((file) => (
            <GlassCard key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(file)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {file.originalFile.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatBytes(file.originalFile.size)}</span>
                      <span>•</span>
                      <span>{getStatusLabel(file)}</span>
                    </div>
                    {renderCompressionStats(file)}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  disabled={file.status === 'uploading' || file.status === 'processing'}
                  className="text-gray-400 hover:text-medical-red"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              {(file.status === 'processing' || file.status === 'uploading') && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        file.status === 'processing' ? 'bg-blue-600' : 'bg-medical-blue'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## API Route Updates

### Modified: `/api/files/upload/route.ts`

```typescript
// CHANGES ONLY - lines 52-64

// Update accepted types to include WebP
if (!validateFileType(file)) {
  return NextResponse.json(
    { error: 'Invalid file type. Only PDF, JPG, PNG, and WebP files are allowed.' },
    { status: 400 }
  );
}

// Note: maxSize check remains 5MB
// Client-side compression ensures images are <1MB
// PDFs are validated client-side before reaching here
if (!validateFileSize(file, 5)) {
  return NextResponse.json(
    { error: 'File size exceeds 5MB limit.' },
    { status: 400 }
  );
}
```

### Updated Validation in `src/lib/utils.ts`

```typescript
// ADD WebP to allowed types (line 25)
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',  // ADD THIS
  ];
  return allowedTypes.includes(file.type);
}
```

---

## Database Schema Updates

### Updated `FileUploadSchema` in `src/lib/db/schemas.ts`

```typescript
// ADD compression metadata (optional fields)
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  activityId: z.string().optional(),
  // NEW: Compression metadata (client-side only, not stored in DB)
  compressionStats: z.object({
    originalSize: z.number(),
    compressedSize: z.number(),
    compressionRatio: z.number(),
    originalFormat: z.string(),
    outputFormat: z.string(),
    processingTimeMs: z.number(),
  }).optional(),
});
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/lib/utils/fileProcessor.test.ts

describe('fileProcessor', () => {
  describe('compressImage', () => {
    it('should compress large JPG to WebP under 1MB', async () => {
      const largeJpg = createMockFile(5 * 1024 * 1024, 'image/jpeg');
      const result = await compressImage(largeJpg);
      
      expect(result.success).toBe(true);
      expect(result.compressedFile!.size).toBeLessThan(1.5 * 1024 * 1024);
      expect(result.compressedFile!.type).toBe('image/webp');
    });

    it('should preserve aspect ratio', async () => {
      const img = createMockFile(2 * 1024 * 1024, 'image/jpeg', { width: 3000, height: 2000 });
      const result = await compressImage(img);
      
      expect(result.stats!.dimensions!.width / result.stats!.dimensions!.height).toBeCloseTo(1.5);
    });
  });

  describe('validatePDF', () => {
    it('should reject PDF >5MB', () => {
      const largePdf = createMockFile(6 * 1024 * 1024, 'application/pdf');
      const result = validatePDF(largePdf);
      
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('PDF_TOO_LARGE');
    });

    it('should accept PDF ≤5MB', () => {
      const smallPdf = createMockFile(4 * 1024 * 1024, 'application/pdf');
      const result = validatePDF(smallPdf);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFileType', () => {
    it('should detect fake PDF (renamed .exe)', async () => {
      const fakeFile = createMockFileWithSignature([0x4D, 0x5A], 'application/pdf'); // EXE header
      const result = await validateFileType(fakeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.matchesSignature).toBe(false);
    });

    it('should accept genuine PDF', async () => {
      const realPdf = createMockFileWithSignature([0x25, 0x50, 0x44, 0x46], 'application/pdf');
      const result = await validateFileType(realPdf);
      
      expect(result.isValid).toBe(true);
      expect(result.matchesSignature).toBe(true);
    });
  });
});
```

### Integration Tests

```typescript
// tests/hooks/useFileUpload.test.tsx

describe('useFileUpload', () => {
  it('should process and upload image successfully', async () => {
    const { result } = renderHook(() => useFileUpload());
    const mockImage = createMockFile(5 * 1024 * 1024, 'image/jpeg');
    
    await act(async () => {
      await result.current.addFiles([mockImage]);
    });
    
    await waitFor(() => {
      expect(result.current.files[0].status).toBe('success');
    });
    
    expect(result.current.files[0].processedResult?.stats?.compressionRatio).toBeGreaterThan(0.5);
  });

  it('should reject oversized PDF immediately', async () => {
    const { result } = renderHook(() => useFileUpload());
    const largePdf = createMockFile(6 * 1024 * 1024, 'application/pdf');
    
    await act(async () => {
      await result.current.addFiles([largePdf]);
    });
    
    await waitFor(() => {
      expect(result.current.files[0].status).toBe('error');
    });
    
    expect(result.current.files[0].error).toContain('vượt quá 5MB');
  });
});
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Image compression time (5MB) | <3s | Performance.now() |
| PDF validation time | <100ms | Performance.now() |
| Bundle size increase | <70KB gzipped | Webpack bundle analyzer |
| Memory usage (peak) | <30MB | Chrome DevTools |
| Compression ratio (typical) | >70% | Before/after size comparison |

### Monitoring Points

```typescript
// Add to fileProcessor.ts for production monitoring
if (typeof window !== 'undefined' && 'performance' in window) {
  performance.mark('compression-start');
  // ... compression logic ...
  performance.mark('compression-end');
  performance.measure('compression-duration', 'compression-start', 'compression-end');
  
  const measure = performance.getEntriesByName('compression-duration')[0];
  console.log(`[Perf] Compression took ${measure.duration.toFixed(0)}ms`);
}
```

---

## Deployment Checklist

- [ ] Install `browser-image-compression` package
- [ ] Create `fileProcessor.ts` utility
- [ ] Create `useFileUpload.ts` hook
- [ ] Update `FileUpload` component
- [ ] Update API route to accept WebP
- [ ] Add WebP to `validateFileType` in utils.ts
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test with various file sizes (100KB, 1MB, 5MB, 10MB)
- [ ] Verify error messages in Vietnamese and English
- [ ] Benchmark compression performance
- [ ] Measure bundle size impact
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor R2 storage metrics

---

## Rollback Plan

1. **Immediate Rollback (< 1 hour):**
   - Revert frontend code to previous commit
   - No database changes to roll back
   - Files already uploaded as WebP remain accessible

2. **Gradual Rollback (feature flag):**
   ```typescript
   // Add to src/lib/features/flags.ts
   export function isClientCompressionEnabled(): boolean {
     return process.env.NEXT_PUBLIC_ENABLE_CLIENT_COMPRESSION !== 'false';
   }
   ```
   Set `NEXT_PUBLIC_ENABLE_CLIENT_COMPRESSION=false` to disable without code changes.

3. **Data Considerations:**
   - WebP files remain in R2 (server validates WebP already)
   - No data loss or corruption risk
   - Users can re-upload files if needed

---

## Future Enhancements (Out of Scope for v1)

1. **Parallel File Processing:** Process multiple files simultaneously
2. **AVIF Format Support:** Next-gen image format (even better than WebP)
3. **Progressive Upload:** Upload chunks during compression
4. **Offline Support:** Service Worker caching for compression library
5. **Compression Preview:** Before/after image comparison UI
6. **Custom Compression Settings:** Let power users adjust quality/size
7. **PDF Optimization:** Basic PDF compression (remove metadata, reduce quality)
8. **Smart Format Detection:** Analyze image content to choose best format
