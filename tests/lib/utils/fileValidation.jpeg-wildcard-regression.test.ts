import { describe, it, expect } from 'vitest';
import { validateFileType } from '@/lib/utils/fileValidation';

// Polyfill Blob.arrayBuffer for jsdom if missing
Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(this);
    });
};

/**
 * P1 REGRESSION TEST: JPEG Wildcard Bypass
 * 
 * VULNERABILITY: The 0xFF wildcard logic treats JPEG's required 0xFF bytes
 * as skip bytes, allowing arbitrary files to pass if byte 1 is 0xD8.
 * 
 * JPEG signature: [0xFF, 0xD8, 0xFF]
 * With wildcard: Only byte 1 (0xD8) is checked!
 * 
 * Attack: [0x00, 0xD8, 0x00] passes as JPEG ❌
 */
describe('[P1 REGRESSION] JPEG Wildcard Bypass', () => {
    function createFileWithBytes(bytes: number[], mimeType: string, filename: string): File {
        const buffer = new Uint8Array(bytes);
        const blob = new Blob([buffer], { type: mimeType });
        return new File([blob], filename, { type: mimeType });
    }

    describe('REGRESSION: 0xFF wildcard breaks JPEG validation', () => {
        it('should REJECT file with [0x00, 0xD8, 0x00] as JPEG', async () => {
            // Attacker creates file with only middle byte matching
            const fakeJpeg = createFileWithBytes(
                [
                    0x00, 0xD8, 0x00, // Only byte 1 matches JPEG
                    ...Array(100).fill(0xAA) // Arbitrary payload
                ],
                'image/jpeg',
                'fake.jpg'
            );

            const result = await validateFileType(fakeJpeg);

            // CURRENT BEHAVIOR: This will PASS (regression!)
            // EXPECTED BEHAVIOR: Should REJECT
            expect(result.isValid).toBe(false);
            expect(result.matchesSignature).toBe(false);
        });

        it('should REJECT file with [0xAA, 0xD8, 0xBB] as image/jpg', async () => {
            const fakeJpg = createFileWithBytes(
                [
                    0xAA, 0xD8, 0xBB, // Only byte 1 matches
                    ...Array(100).fill(0x00)
                ],
                'image/jpg',
                'malicious.jpg'
            );

            const result = await validateFileType(fakeJpg);

            expect(result.isValid).toBe(false);
            expect(result.matchesSignature).toBe(false);
        });

        it('should REJECT executable with 0xD8 as second byte', async () => {
            // MZ header modified to have 0xD8 as second byte
            const exeWithD8 = createFileWithBytes(
                [
                    0x4D, 0xD8, 0x90, // Modified MZ header
                    ...Array(100).fill(0x00)
                ],
                'image/jpeg',
                'virus.jpg'
            );

            const result = await validateFileType(exeWithD8);

            expect(result.isValid).toBe(false);
        });
    });

    describe('CORRECT: Valid JPEG files', () => {
        it('should ACCEPT valid JPEG with proper [0xFF, 0xD8, 0xFF] signature', async () => {
            const validJpeg = createFileWithBytes(
                [
                    0xFF, 0xD8, 0xFF, 0xE0, // Valid JPEG (JFIF)
                    ...Array(100).fill(0x00)
                ],
                'image/jpeg',
                'photo.jpg'
            );

            const result = await validateFileType(validJpeg);

            expect(result.isValid).toBe(true);
            expect(result.matchesSignature).toBe(true);
            expect(result.category).toBe('image');
        });

        it('should ACCEPT valid JPEG with image/jpg MIME', async () => {
            const validJpg = createFileWithBytes(
                [
                    0xFF, 0xD8, 0xFF, 0xE1, // Valid JPEG (EXIF)
                    ...Array(100).fill(0x00)
                ],
                'image/jpg',
                'photo.jpg'
            );

            const result = await validateFileType(validJpg);

            expect(result.isValid).toBe(true);
            expect(result.matchesSignature).toBe(true);
        });
    });

    describe('EDGE CASES', () => {
        it('should REJECT file with only first two bytes correct', async () => {
            const partialMatch = createFileWithBytes(
                [
                    0xFF, 0xD8, 0x00, // First two correct, third wrong
                    ...Array(100).fill(0x00)
                ],
                'image/jpeg',
                'partial.jpg'
            );

            const result = await validateFileType(partialMatch);

            expect(result.isValid).toBe(false);
        });

        it('should REJECT file with only last two bytes correct', async () => {
            const partialMatch = createFileWithBytes(
                [
                    0x00, 0xD8, 0xFF, // First wrong, last two correct
                    ...Array(100).fill(0x00)
                ],
                'image/jpeg',
                'partial.jpg'
            );

            const result = await validateFileType(partialMatch);

            expect(result.isValid).toBe(false);
        });
    });
});
