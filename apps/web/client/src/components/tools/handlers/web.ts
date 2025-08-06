import { api } from '@/trpc/client';
import {
    SCRAPE_URL_TOOL_PARAMETERS,
    WEB_SEARCH_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

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
): Promise<string> {
    try {
        const result = await api.code.webSearch.mutate({
            query: args.query,
            allowed_domains: args.allowed_domains,
            blocked_domains: args.blocked_domains,
        });

        if (!result.result) {
            throw new Error(`Failed to search web: ${result.error}`);
        }

        return JSON.stringify({
            query: args.query,
            results: result.result
        });
    } catch (error) {
        console.error('Error searching web:', error);
        throw new Error(`Failed to search web for "${args.query}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
