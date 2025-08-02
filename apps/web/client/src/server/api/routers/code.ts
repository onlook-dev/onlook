import { env } from '@/env';
import FirecrawlApp from '@mendable/firecrawl-js';
import Exa from 'exa-js';
import { applyCodeChange, SEARCH_WEB_CATEGORIES } from '@onlook/ai';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const codeRouter = createTRPCRouter({
    applyDiff: protectedProcedure
        .input(z.object({
            originalCode: z.string(),
            updateSnippet: z.string(),
            instruction: z.string(),
            metadata: z.object({
                projectId: z.string().optional(),
                conversationId: z.string().optional(),
            }).optional(),
        }))
        .mutation(async ({ input, ctx }): Promise<{ result: string | null, error: string | null }> => {
            try {
                const user = ctx.user;
                const metadata = {
                    ...input.metadata,
                    userId: user.id,
                };
                const result = await applyCodeChange(input.originalCode, input.updateSnippet, input.instruction, metadata);
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
    searchWeb: protectedProcedure
        .input(z.object({
            query: z.string().describe('The search query to find relevant web content.'),
            numResults: z.number().min(1).max(20).default(10).describe('Number of search results to return.'),
            type: z.enum(['neural', 'keyword', 'auto']).default('auto').describe('Search type.'),
            includeText: z.boolean().default(true).describe('Whether to include text content.'),
            category: z.enum(SEARCH_WEB_CATEGORIES).optional(),
            includeDomains: z.array(z.string()).optional(),
            excludeDomains: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input }): Promise<{ result: string | null, error: string | null }> => {
            try {
                if (!env.EXA_API_KEY) {
                    throw new Error('EXA_API_KEY is not configured');
                }

                const exa = new Exa(env.EXA_API_KEY);

                const searchOptions: Record<string, unknown> = {
                    type: input.type,
                    numResults: input.numResults,
                    contents: {
                        text: input.includeText,
                    },
                };

                if (input.category) {
                    searchOptions.category = input.category;
                }

                if (input.includeDomains && input.includeDomains.length > 0) {
                    searchOptions.includeDomains = input.includeDomains;
                }

                if (input.excludeDomains && input.excludeDomains.length > 0) {
                    searchOptions.excludeDomains = input.excludeDomains;
                }

                const result = await exa.searchAndContents(input.query, searchOptions);

                if (!result.results || result.results.length === 0) {
                    return {
                        result: JSON.stringify({
                            query: input.query,
                            results: [],
                            message: 'No results found for the given query.'
                        }, null, 2),
                        error: null,
                    };
                }

                interface ExaSearchResult {
                    autopromptString?: string;
                    searchTime?: number;
                    results: Array<{
                        title: string | null;
                        url: string;
                        text: string | null;
                        publishedDate: string | null;
                        author: string | null;
                        favicon: string | null;
                    }>;
                }

                const typedResult = result as ExaSearchResult;
                
                const formattedResults = {
                    query: input.query,
                    searchType: typedResult.autopromptString ? 'neural' : input.type,
                    results: result.results.map((item, index: number) => ({
                        index: index + 1,
                        title: item.title ?? '',
                        url: item.url ?? '',
                        text: item.text ?? '',
                        publishedDate: item.publishedDate ?? null,
                        author: item.author ?? null,
                        favicon: item.favicon ?? null,
                        summary: item.text ? `${item.text.substring(0, 200)}...` : null,
                    })),
                    totalResults: result.results.length,
                    searchTime: `${typedResult.searchTime ?? 0}ms`,
                };

                return {
                    result: JSON.stringify(formattedResults, null, 2),
                    error: null,
                };
            } catch (error) {
                console.error('Error searching web:', error);
                return {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    result: null,
                };
            }
        }),
});