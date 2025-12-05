import { describe, it, expect } from 'vitest';
import { FileUploadSchema } from '@/lib/db/schemas';

describe('FileUploadSchema - WebP Support', () => {
    it('accepts WebP files from compression', () => {
        const webpFile = new File(
            [new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00])], // RIFF signature
            'compressed.webp',
            { type: 'image/webp' }
        );

        const result = FileUploadSchema.safeParse({
            file: webpFile,
        });

        expect(result.success).toBe(true);
    });

    it('accepts JPEG files', () => {
        const jpegFile = new File(
            [new Uint8Array([0xFF, 0xD8, 0xFF])],
            'photo.jpg',
            { type: 'image/jpeg' }
        );

        const result = FileUploadSchema.safeParse({
            file: jpegFile,
        });

        expect(result.success).toBe(true);
    });

    it('accepts PNG files', () => {
        const pngFile = new File(
            [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
            'image.png',
            { type: 'image/png' }
        );

        const result = FileUploadSchema.safeParse({
            file: pngFile,
        });

        expect(result.success).toBe(true);
    });

    it('accepts PDF files', () => {
        const pdfFile = new File(
            [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
            'document.pdf',
            { type: 'application/pdf' }
        );

        const result = FileUploadSchema.safeParse({
            file: pdfFile,
        });

        expect(result.success).toBe(true);
    });

    it('rejects unsupported file types', () => {
        const textFile = new File(
            [new Uint8Array([0x00, 0x01, 0x02])],
            'document.txt',
            { type: 'text/plain' }
        );

        const result = FileUploadSchema.safeParse({
            file: textFile,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('WebP');
        }
    });

    it('rejects files larger than 5MB', () => {
        const largeFile = new File(
            [new Uint8Array(6 * 1024 * 1024)], // 6MB
            'large.webp',
            { type: 'image/webp' }
        );

        const result = FileUploadSchema.safeParse({
            file: largeFile,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('5MB');
        }
    });
});
