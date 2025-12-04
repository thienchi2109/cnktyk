import {
    FILE_SIGNATURES,
    ACCEPTED_IMAGE_TYPES,
    ACCEPTED_PDF_TYPE,
    MAX_PDF_SIZE_BYTES,
    MAX_PDF_SIZE_MB,
    ValidationResult,
    FileTypeValidation,
} from '@/types/file-processing';

// Error messages
export const ERRORS = {
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
export async function readFileSignature(file: File): Promise<number[]> {
    const BYTES_TO_READ = 8; // Read first 8 bytes
    const slice = file.slice(0, BYTES_TO_READ);
    const buffer = await slice.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
}
