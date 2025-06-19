import path from 'path';
import fs from 'node:fs/promises';
import sharp, { type Sharp } from 'sharp';
import type { CompressionOptions, CompressionResult, SupportedFormat } from './image-types';

export async function compressImageServer(
    input: string | Buffer,
    outputPath?: string,
    options: CompressionOptions = {},
): Promise<CompressionResult> {
    try {
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
        let sharpInstance = sharp(input);
        let originalSize: number | undefined;

        if (typeof input === 'string') {
            // Input is a file path
            const stats = await fs.stat(input);
            originalSize = stats.size;
        } else {
            // Input is a buffer
            originalSize = input.length;
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
                fit: keepAspectRatio ? sharp.fit.inside : sharp.fit.fill,
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
    sharpInstance: Sharp,
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
