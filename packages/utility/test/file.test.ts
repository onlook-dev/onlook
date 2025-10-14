import { describe, expect, it } from 'bun:test';
import { getMimeType, isImageFile, isVideoFile } from '../src/file';

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

        it('returns false for common non-image/non-video extensions', () => {
            expect(isImageFile('audio.mp3')).toBe(false);
            expect(isImageFile('archive.zip')).toBe(false);
            expect(isImageFile('document.pdf')).toBe(false);
            expect(isImageFile('document.txt')).toBe(false);
        });

        it('returns true for video files', () => {
            expect(isImageFile('video.mp4')).toBe(true);
            expect(isImageFile('video.webm')).toBe(true);
            expect(isImageFile('video.ogg')).toBe(true);
            expect(isImageFile('video.mov')).toBe(true);
            expect(isImageFile('video.avi')).toBe(true);
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

describe('isVideoFile', () => {
    describe('should return true for video file extensions', () => {
        it('returns true for mp4 files', () => {
            expect(isVideoFile('video.mp4')).toBe(true);
            expect(isVideoFile('movie.MP4')).toBe(true);
        });

        it('returns true for webm files', () => {
            expect(isVideoFile('clip.webm')).toBe(true);
            expect(isVideoFile('recording.WEBM')).toBe(true);
        });

        it('returns true for ogg/ogv files', () => {
            expect(isVideoFile('video.ogg')).toBe(true);
            expect(isVideoFile('video.ogv')).toBe(true);
        });

        it('returns true for mov files', () => {
            expect(isVideoFile('video.mov')).toBe(true);
            expect(isVideoFile('clip.MOV')).toBe(true);
        });

        it('returns true for avi files', () => {
            expect(isVideoFile('video.avi')).toBe(true);
            expect(isVideoFile('movie.AVI')).toBe(true);
        });
    });

    describe('should return true for video MIME types', () => {
        it('returns true for video MIME types', () => {
            expect(isVideoFile('video/mp4')).toBe(true);
            expect(isVideoFile('video/webm')).toBe(true);
            expect(isVideoFile('video/ogg')).toBe(true);
            expect(isVideoFile('video/quicktime')).toBe(true);
            expect(isVideoFile('video/x-msvideo')).toBe(true);
        });
    });

    describe('should return false for non-video formats', () => {
        it('returns false for image files', () => {
            expect(isVideoFile('image.jpg')).toBe(false);
            expect(isVideoFile('image.png')).toBe(false);
            expect(isVideoFile('image.gif')).toBe(false);
        });

        it('returns false for audio files', () => {
            expect(isVideoFile('audio.mp3')).toBe(false);
            expect(isVideoFile('audio.wav')).toBe(false);
        });

        it('returns false for document files', () => {
            expect(isVideoFile('document.pdf')).toBe(false);
            expect(isVideoFile('document.txt')).toBe(false);
        });

        it('returns false for image MIME types', () => {
            expect(isVideoFile('image/jpeg')).toBe(false);
            expect(isVideoFile('image/png')).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('handles filenames with special characters', () => {
            expect(isVideoFile('my-video_file.mp4')).toBe(true);
            expect(isVideoFile('video (1).webm')).toBe(true);
            expect(isVideoFile('clip@2x.mov')).toBe(true);
        });

        it('handles filenames with unicode characters', () => {
            expect(isVideoFile('视频.mp4')).toBe(true);
            expect(isVideoFile('ビデオ.webm')).toBe(true);
        });

        it('handles full file paths with slashes', () => {
            expect(isVideoFile('/public/gradient.mp4')).toBe(true);
            expect(isVideoFile('/path/to/video.webm')).toBe(true);
            expect(isVideoFile('./assets/video.mov')).toBe(true);
            expect(isVideoFile('../videos/clip.avi')).toBe(true);
            expect(isVideoFile('/public/image.jpg')).toBe(false);
        });
    });
});
