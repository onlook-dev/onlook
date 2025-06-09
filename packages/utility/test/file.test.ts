import { describe, expect, it } from 'bun:test';
import { getMimeType } from '../src/file';

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
