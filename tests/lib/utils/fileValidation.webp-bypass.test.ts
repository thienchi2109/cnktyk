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
 * P1 Security Test: WebP Magic-Byte Validation Bypass
 * 
 * VULNERABILITY: Current implementation only checks RIFF header (bytes 0-3)
 * but RIFF is shared by WAV, AVI, and WebP. An attacker can upload any RIFF
 * file with MIME type image/webp and bypass validation.
 * 
 * FIX REQUIRED: Check full WebP signature (RIFF + size + WEBP)
 */
describe('[P1] WebP Magic-Byte Validation Bypass', () => {
    function createFileWithBytes(bytes: number[], mimeType: string, filename: string): File {
        const buffer = new Uint8Array(bytes);
        const blob = new Blob([buffer], { type: mimeType });
        return new File([blob], filename, { type: mimeType });
    }

    describe('VULNERABILITY: RIFF-based file spoofing', () => {
        it('should REJECT AVI file disguised as WebP (RIFF + AVI header)', async () => {
            // AVI file structure: RIFF + size + AVI + ...
            const aviFile = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF
                    0x00, 0x00, 0x00, 0x00, // Size (placeholder)
                    0x41, 0x56, 0x49, 0x20, // 'AVI ' (not WEBP!)
                    ...Array(100).fill(0)
                ],
                'image/webp', // Attacker claims it's WebP
                'malicious.webp'
            );

            const result = await validateFileType(aviFile);

            // CURRENT BEHAVIOR: This will PASS (vulnerability!)
            // EXPECTED BEHAVIOR: Should REJECT
            expect(result.isValid).toBe(false);
            expect(result.matchesSignature).toBe(false);
            expect(result.error).toContain('signature does not match');
        });

        it('should REJECT WAV file disguised as WebP (RIFF + WAVE header)', async () => {
            // WAV file structure: RIFF + size + WAVE + ...
            const wavFile = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF
                    0x00, 0x00, 0x00, 0x00, // Size (placeholder)
                    0x57, 0x41, 0x56, 0x45, // 'WAVE' (not WEBP!)
                    ...Array(100).fill(0)
                ],
                'image/webp',
                'audio.webp'
            );

            const result = await validateFileType(wavFile);

            // CURRENT BEHAVIOR: This will PASS (vulnerability!)
            // EXPECTED BEHAVIOR: Should REJECT
            expect(result.isValid).toBe(false);
            expect(result.matchesSignature).toBe(false);
        });

        it('should REJECT generic RIFF file with arbitrary content', async () => {
            // Generic RIFF container with random FourCC
            const riffFile = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF
                    0x00, 0x00, 0x00, 0x00, // Size
                    0x58, 0x58, 0x58, 0x58, // 'XXXX' (arbitrary)
                    ...Array(100).fill(0xAA) // Arbitrary payload
                ],
                'image/webp',
                'exploit.webp'
            );

            const result = await validateFileType(riffFile);

            expect(result.isValid).toBe(false);
            expect(result.matchesSignature).toBe(false);
        });
    });

    describe('CORRECT: Valid WebP files', () => {
        it('should ACCEPT valid WebP with proper RIFF + WEBP header', async () => {
            // Proper WebP structure: RIFF + size + WEBP + VP8/VP8L/VP8X
            const validWebP = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF
                    0x1A, 0x00, 0x00, 0x00, // Size: 26 bytes (little-endian)
                    0x57, 0x45, 0x42, 0x50, // 'WEBP' ✅
                    0x56, 0x50, 0x38, 0x20, // 'VP8 ' (lossy)
                    ...Array(100).fill(0)
                ],
                'image/webp',
                'valid.webp'
            );

            const result = await validateFileType(validWebP);

            expect(result.isValid).toBe(true);
            expect(result.matchesSignature).toBe(true);
            expect(result.category).toBe('image');
        });

        it('should ACCEPT valid WebP with VP8L (lossless)', async () => {
            const validWebP = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF
                    0x1A, 0x00, 0x00, 0x00, // Size
                    0x57, 0x45, 0x42, 0x50, // 'WEBP' ✅
                    0x56, 0x50, 0x38, 0x4C, // 'VP8L' (lossless)
                    ...Array(100).fill(0)
                ],
                'image/webp',
                'lossless.webp'
            );

            const result = await validateFileType(validWebP);

            expect(result.isValid).toBe(true);
            expect(result.matchesSignature).toBe(true);
        });

        it('should ACCEPT valid WebP with VP8X (extended)', async () => {
            const validWebP = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF
                    0x1A, 0x00, 0x00, 0x00, // Size
                    0x57, 0x45, 0x42, 0x50, // 'WEBP' ✅
                    0x56, 0x50, 0x38, 0x58, // 'VP8X' (extended)
                    ...Array(100).fill(0)
                ],
                'image/webp',
                'extended.webp'
            );

            const result = await validateFileType(validWebP);

            expect(result.isValid).toBe(true);
            expect(result.matchesSignature).toBe(true);
        });
    });

    describe('EDGE CASES', () => {
        it('should REJECT WebP with incomplete header (only RIFF)', async () => {
            const incompleteWebP = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF only
                    0x00, 0x00, 0x00, 0x00, // Size
                    // Missing WEBP marker!
                ],
                'image/webp',
                'incomplete.webp'
            );

            const result = await validateFileType(incompleteWebP);

            expect(result.isValid).toBe(false);
        });

        it('should REJECT WebP with corrupted WEBP marker', async () => {
            const corruptedWebP = createFileWithBytes(
                [
                    0x52, 0x49, 0x46, 0x46, // RIFF
                    0x1A, 0x00, 0x00, 0x00, // Size
                    0x57, 0x45, 0x42, 0x00, // 'WEB\0' (corrupted!)
                    ...Array(100).fill(0)
                ],
                'image/webp',
                'corrupted.webp'
            );

            const result = await validateFileType(corruptedWebP);

            expect(result.isValid).toBe(false);
        });
    });
});
