import imageCompression from 'browser-image-compression';

// Server-side image compression types
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

// Browser-side compression
export async function compressImage(file: File): Promise<string | undefined> {
    const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2048,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        const base64URL = imageCompression.getDataUrlFromFile(compressedFile);
        console.log(`Image size reduced from ${file.size} to ${compressedFile.size} (bytes)`);
        return base64URL;
    } catch (error) {
        console.error('Error compressing image:', error);
    }
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString = atob(base64.split(',')[1] ?? '');
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
}

export async function compressImageServer(
    input: string | Buffer,
    outputPath?: string,
    options: CompressionOptions = {},
): Promise<CompressionResult> {
    // Dynamic import for Sharp to avoid issues in browser environments
    try {
        const sharp = await import('sharp');

        const {
            quality = 80,
            width,
            height,
            format = 'auto',
            progressive = true,
            mozjpeg = true,
            effort = 4,
            compressionLevel = 6,
            keepAspectRatio = true,
            withoutEnlargement = true,
        } = options;

        // Initialize Sharp instance
        let sharpInstance: any;
        let originalSize: number | undefined;

        if (typeof input === 'string') {
            // Input is a file path
            const fs = await import('fs/promises');
            const stats = await fs.stat(input);
            originalSize = stats.size;
            sharpInstance = sharp.default(input);
        } else {
            // Input is a buffer
            originalSize = input.length;
            sharpInstance = sharp.default(input);
        }

        // Get metadata to determine output format if auto
        const metadata = await sharpInstance.metadata();
        let outputFormat: SupportedFormat = format as SupportedFormat;

        if (format === 'auto') {
            outputFormat = determineOptimalFormat(metadata.format);
        }

        // Apply resizing if dimensions are provided
        if (width || height) {
            const resizeOptions = {
                width,
                height,
                fit: keepAspectRatio ? 'inside' : 'fill',
                withoutEnlargement,
            };
            sharpInstance = sharpInstance.resize(resizeOptions);
        }

        // Apply format-specific compression
        sharpInstance = applyFormatCompression(sharpInstance, outputFormat, {
            quality,
            progressive,
            mozjpeg,
            effort,
            compressionLevel,
        });

        let result: CompressionResult;

        if (outputPath) {
            // Save to file
            const info = await sharpInstance.toFile(outputPath);
            const compressedSize = info.size;

            result = {
                success: true,
                originalSize,
                compressedSize,
                compressionRatio: originalSize
                    ? ((originalSize - compressedSize) / originalSize) * 100
                    : undefined,
                outputPath,
            };
        } else {
            // Return buffer
            const buffer = await sharpInstance.toBuffer({ resolveWithObject: true });
            const compressedSize = buffer.data.length;

            result = {
                success: true,
                originalSize,
                compressedSize,
                compressionRatio: originalSize
                    ? ((originalSize - compressedSize) / originalSize) * 100
                    : undefined,
                buffer: buffer.data,
            };
        }

        return result;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Batch compress multiple images on server
 */
export async function batchCompressImagesServer(
    inputPaths: string[],
    outputDir: string,
    options: CompressionOptions = {},
): Promise<CompressionResult[]> {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        const compressionPromises = inputPaths.map(async (inputPath) => {
            const fileName = path.basename(inputPath);
            const nameWithoutExt = path.parse(fileName).name;
            const outputFormat = options.format === 'auto' ? 'webp' : options.format || 'webp';
            const outputPath = path.join(outputDir, `${nameWithoutExt}.${outputFormat}`);

            return compressImageServer(inputPath, outputPath, options);
        });

        return await Promise.all(compressionPromises);
    } catch (error) {
        return [
            {
                success: false,
                error: error instanceof Error ? error.message : 'Batch compression failed',
            },
        ];
    }
}

/**
 * Helper function to determine optimal format based on input
 */
const determineOptimalFormat = (inputFormat?: string): SupportedFormat => {
    if (!inputFormat) return 'webp';

    switch (inputFormat.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
            return 'jpeg';
        case 'png':
            return 'png';
        case 'gif':
            return 'webp'; // Convert GIF to WebP for better compression
        case 'tiff':
        case 'tif':
            return 'jpeg';
        default:
            return 'webp'; // Default to WebP for best compression
    }
};

/**
 * Apply format-specific compression settings
 */
const applyFormatCompression = (
    sharpInstance: any,
    format: SupportedFormat,
    options: {
        quality: number;
        progressive: boolean;
        mozjpeg: boolean;
        effort: number;
        compressionLevel: number;
    },
): any => {
    const { quality, progressive, mozjpeg, effort, compressionLevel } = options;

    switch (format) {
        case 'jpeg':
            return sharpInstance.jpeg({
                quality,
                progressive,
                mozjpeg,
            });

        case 'png':
            return sharpInstance.png({
                compressionLevel,
                progressive,
            });

        case 'webp':
            return sharpInstance.webp({
                quality,
                effort,
            });

        case 'avif':
            return sharpInstance.avif({
                quality,
                effort,
            });

        default:
            return sharpInstance.webp({
                quality,
                effort,
            });
    }
};

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
