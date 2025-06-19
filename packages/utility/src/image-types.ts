// Shared types for image compression utilities
export type SupportedFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface CompressionOptions {
    quality?: number;
    width?: number;
    height?: number;
    format?: SupportedFormat | 'auto';
    progressive?: boolean;
    mozjpeg?: boolean;
    effort?: number;
    compressionLevel?: number;
    keepAspectRatio?: boolean;
    withoutEnlargement?: boolean;
}

export interface CompressionResult {
    success: boolean;
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: number;
    outputPath?: string;
    buffer?: Buffer;
    error?: string;
}

/**
 * Compression presets for common use cases
 */
export const compressionPresets = {
    web: {
        quality: 80,
        format: 'webp' as const,
        progressive: true,
        effort: 4,
    },
    thumbnail: {
        quality: 70,
        width: 300,
        height: 300,
        format: 'webp' as const,
        keepAspectRatio: true,
    },
    highQuality: {
        quality: 95,
        format: 'jpeg' as const,
        progressive: true,
        mozjpeg: true,
    },
    lowFileSize: {
        quality: 60,
        format: 'webp' as const,
        effort: 6,
    },
} as const;
