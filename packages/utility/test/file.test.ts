import { describe, expect, it } from 'bun:test';
import { formatWithLineNumbers, getMimeType, isImageFile } from '../src/file';

describe('getMimeType', () => {
    it('returns correct MIME type for .ico', () => {
        expect(getMimeType('favicon.ico')).toBe('image/x-icon');
    });
    it('returns correct MIME type for .png', () => {
        expect(getMimeType('image.png')).toBe('image/png');
    });
    it('returns correct MIME type for .jpg', () => {
        expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    });
    it('returns correct MIME type for .jpeg', () => {
        expect(getMimeType('photo.JPEG')).toBe('image/jpeg');
    });
    it('returns correct MIME type for .svg', () => {
        expect(getMimeType('vector.SVG')).toBe('image/svg+xml');
    });
    it('returns correct MIME type for .gif', () => {
        expect(getMimeType('animation.gif')).toBe('image/gif');
    });
    it('returns correct MIME type for .webp', () => {
        expect(getMimeType('image.webp')).toBe('image/webp');
    });
    it('returns correct MIME type for .bmp', () => {
        expect(getMimeType('bitmap.bmp')).toBe('image/bmp');
    });
    it('returns application/octet-stream for unknown extension', () => {
        expect(getMimeType('file.unknown')).toBe('application/octet-stream');
    });
    it('handles uppercase extensions', () => {
        expect(getMimeType('UPPERCASE.JPG')).toBe('image/jpeg');
    });
    it('handles filenames without extension', () => {
        expect(getMimeType('noextension')).toBe('application/octet-stream');
    });
});

