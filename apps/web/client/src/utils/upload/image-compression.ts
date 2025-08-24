// Image compression utilities for feedback attachments

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0.1 to 1.0
    format?: 'image/jpeg' | 'image/webp';
    maxSizeBytes?: number;
}

export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'image/jpeg',
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
};

export function canCompressFile(file: File): boolean {
    const compressibleTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/bmp',
        'image/tiff',
    ];
    return compressibleTypes.includes(file.type.toLowerCase());
}

export async function compressImage(
    file: File,
    options: CompressionOptions = {},
    onProgress?: (progress: number) => void
): Promise<CompressionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    if (!canCompressFile(file)) {
        throw new Error(`Cannot compress file type: ${file.type}`);
    }

    onProgress?.(10);

    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            try {
                onProgress?.(30);

                // Calculate new dimensions
                let { width, height } = img;
                const aspectRatio = width / height;

                if (width > opts.maxWidth) {
                    width = opts.maxWidth;
                    height = width / aspectRatio;
                }
                if (height > opts.maxHeight) {
                    height = opts.maxHeight;
                    width = height * aspectRatio;
                }

                canvas.width = width;
                canvas.height = height;

                onProgress?.(50);

                // Draw and compress
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    onProgress?.(70);

                    // Try different quality levels if size is too large
                    let quality = opts.quality;
                    let attempts = 0;
                    const maxAttempts = 5;

                    const tryCompression = () => {
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Failed to compress image'));
                                    return;
                                }

                                onProgress?.(90);

                                // If still too large and we have attempts left, reduce quality
                                if (blob.size > opts.maxSizeBytes && attempts < maxAttempts) {
                                    attempts++;
                                    quality = Math.max(0.3, quality - 0.1); // Don't go below 30% quality
                                    tryCompression();
                                    return;
                                }

                                // Create compressed file
                                const compressedFile = new File(
                                    [blob],
                                    file.name.replace(/\.[^/.]+$/, '') + getExtensionForFormat(opts.format),
                                    { type: opts.format }
                                );

                                onProgress?.(100);

                                resolve({
                                    file: compressedFile,
                                    originalSize: file.size,
                                    compressedSize: blob.size,
                                    compressionRatio: (1 - blob.size / file.size) * 100,
                                });
                            },
                            opts.format,
                            quality
                        );
                    };

                    tryCompression();
                } else {
                    reject(new Error('Failed to get canvas context'));
                }
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        img.src = URL.createObjectURL(file);
        onProgress?.(20);
    });
}

export async function compressMultipleImages(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (fileIndex: number, fileProgress: number, totalProgress: number) => void
): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        
        if (!canCompressFile(file)) {
            // For non-compressible files, return as-is
            results.push({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
            });
            onProgress?.(i, 100, ((i + 1) / files.length) * 100);
            continue;
        }

        try {
            const result = await compressImage(file, options, (progress) => {
                onProgress?.(i, progress, ((i + progress / 100) / files.length) * 100);
            });
            results.push(result);
        } catch (error) {
            console.error(`Failed to compress ${file.name}:`, error);
            // Fall back to original file
            results.push({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
            });
        }
        
        onProgress?.(i, 100, ((i + 1) / files.length) * 100);
    }

    return results;
}

function getExtensionForFormat(format: string): string {
    switch (format) {
        case 'image/jpeg':
            return '.jpg';
        case 'image/webp':
            return '.webp';
        case 'image/png':
            return '.png';
        default:
            return '.jpg';
    }
}

// Smart compression based on file size
export function getCompressionOptions(file: File): CompressionOptions {
    const size = file.size;
    const MB = 1024 * 1024;

    if (size > 10 * MB) {
        // Very large files - aggressive compression
        return {
            maxWidth: 1280,
            maxHeight: 720,
            quality: 0.6,
            format: 'image/jpeg',
            maxSizeBytes: 1 * MB,
        };
    } else if (size > 5 * MB) {
        // Large files - moderate compression
        return {
            maxWidth: 1600,
            maxHeight: 900,
            quality: 0.7,
            format: 'image/jpeg',
            maxSizeBytes: 1.5 * MB,
        };
    } else if (size > 2 * MB) {
        // Medium files - light compression
        return {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8,
            format: 'image/jpeg',
            maxSizeBytes: 2 * MB,
        };
    } else {
        // Small files - minimal compression, keep quality
        return {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.85,
            format: file.type === 'image/png' ? 'image/webp' : 'image/jpeg',
            maxSizeBytes: 2 * MB,
        };
    }
}