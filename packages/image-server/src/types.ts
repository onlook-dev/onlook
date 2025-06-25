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
