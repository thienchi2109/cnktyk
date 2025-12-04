import imageCompression from 'browser-image-compression';
import type {
    ProcessedFileResult,
    CompressionStats,
    ProcessingError,
    ImageCompressionOptions,
} from '@/types/file-processing';
import {
    validateFileType,
    validatePDF,
    ERRORS,
} from './fileValidation';

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

        // Check if file is already optimized (WebP, < maxSize, < maxDimensions)
        if (file.type === 'image/webp' && file.size <= options.maxSizeMB * 1024 * 1024) {
            try {
                const img = await imageCompression.getDataUrlFromFile(file);
                const image = new Image();
                await new Promise((resolve) => {
                    image.onload = resolve;
                    image.src = img;
                });

                if (image.width <= options.maxWidthOrHeight && image.height <= options.maxWidthOrHeight) {
                    // Already optimized, return as-is
                    onProgress?.(100);
                    return {
                        success: true,
                        compressedFile: file,
                        stats: {
                            originalSize: file.size,
                            compressedSize: file.size,
                            compressionRatio: 0,
                            originalFormat: file.type,
                            outputFormat: file.type,
                            dimensions: { width: image.width, height: image.height },
                            processingTimeMs: Date.now() - startTime,
                        },
                    };
                }
            } catch (e) {
                // Ignore error and proceed to compression if check fails
                console.warn('Failed to check dimensions of WebP image, proceeding with compression', e);
            }
        }

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
