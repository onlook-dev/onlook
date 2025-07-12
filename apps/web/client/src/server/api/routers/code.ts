import { env } from '@/env';
import FirecrawlApp from '@mendable/firecrawl-js';
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
    scrapeUrl: protectedProcedure
        .input(z.object({
            url: z.string().url(),
            formats: z.array(z.enum(['markdown', 'html', 'json'])).default(['markdown']),
            onlyMainContent: z.boolean().default(true),
            includeTags: z.array(z.string()).optional(),
            excludeTags: z.array(z.string()).optional(),
            waitFor: z.number().optional(),
        }))
        .mutation(async ({ input }): Promise<{ result: string | null, error: string | null }> => {
            try {
                if (!env.FIRECRAWL_API_KEY) {
                    throw new Error('FIRECRAWL_API_KEY is not configured');
                }

                const app = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

                const result = await app.scrapeUrl(input.url, {
                    formats: input.formats,
                    onlyMainContent: input.onlyMainContent,
                    ...(input.includeTags && { includeTags: input.includeTags }),
                    ...(input.excludeTags && { excludeTags: input.excludeTags }),
                    ...(input.waitFor !== undefined && { waitFor: input.waitFor }),
                });

                if (!result.success) {
                    throw new Error(`Failed to scrape URL: ${result.error || 'Unknown error'}`);
                }

                // Return the primary content format (markdown by default)
                // or the first available format if markdown isn't available
                const content = result.markdown ?? result.html ?? JSON.stringify(result.json, null, 2);

                if (!content) {
                    throw new Error('No content was scraped from the URL');
                }

                return {
                    result: content,
                    error: null,
                };
            } catch (error) {
                console.error('Error scraping URL:', error);
                return {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    result: null,
                };
            }
        }),
});