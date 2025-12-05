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
