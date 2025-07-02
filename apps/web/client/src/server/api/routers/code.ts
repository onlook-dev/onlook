import { applyCodeChange } from '@onlook/ai';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const codeRouter = createTRPCRouter({
    applyDiff: protectedProcedure
        .input(z.object({
            originalCode: z.string(),
            updateSnippet: z.string(),
            instruction: z.string()
        }))
        .mutation(async ({ input }): Promise<{ result: string | null, error: string | null }> => {
            try {
                const result = await applyCodeChange(input.originalCode, input.updateSnippet, input.instruction);
                if (!result) {
                    throw new Error('Failed to apply code change. Please try again.');
                }
                return {
                    result,
                    error: null,
                };
            } catch (error) {
                console.error('Failed to apply code change', error);
                return {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    result: null,
                };
            }
        }),
});