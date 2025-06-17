import { describe, expect, it, mock } from 'bun:test';
import { compressImage, base64ToBlob } from '../src/image';

// Mock browser-image-compression
const mockCompressedFile = new File(['compressed'], 'compressed.jpg', { type: 'image/jpeg' });
const mockImageCompression = mock(() => mockCompressedFile);
const mockGetDataUrlFromFile = mock(() => 'data:image/jpeg;base64,compressed-data');

// Mock the module
mock.module('browser-image-compression', () => ({
    default: Object.assign(mockImageCompression, {
        getDataUrlFromFile: mockGetDataUrlFromFile,
    }),
}));

describe('Image Compression', () => {
    describe('compressImage', () => {
        it('should compress image and return base64', async () => {
            // Create a test file
            const testFile = new File(['test-image-data'], 'test.jpg', { type: 'image/jpeg' });

            const result = await compressImage(testFile);

            // Verify compression was called with correct options
            expect(mockImageCompression).toHaveBeenCalledTimes(1);
            expect(mockImageCompression).toHaveBeenCalledWith(testFile, {
                maxSizeMB: 2,
                maxWidthOrHeight: 2048,
            });

            // Verify getDataUrlFromFile was called
            expect(mockGetDataUrlFromFile).toHaveBeenCalledTimes(1);
            expect(mockGetDataUrlFromFile).toHaveBeenCalledWith(mockCompressedFile);

            // Verify result is the expected base64 string
            expect(result).toBe('data:image/jpeg;base64,compressed-data');
        });

        it('should return undefined when compression fails', async () => {
            // Create a test file
            const testFile = new File(['test-image-data'], 'test.jpg', { type: 'image/jpeg' });

            // Mock the compression to throw an error
            const originalConsoleError = console.error;
            const consoleErrorSpy = mock(() => {});
            console.error = consoleErrorSpy;

            mockImageCompression.mockImplementationOnce(() => {
                throw new Error('Compression failed');
            });

            const result = await compressImage(testFile);

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error compressing image:',
                expect.any(Error),
            );

            // Verify result is undefined
            expect(result).toBeUndefined();

            // Restore the mock and console
            mockImageCompression.mockImplementation(() => mockCompressedFile);
            console.error = originalConsoleError;
        });

        it('should log compression size reduction', async () => {
            // Create a test file
            const testFile = new File(['x'.repeat(1024 * 1024)], 'test.jpg', {
                type: 'image/jpeg',
            });

            // Mock console.log to spy on it
            const originalConsoleLog = console.log;
            const consoleLogSpy = mock(() => {});
            console.log = consoleLogSpy;

            await compressImage(testFile);

            // Verify the size reduction log was called
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Image size reduced from \d+ to \d+ \(bytes\)/),
            );

            // Restore console
            console.log = originalConsoleLog;
        });
    });

    describe('base64ToBlob', () => {
        it('should convert base64 to Blob correctly', () => {
            // Create a simple base64 string
            const base64 = 'data:image/jpeg;base64,L2Zvb2Jhcg=='; // '/foobar' in base64
            const mimeType = 'image/jpeg';

            const blob = base64ToBlob(base64, mimeType);

            // Verify blob properties
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe(mimeType);
            expect(blob.size).toBe(7); // '/foobar' is 7 bytes
        });

        it('should handle empty base64 string', () => {
            const base64 = 'data:image/jpeg;base64,';
            const mimeType = 'image/jpeg';

            const blob = base64ToBlob(base64, mimeType);

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe(mimeType);
            expect(blob.size).toBe(0);
        });
    });
});
