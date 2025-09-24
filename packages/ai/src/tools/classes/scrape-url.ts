import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class ScrapeUrlTool extends ClientTool {
    static readonly toolName = 'scrape_url';
    static readonly description = 'Scrape a URL and extract its content in various formats (markdown, HTML, JSON). Can extract clean, LLM-ready content from any website, handling dynamic content and anti-bot mechanisms.';
    static readonly parameters = z.object({
        url: z.url().describe('The URL to scrape. Must be a valid HTTP or HTTPS URL.'),
        formats: z
            .array(z.enum(['markdown', 'html', 'json']))
            .default(['markdown'])
            .describe('The formats to return the scraped content in. Defaults to markdown.'),
        onlyMainContent: z
            .boolean()
            .default(true)
            .describe(
                'Whether to only return the main content of the page, excluding navigation, ads, etc.',
            ),
        includeTags: z
            .array(z.string())
            .optional()
            .describe('Array of HTML tags to include in the scraped content.'),
        excludeTags: z
            .array(z.string())
            .optional()
            .describe('Array of HTML tags to exclude from the scraped content.'),
        waitFor: z
            .number()
            .optional()
            .describe('Time in milliseconds to wait for the page to load before scraping.'),
    });
    static readonly icon = Icons.Globe;

    async handle(
        args: z.infer<typeof ScrapeUrlTool.parameters>,
        editorEngine: EditorEngine,
    ): Promise<string> {
        try {
            const result = await editorEngine.api.scrapeUrl({
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

    getLabel(input?: z.infer<typeof ScrapeUrlTool.parameters>): string {
        if (input?.url) {
            try {
                return 'Visiting ' + (new URL(input.url).hostname || 'URL');
            } catch {
                return 'Visiting URL';
            }
        }
        return 'Visiting URL';
    }
}