describe('isImageFile', () => {
    describe('should return true for supported image formats', () => {
        it('returns true for JPEG files', () => {
            expect(isImageFile('photo.jpg')).toBe(true);
            expect(isImageFile('image.jpeg')).toBe(true);
        });

        it('returns true for PNG files', () => {
            expect(isImageFile('image.png')).toBe(true);
        });

        it('returns true for GIF files', () => {
            expect(isImageFile('animation.gif')).toBe(true);
        });

        it('returns true for WebP files', () => {
            expect(isImageFile('image.webp')).toBe(true);
        });

        it('returns true for SVG files', () => {
            expect(isImageFile('vector.svg')).toBe(true);
        });

        it('returns true for ICO files', () => {
            expect(isImageFile('favicon.ico')).toBe(true);
        });

        it('handles case insensitive extensions', () => {
            expect(isImageFile('PHOTO.JPG')).toBe(true);
            expect(isImageFile('IMAGE.PNG')).toBe(true);
            expect(isImageFile('ANIMATION.GIF')).toBe(true);
            expect(isImageFile('IMAGE.WEBP')).toBe(true);
            expect(isImageFile('VECTOR.SVG')).toBe(true);
        });

        it('handles mixed case extensions', () => {
            expect(isImageFile('photo.Jpg')).toBe(true);
            expect(isImageFile('image.Png')).toBe(true);
            expect(isImageFile('vector.Svg')).toBe(true);
        });

        it('handles files with paths', () => {
            expect(isImageFile('/path/to/image.jpg')).toBe(true);
            expect(isImageFile('folder/subfolder/photo.png')).toBe(true);
            expect(isImageFile('./assets/images/icon.svg')).toBe(true);
        });

        it('handles files with multiple dots', () => {
            expect(isImageFile('my.image.file.jpg')).toBe(true);
            expect(isImageFile('component.icon.svg')).toBe(true);
        });
    });

    describe('should return false for unsupported formats', () => {
        it('returns false for unsupported image formats', () => {
            expect(isImageFile('image.tiff')).toBe(false);
            expect(isImageFile('image.tif')).toBe(false);
        });

        it('returns false for non-image files', () => {
            expect(isImageFile('document.txt')).toBe(false);
            expect(isImageFile('script.js')).toBe(false);
            expect(isImageFile('style.css')).toBe(false);
            expect(isImageFile('page.html')).toBe(false);
            expect(isImageFile('data.json')).toBe(false);
            expect(isImageFile('component.tsx')).toBe(false);
            expect(isImageFile('readme.md')).toBe(false);
        });

        it('returns false for files without extensions', () => {
            expect(isImageFile('filename')).toBe(false);
            expect(isImageFile('README')).toBe(false);
            expect(isImageFile('Dockerfile')).toBe(false);
        });

        it('returns false for empty or invalid inputs', () => {
            expect(isImageFile('')).toBe(false);
            expect(isImageFile('.')).toBe(false);
            expect(isImageFile('..')).toBe(false);
            expect(isImageFile('.hidden')).toBe(false);
        });

        it('returns false for files with only dots', () => {
            expect(isImageFile('...')).toBe(false);
            expect(isImageFile('....')).toBe(false);
        });

        it('returns false for common non-image extensions', () => {
            expect(isImageFile('video.mp4')).toBe(false);
            expect(isImageFile('audio.mp3')).toBe(false);
            expect(isImageFile('archive.zip')).toBe(false);
            expect(isImageFile('document.pdf')).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('handles filenames with special characters', () => {
            expect(isImageFile('my-image_file.jpg')).toBe(true);
            expect(isImageFile('image (1).png')).toBe(true);
            expect(isImageFile('photo@2x.jpg')).toBe(true);
        });

        it('handles very long filenames', () => {
            const longFilename = 'a'.repeat(200) + '.jpg';
            expect(isImageFile(longFilename)).toBe(true);
        });

        it('handles filenames with unicode characters', () => {
            expect(isImageFile('图片.jpg')).toBe(true);
            expect(isImageFile('画像.png')).toBe(true);
            expect(isImageFile('émoji😀.svg')).toBe(true);
        });
    });
});

describe('formatWithLineNumbers', () => {
    it('formats single line with default start index', () => {
        const content = 'Hello world';
        const expected = '1→Hello world';
        expect(formatWithLineNumbers(content)).toBe(expected);
    });

    it('formats multiple lines with default start index', () => {
        const content = 'Line one\nLine two\nLine three';
        const expected = '1→Line one\n2→Line two\n3→Line three';
        expect(formatWithLineNumbers(content)).toBe(expected);
    });

    it('formats with custom start index', () => {
        const content = 'First line\nSecond line';
        const expected = '5→First line\n6→Second line';
        expect(formatWithLineNumbers(content, 5)).toBe(expected);
    });

    it('handles empty content', () => {
        const content = '';
        const expected = '1→';
        expect(formatWithLineNumbers(content)).toBe(expected);
    });

    it('handles content with empty lines', () => {
        const content = 'Line 1\n\nLine 3';
        const expected = '1→Line 1\n2→\n3→Line 3';
        expect(formatWithLineNumbers(content)).toBe(expected);
    });

    it('pads line numbers correctly for double digits', () => {
        const content = Array(12).fill('line').map((_, i) => `Line ${i + 1}`).join('\n');
        const lines = formatWithLineNumbers(content).split('\n');
        expect(lines[0]).toBe(' 1→Line 1');
        expect(lines[8]).toBe(' 9→Line 9');
        expect(lines[9]).toBe('10→Line 10');
        expect(lines[11]).toBe('12→Line 12');
    });

    it('pads line numbers correctly with custom start index', () => {
        const content = 'Line 1\nLine 2';
        const expected = '98→Line 1\n99→Line 2';
        expect(formatWithLineNumbers(content, 98)).toBe(expected);
    });

    it('handles large line numbers with proper padding', () => {
        const content = 'Line 1\nLine 2';
        const expected = '998→Line 1\n999→Line 2';
        expect(formatWithLineNumbers(content, 998)).toBe(expected);
    });

    it('handles content that ends with newline', () => {
        const content = 'Line 1\nLine 2\n';
        const expected = '1→Line 1\n2→Line 2\n3→';
        expect(formatWithLineNumbers(content)).toBe(expected);
    });

    it('preserves tabs and spaces in content', () => {
        const content = '\tIndented line\n  Spaced line';
        const expected = '1→\tIndented line\n2→  Spaced line';
        expect(formatWithLineNumbers(content)).toBe(expected);
    });
});
