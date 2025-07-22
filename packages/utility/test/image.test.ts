import { describe, expect, it } from 'bun:test';
import { toAbsoluteImagePath, toRelativePath, urlToRelativePath } from '../src/image';

describe('toAbsoluteImagePath', () => {
    describe('with regular file paths', () => {
        it('converts relative path to absolute path', () => {
            expect(toAbsoluteImagePath('images/photo.jpg')).toBe('public/images/photo.jpg');
        });

        it('converts web-relative path to absolute path', () => {
            expect(toAbsoluteImagePath('/images/photo.jpg')).toBe('public/images/photo.jpg');
        });

        it('handles nested directory paths', () => {
            expect(toAbsoluteImagePath('/images/subfolder/photo.jpg')).toBe(
                'public/images/subfolder/photo.jpg',
            );
        });

        it('returns absolute path as-is when already absolute', () => {
            expect(toAbsoluteImagePath('public/images/photo.jpg')).toBe('public/images/photo.jpg');
        });

        it('handles paths with public prefix correctly', () => {
            expect(toAbsoluteImagePath('public/images/subfolder/photo.jpg')).toBe(
                'public/images/subfolder/photo.jpg',
            );
        });
    });

    describe('with CSS url() functions (non-URLs)', () => {
        it('treats url() without full URL as path and adds public prefix', () => {
            expect(toAbsoluteImagePath('url("/images/photo.jpg")')).toBe('public/images/photo.jpg');
        });

        it('treats url() with single quotes as path and adds public prefix', () => {
            expect(toAbsoluteImagePath("url('/images/photo.jpg')")).toBe('public/images/photo.jpg');
        });

        it('treats url() without quotes as path and adds public prefix', () => {
            expect(toAbsoluteImagePath('url(/images/photo.jpg)')).toBe('public/images/photo.jpg');
        });

        it('handles url() with spaces', () => {
            expect(toAbsoluteImagePath('url( "/images/photo.jpg" )')).toBe(
                'public/images/photo.jpg',
            );
        });

        it('handles nested directory paths in url()', () => {
            expect(toAbsoluteImagePath('url("/images/subfolder/photo.jpg")')).toBe(
                'public/images/subfolder/photo.jpg',
            );
        });
    });

    describe('with full URLs in url() functions', () => {
        it('extracts pathname from full URL', () => {
            expect(toAbsoluteImagePath('url("https://example.com/images/photo.jpg")')).toBe(
                'public/images/photo.jpg',
            );
        });

        it('handles localhost URLs', () => {
            expect(toAbsoluteImagePath('url("http://localhost:3000/images/photo.jpg")')).toBe(
                'public/images/photo.jpg',
            );
        });

        it('handles CodeSandbox URLs', () => {
            expect(toAbsoluteImagePath('url("https://xxx-3000.csb.app/images/photo.jpg")')).toBe(
                'public/images/photo.jpg',
            );
        });

        it('handles URLs with query parameters', () => {
            expect(toAbsoluteImagePath('url("https://example.com/images/photo.jpg?v=1")')).toBe(
                'public/images/photo.jpg',
            );
        });

        it('handles URLs with fragments', () => {
            expect(toAbsoluteImagePath('url("https://example.com/images/photo.jpg#section")')).toBe(
                'public/images/photo.jpg',
            );
        });
    });

    describe('edge cases', () => {
        it('handles empty string', () => {
            expect(toAbsoluteImagePath('')).toBe('');
        });

        it('handles single slash', () => {
            expect(toAbsoluteImagePath('/')).toBe('');
        });

        it('handles paths with multiple slashes', () => {
            expect(toAbsoluteImagePath('//images//photo.jpg')).toBe('public/images/photo.jpg');
        });

        it('returns non-url strings as empty string', () => {
            expect(toAbsoluteImagePath('not-a-url')).toBe('');
        });

        it('handles malformed url() functions', () => {
            expect(toAbsoluteImagePath('url(')).toBe('');
        });

        it('handles url() with empty content', () => {
            expect(toAbsoluteImagePath('url("")')).toBe('');
        });
    });
});

describe('toRelativePath', () => {
    describe('with public folder prefix', () => {
        it('removes public folder prefix from image path', () => {
            expect(toRelativePath('public/images/photo.jpg')).toBe('images/photo.jpg');
        });

        it('handles nested directories within public folder', () => {
            expect(toRelativePath('public/images/subfolder/photo.jpg')).toBe(
                'images/subfolder/photo.jpg',
            );
        });

        it('handles deeply nested directories', () => {
            expect(toRelativePath('public/images/assets/icons/logo.png')).toBe(
                'images/assets/icons/logo.png',
            );
        });

        it('handles files directly in public folder', () => {
            expect(toRelativePath('public/favicon.ico')).toBe('favicon.ico');
        });

        it('handles paths with special characters in filenames', () => {
            expect(toRelativePath('public/images/photo-1_2.jpg')).toBe('images/photo-1_2.jpg');
        });

        it('handles paths with spaces in filenames', () => {
            expect(toRelativePath('public/images/my photo.jpg')).toBe('images/my photo.jpg');
        });
    });

    describe('without public folder prefix', () => {
        it('returns path unchanged when no public prefix', () => {
            expect(toRelativePath('images/photo.jpg')).toBe('images/photo.jpg');
        });

        it('returns path unchanged for relative paths', () => {
            expect(toRelativePath('assets/photo.jpg')).toBe('assets/photo.jpg');
        });

        it('returns path unchanged for absolute paths without public', () => {
            expect(toRelativePath('/images/photo.jpg')).toBe('/images/photo.jpg');
        });

        it('does not remove partial matches', () => {
            expect(toRelativePath('public-test/images/photo.jpg')).toBe(
                'public-test/images/photo.jpg',
            );
        });

        it('does not remove public when not at start', () => {
            expect(toRelativePath('assets/public/images/photo.jpg')).toBe(
                'assets/public/images/photo.jpg',
            );
        });
    });

    describe('edge cases', () => {
        it('handles empty string', () => {
            expect(toRelativePath('')).toBe('');
        });

        it('handles just public folder', () => {
            expect(toRelativePath('public/')).toBe('');
        });

        it('handles public folder without trailing slash', () => {
            expect(toRelativePath('public')).toBe('public');
        });

        it('handles paths starting with public but not followed by slash', () => {
            expect(toRelativePath('publicfolder/images/photo.jpg')).toBe(
                'publicfolder/images/photo.jpg',
            );
        });

        it('handles multiple slashes after public', () => {
            expect(toRelativePath('public//images//photo.jpg')).toBe('/images//photo.jpg');
        });

        it('handles paths with only public/ prefix', () => {
            expect(toRelativePath('public/logo.png')).toBe('logo.png');
        });

        it('preserves leading slash when removing public prefix', () => {
            expect(toRelativePath('public/images/photo.jpg')).toBe('images/photo.jpg');
        });
    });
});

describe('urlToRelativePath', () => {
    it('converts full URL to relative path in url() wrapper', () => {
        expect(urlToRelativePath('url("https://example.com/images/photo.jpg")')).toBe(
            "url('/images/photo.jpg')",
        );
    });

    it('returns non-url strings unchanged', () => {
        expect(urlToRelativePath('/images/photo.jpg')).toBe('/images/photo.jpg');
    });

    it('returns url() with relative paths unchanged', () => {
        expect(urlToRelativePath('url("/images/photo.jpg")')).toBe('url("/images/photo.jpg")');
    });

    it('handles malformed URLs gracefully', () => {
        expect(urlToRelativePath('url("not-a-valid-url")')).toBe('url("not-a-valid-url")');
    });
});
