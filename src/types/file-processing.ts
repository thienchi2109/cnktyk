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
// NOTE: WebP uses a more complex signature to distinguish from other RIFF formats (AVI, WAV)
export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/jpg': [0xFF, 0xD8, 0xFF],  // Same as image/jpeg (non-standard but commonly used)
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  // WebP: RIFF (bytes 0-3) + skip size (bytes 4-7) + WEBP (bytes 8-11)
  // We use null (0xFF) as placeholder for size bytes that we skip
  'image/webp': [
    0x52, 0x49, 0x46, 0x46, // 'RIFF' header
    0xFF, 0xFF, 0xFF, 0xFF, // File size (skip - can be any value)
    0x57, 0x45, 0x42, 0x50  // 'WEBP' marker (distinguishes from AVI/WAV)
  ],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],  // %PDF
};

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ACCEPTED_PDF_TYPE = 'application/pdf';
export const MAX_PDF_SIZE_MB = 5;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
