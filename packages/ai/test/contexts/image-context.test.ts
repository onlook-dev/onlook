import { MessageContextType, type ImageMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import { ImageContext } from '../../src/contexts/classes/image';

describe('ImageContext', () => {
    const createMockImageContext = (overrides: Partial<ImageMessageContext> = {}): ImageMessageContext => ({
        type: MessageContextType.IMAGE,
        content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        displayName: 'Screenshot.png',
        mimeType: 'image/png',
        id: uuidv4(),
        ...overrides,
    });

    describe('static properties', () => {
        test('should have correct context type', () => {
            expect(ImageContext.contextType).toBe(MessageContextType.IMAGE);
        });

        test('should have correct display name', () => {
            expect(ImageContext.displayName).toBe('Image');
        });

        test('should have an icon', () => {
            expect(ImageContext.icon).toBeDefined();
        });
    });

    describe('getPrompt', () => {
        test('should generate correct prompt format for PNG', () => {
            const context = createMockImageContext();
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/png]');
        });

        test('should generate correct prompt format for JPEG', () => {
            const context = createMockImageContext({
                mimeType: 'image/jpeg',
                content: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDX/9k=',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/jpeg]');
        });

        test('should generate correct prompt format for GIF', () => {
            const context = createMockImageContext({
                mimeType: 'image/gif',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/gif]');
        });

        test('should generate correct prompt format for WebP', () => {
            const context = createMockImageContext({
                mimeType: 'image/webp',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/webp]');
        });

        test('should generate correct prompt format for SVG', () => {
            const context = createMockImageContext({
                mimeType: 'image/svg+xml',
                content: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/svg+xml]');
        });

        test('should handle unknown mime types', () => {
            const context = createMockImageContext({
                mimeType: 'image/unknown',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/unknown]');
        });

        test('should handle empty mime type', () => {
            const context = createMockImageContext({
                mimeType: '',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: ]');
        });

        test('should handle mime type with charset', () => {
            const context = createMockImageContext({
                mimeType: 'image/svg+xml; charset=utf-8',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/svg+xml; charset=utf-8]');
        });

        test('should handle non-standard mime types', () => {
            const context = createMockImageContext({
                mimeType: 'application/octet-stream',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: application/octet-stream]');
        });
    });

    describe('getLabel', () => {
        test('should use displayName when available', () => {
            const context = createMockImageContext({
                displayName: 'Profile Picture',
            });
            const label = ImageContext.getLabel(context);

            expect(label).toBe('Profile Picture');
        });

        test('should fallback to "Image" when no displayName', () => {
            const context = createMockImageContext({
                displayName: '',
            });
            const label = ImageContext.getLabel(context);

            expect(label).toBe('Image');
        });

        test('should fallback to "Image" when displayName is undefined', () => {
            const context = createMockImageContext();
            delete (context as any).displayName;
            const label = ImageContext.getLabel(context);

            expect(label).toBe('Image');
        });

        test('should handle displayName with special characters', () => {
            const context = createMockImageContext({
                displayName: 'Screenshot & Design #1.png',
            });
            const label = ImageContext.getLabel(context);

            expect(label).toBe('Screenshot & Design #1.png');
        });

        test('should handle displayName with unicode characters', () => {
            const context = createMockImageContext({
                displayName: '图片文件.jpg',
            });
            const label = ImageContext.getLabel(context);

            expect(label).toBe('图片文件.jpg');
        });

        test('should handle whitespace-only displayName', () => {
            const context = createMockImageContext({
                displayName: '   \t\n   ',
            });
            const label = ImageContext.getLabel(context);

            expect(label).toBe('   \t\n   ');
        });

        test('should handle very long displayName', () => {
            const longName = 'Very long image filename that might be generated by some applications ' + 'a'.repeat(100) + '.png';
            const context = createMockImageContext({
                displayName: longName,
            });
            const label = ImageContext.getLabel(context);

            expect(label).toBe(longName);
        });
    });

    describe('toFileUIParts', () => {
        test('should convert single image to file UI part', () => {
            const images = [createMockImageContext()];
            const parts = ImageContext.toFileUIParts(images);

            expect(parts).toHaveLength(1);
            expect(parts[0]!).toEqual({
                type: 'file',
                mediaType: 'image/png',
                url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            });
        });

        test('should convert multiple images to file UI parts', () => {
            const images = [
                createMockImageContext({
                    mimeType: 'image/jpeg',
                    content: 'data:image/jpeg;base64,jpeg-data',
                }),
                createMockImageContext({
                    mimeType: 'image/gif',
                    content: 'data:image/gif;base64,gif-data',
                }),
                createMockImageContext({
                    mimeType: 'image/webp',
                    content: 'data:image/webp;base64,webp-data',
                }),
            ];
            const parts = ImageContext.toFileUIParts(images);

            expect(parts).toHaveLength(3);
            expect(parts[0]!).toEqual({
                type: 'file',
                mediaType: 'image/jpeg',
                url: 'data:image/jpeg;base64,jpeg-data',
            });
            expect(parts[1]!).toEqual({
                type: 'file',
                mediaType: 'image/gif',
                url: 'data:image/gif;base64,gif-data',
            });
            expect(parts[2]!).toEqual({
                type: 'file',
                mediaType: 'image/webp',
                url: 'data:image/webp;base64,webp-data',
            });
        });

        test('should handle empty images array', () => {
            const parts = ImageContext.toFileUIParts([]);
            expect(parts).toHaveLength(0);
            expect(parts).toEqual([]);
        });

        test('should preserve order of images', () => {
            const images = [
                createMockImageContext({ content: 'first-image-data' }),
                createMockImageContext({ content: 'second-image-data' }),
                createMockImageContext({ content: 'third-image-data' }),
            ];
            const parts = ImageContext.toFileUIParts(images);

            expect(parts[0]!.url).toBe('first-image-data');
            expect(parts[1]!.url).toBe('second-image-data');
            expect(parts[2]!.url).toBe('third-image-data');
        });

        test('should handle images with various mime types', () => {
            const images = [
                createMockImageContext({ mimeType: 'image/png' }),
                createMockImageContext({ mimeType: 'image/svg+xml' }),
                createMockImageContext({ mimeType: 'image/bmp' }),
                createMockImageContext({ mimeType: 'image/tiff' }),
            ];
            const parts = ImageContext.toFileUIParts(images);

            expect(parts[0]!.mediaType).toBe('image/png');
            expect(parts[1]!.mediaType).toBe('image/svg+xml');
            expect(parts[2]!.mediaType).toBe('image/bmp');
            expect(parts[3]!.mediaType).toBe('image/tiff');
        });

        test('should handle images with URL content (not data URLs)', () => {
            const images = [
                createMockImageContext({
                    content: 'https://example.com/image1.png',
                    mimeType: 'image/png',
                }),
                createMockImageContext({
                    content: '/uploads/image2.jpg',
                    mimeType: 'image/jpeg',
                }),
            ];
            const parts = ImageContext.toFileUIParts(images);

            expect(parts[0]!.url).toBe('https://example.com/image1.png');
            expect(parts[1]!.url).toBe('/uploads/image2.jpg');
        });

        test('should handle images with empty content', () => {
            const images = [
                createMockImageContext({ content: '' }),
            ];
            const parts = ImageContext.toFileUIParts(images);

            expect(parts[0]!.url).toBe('');
        });
    });

    describe('edge cases', () => {
        test('should handle null or undefined properties gracefully', () => {
            const context = {
                type: MessageContextType.IMAGE,
                content: 'test-content',
                displayName: null,
                mimeType: undefined,
            } as any;

            expect(() => ImageContext.getPrompt(context)).not.toThrow();
            expect(() => ImageContext.getLabel(context)).not.toThrow();
        });

        test('should handle very long base64 data', () => {
            const longBase64 = 'data:image/png;base64,' + 'A'.repeat(100000);
            const context = createMockImageContext({
                content: longBase64,
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/png]');
        });

        test('should handle SVG with inline content', () => {
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="blue" />
                <text x="50" y="50" fill="white" text-anchor="middle">Hello</text>
            </svg>`;
            const context = createMockImageContext({
                content: svgContent,
                mimeType: 'image/svg+xml',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/svg+xml]');
        });

        test('should handle mime type with parameters', () => {
            const context = createMockImageContext({
                mimeType: 'image/png; quality=0.9; compression=lossless',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: image/png; quality=0.9; compression=lossless]');
        });

        test('should handle blob URLs', () => {
            const context = createMockImageContext({
                content: 'blob:https://example.com/12345678-1234-1234-1234-123456789abc',
            });
            const parts = ImageContext.toFileUIParts([context]);

            expect(parts[0]!.url).toBe('blob:https://example.com/12345678-1234-1234-1234-123456789abc');
        });

        test('should handle file:// URLs', () => {
            const context = createMockImageContext({
                content: 'file:///path/to/local/image.png',
            });
            const parts = ImageContext.toFileUIParts([context]);

            expect(parts[0]!.url).toBe('file:///path/to/local/image.png');
        });

        test('should handle case-sensitive mime types', () => {
            const context = createMockImageContext({
                mimeType: 'IMAGE/PNG',
            });
            const prompt = ImageContext.getPrompt(context);

            expect(prompt).toBe('[Image: IMAGE/PNG]');
        });

        test('should handle unicode characters in displayName and content', () => {
            const context = createMockImageContext({
                displayName: '屏幕截图 🖼️.png',
                content: 'data:image/png;base64,unicode-test-data',
            });
            const label = ImageContext.getLabel(context);
            const parts = ImageContext.toFileUIParts([context]);

            expect(label).toBe('屏幕截图 🖼️.png');
            expect(parts[0]!.url).toBe('data:image/png;base64,unicode-test-data');
        });
    });
});