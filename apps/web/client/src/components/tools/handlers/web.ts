import { api } from '@/trpc/client';
import {
    type SCRAPE_URL_TOOL_PARAMETERS,
    type WEB_SEARCH_TOOL_PARAMETERS
} from '@onlook/ai';
import type { WebSearchResult } from '@onlook/models';
import { type z } from 'zod';

export async function handleScrapeUrlTool(
    args: z.infer<typeof SCRAPE_URL_TOOL_PARAMETERS>,
): Promise<string> {
    try {
        const result = await api.code.scrapeUrl.mutate({
            url: args.url,
            formats: args.formats,
            onlyMainContent: args.onlyMainContent,
            includeTags: args.includeTags,
            excludeTags: args.excludeTags,
            waitFor: args.waitFor,
        });

        if (!result.result) {
            throw new Error(`Failed to scrape URL: ${result.error}`);
        }

        return result.result;
    } catch (error) {
        console.error('Error scraping URL:', error);
        throw new Error(`Failed to scrape URL ${args.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function handleWebSearchTool(
    args: z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>,
): Promise<WebSearchResult> {
    try {
        const res = await api.code.webSearch.mutate({
            query: args.query,
            allowed_domains: args.allowed_domains,
            blocked_domains: args.blocked_domains,
        });
        return res
    } catch (error) {
        console.error('Error searching web:', error);
        return {
            result: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
