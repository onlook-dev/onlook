import { compressImageServer, type CompressionOptions, type CompressionResult } from '@onlook/image-server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

type TRPCCompressionResult = Omit<CompressionResult, 'buffer'> & {
    bufferData?: string; // base64 encoded buffer data
};

export const imageRouter = createTRPCRouter({
    compress: protectedProcedure
        .input(
            z.object({
                imageData: z.string(), // base64 encoded image data
                options: z.object({
                    quality: z.number().optional(),
                    width: z.number().optional(),
                    height: z.number().optional(),
                    format: z.enum(['jpeg', 'png', 'webp', 'avif', 'auto']).optional(),
                    progressive: z.boolean().optional(),
                    mozjpeg: z.boolean().optional(),
                    effort: z.number().optional(),
                    compressionLevel: z.number().optional(),
                    keepAspectRatio: z.boolean().optional(),
                    withoutEnlargement: z.boolean().optional(),
                }).optional(),
            }),
        )
        .mutation(async ({ input }): Promise<TRPCCompressionResult> => {
            try {
                const buffer = Buffer.from(input.imageData, 'base64');

                const result = await compressImageServer(
                    buffer,
                    undefined, // No output path - return buffer
                    input.options as CompressionOptions || {}
                );

                // Convert buffer to base64 for client transmission
                if (result.success && result.buffer) {
                    const { buffer: resultBuffer, ...restResult } = result;
                    return {
                        ...restResult,
                        bufferData: resultBuffer.toString('base64'),
                    };
                }

                const { buffer: resultBuffer, ...restResult } = result;
                return restResult;
            } catch (error) {
                console.error('Error compressing image:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown compression error',
                };
            }
        }),
}); 