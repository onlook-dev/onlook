import { env } from '@/env';
import FirecrawlApp from '@mendable/firecrawl-js';
import { applyCodeChange } from '@onlook/ai';
import type { WebSearchResult, CloneWebsiteResult } from '@onlook/models';
import Exa from 'exa-js';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { initModel } from '@onlook/ai';
import { LLMProvider, ANTHROPIC_MODELS } from '@onlook/models';
import { generateObject } from 'ai';
import { CLONE_WEBSITE_DESIGN_PROMPT } from '@onlook/ai/src/prompt/clone';
import { DesignSchema } from '@onlook/models/tools';


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
    webSearch: protectedProcedure
        .input(z.object({
            query: z.string().min(2).describe('Search query'),
            allowed_domains: z.array(z.string()).optional().describe('Include only these domains'),
            blocked_domains: z.array(z.string()).optional().describe('Exclude these domains'),
        }))
        .mutation(async ({ input }): Promise<WebSearchResult> => {
            try {
                if (!env.EXA_API_KEY) {
                    throw new Error('EXA_API_KEY is not configured');
                }

                const exa = new Exa(env.EXA_API_KEY);

                const searchOptions: Record<string, unknown> = {
                    type: 'auto',
                    numResults: 10,
                    contents: {
                        text: true,
                    },
                };

                if (input.allowed_domains && input.allowed_domains.length > 0) {
                    searchOptions.includeDomains = input.allowed_domains;
                }

                if (input.blocked_domains && input.blocked_domains.length > 0) {
                    searchOptions.excludeDomains = input.blocked_domains;
                }

                const result = await exa.searchAndContents(input.query, searchOptions);

                if (!result.results || result.results.length === 0) {
                    return {
                        result: [],
                        error: null,
                    };
                }

                const formattedResults = result.results.map((item) => ({
                    title: item.title ?? '',
                    url: item.url ?? '',
                    text: item.text ?? '',
                    publishedDate: item.publishedDate ?? null,
                    author: item.author ?? null,
                }));

                return {
                    result: formattedResults,
                    error: null,
                };
            } catch (error) {
                console.error('Error searching web:', error);
                return {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    result: [],
                };
            }
        }),

    cloneWebsite: protectedProcedure
        .input(z.object({
            url: z.string().url(),
        }))
        .mutation(async ({ input }): Promise<CloneWebsiteResult> => {
            try {
                if (!env.FIRECRAWL_API_KEY) {
                    throw new Error('FIRECRAWL_API_KEY is not configured');
                }

                const app = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

                // Scrape the website with screenshot to get visual content
                const result = await app.scrapeUrl(input.url, {
                    formats: ['html', 'screenshot@fullPage', 'markdown'],
                    onlyMainContent: false,
                    waitFor: 2000,
                });
                const imageAssetsResult = await app.scrapeUrl(input.url, {
                    formats: ['markdown'],
                    onlyMainContent: false,
                    includeTags: ['img'],
                    waitFor: 2000,
                });

                if (!result.success) {
                    throw new Error(`Failed to clone website: ${result.error || 'Unknown error'}`);
                }
         
                let imageAssets: {
                    url: string;
                    title: string;
                }[] = [];
                if ('success' in imageAssetsResult && imageAssetsResult.success && imageAssetsResult.markdown) {
                    const md = imageAssetsResult.markdown;
                    const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                    let match: RegExpExecArray | null;
                    while ((match = mdImgRegex.exec(md)) !== null) {
                        const alt = (match[1] || '').trim();
                        const urlCandidate = match[2];
                        const title = alt ? alt.replace(/\s+/g, '-') : '';
                        if (!urlCandidate) continue;
                        try {
                            const absoluteUrl = new URL(urlCandidate, input.url).toString();
                            imageAssets.push({ url: absoluteUrl, title });
                        } catch {
                            imageAssets.push({ url: urlCandidate, title });
                        }
                    }
                } else if (result.html) {
                    // Fallback: parse from HTML if markdown not available
                    const imgTagRegex = /<img[^>]*>/gi;
                    const srcRegex = /src=["']([^"']+)["']/i;
                    const altRegex = /alt=["']([^"']*)["']/i;
                    let tagMatch: RegExpExecArray | null;
                    while ((tagMatch = imgTagRegex.exec(result.html)) !== null) {
                        const tag = tagMatch[0];
                        const srcMatch = srcRegex.exec(tag);
                        if (!srcMatch) continue;
                        const srcCandidate = srcMatch[1] ?? '';
                        const altMatch = altRegex.exec(tag);
                        const alt = (altMatch?.[1] ?? '').trim();
                        const title = alt ? alt.replace(/\s+/g, '-') : '';
                        try {
                            const absoluteUrl = new URL(srcCandidate, input.url).toString();
                            imageAssets.push({ url: absoluteUrl, title });
                        } catch {
                            imageAssets.push({ url: srcCandidate, title });
                        }
                    }
                }


                // Dedupe by URL
                
                const byUrl = new Map<string, { url: string; title: string }>();
                for (const asset of imageAssets) {
                    if (!byUrl.has(asset.url)) {
                        byUrl.set(asset.url, asset);
                    }
                }
                imageAssets = Array.from(byUrl.values());
                
          
                const { model, headers } = await initModel({
                    provider: LLMProvider.ANTHROPIC,
                    model: ANTHROPIC_MODELS.SONNET_4,
                });

                const { object } = await generateObject({
                    model,
                    headers,
                    schema: DesignSchema,
                    messages: [
                        {
                            role: 'system',
                            content: CLONE_WEBSITE_DESIGN_PROMPT,
                        },
                        {
                            role: 'user',
                            content: `HTML: ${result.html}
                            Markdown: ${result.markdown}
                            Screenshot: ${result.screenshot}`,
                        },
                    ],
                    maxOutputTokens: 10000,
                });

                const designDocument: z.infer<typeof DesignSchema> = object;

                return {
                    result: {
                        markdown: result.markdown || '',
                        html: result.html || '',
                        designScreenshot: result.screenshot || '',
                        designDocument: designDocument,
                        assets: imageAssets,
                    },
                    error: null,
                };
            } catch (error) {
                console.error('Error cloning website:', error);
                return {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    result: null,
                };
            }
        }),
});