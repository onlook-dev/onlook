import { env } from '@/env';
import { FastApplyClient } from '@onlook/ai';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const codeRouter = createTRPCRouter({
    applyDiff: protectedProcedure
        .input(z.object({ originalCode: z.string(), updateSnippet: z.string() }))
        .mutation(async ({ ctx, input }): Promise<{ success: boolean, result: string, error?: string }> => {
            try {
                const applyDiffClient = new FastApplyClient(env.MORPH_API_KEY);
                const result = await applyDiffClient.applyCodeChange(input.originalCode, input.updateSnippet);
                if (!result) {
                    throw new Error('Failed to apply code change. Please try again.');
                }
                return {
                    success: true,
                    result,
                };
            } catch (error) {
                console.error('Failed to apply code change', error);
                return {
                    success: false,
                    result: '',
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }),
});