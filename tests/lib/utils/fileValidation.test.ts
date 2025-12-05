import { describe, it, expect } from 'vitest';
import { validateFileType, validatePDF } from '../../../src/lib/utils/fileValidation';

// Mock File class for Node environment if needed
// Vitest with jsdom environment should have File
// If not, we can mock it. Assuming jsdom or happy-dom is used.

// Polyfill Blob.arrayBuffer for jsdom if missing
Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(this);
    });
};

describe('fileValidation', () => {
    describe('validatePDF', () => {
        it('should return valid for PDF <= 5MB', () => {
            const file = new File(['a'.repeat(1024)], 'test.pdf', { type: 'application/pdf' });
            const result = validatePDF(file);
            expect(result.isValid).toBe(true);
        });

        it('should return invalid for PDF > 5MB', () => {
            const size = 5 * 1024 * 1024 + 1;
            const file = {
                name: 'large.pdf',
                type: 'application/pdf',
                size: size
            } as File; // Mocking size directly as creating large buffer is slow

            const result = validatePDF(file);
            expect(result.isValid).toBe(false);
            expect(result.error?.code).toBe('PDF_TOO_LARGE');
        });
    });

    describe('validateFileType', () => {
        it('should validate valid JPEG signature', async () => {
            // JPEG signature: FF D8 FF
            const buffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
            const file = new File([buffer], 'test.jpg', { type: 'image/jpeg' });

            const result = await validateFileType(file);
            expect(result.isValid).toBe(true);
            expect(result.category).toBe('image');
        });

        it('should validate valid PNG signature', async () => {
            // PNG signature: 89 50 4E 47 0D 0A 1A 0A
            const buffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            const file = new File([buffer], 'test.png', { type: 'image/png' });

            const result = await validateFileType(file);
            expect(result.isValid).toBe(true);
            expect(result.category).toBe('image');
        });

        it('should validate valid PDF signature', async () => {
            // PDF signature: 25 50 44 46 ( %PDF )
            const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]);
            const file = new File([buffer], 'test.pdf', { type: 'application/pdf' });

            const result = await validateFileType(file);
            expect(result.isValid).toBe(true);
            expect(result.category).toBe('pdf');
        });

        it('should reject mismatching signature (e.g. exe renamed to pdf)', async () => {
            // EXE signature: 4D 5A (MZ)
            const buffer = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]);
            const file = new File([buffer], 'malicious.pdf', { type: 'application/pdf' });

            const result = await validateFileType(file);
            expect(result.isValid).toBe(false);
            expect(result.matchesSignature).toBe(false);
        });

        it('should reject unsupported mime type', async () => {
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });
            const result = await validateFileType(file);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('File type not accepted');
        });
    });
});
