import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class ScrapeUrlTool extends ClientTool {
    static readonly name = 'scrape_url';
    static readonly description = 'Scrape a URL and extract its content in various formats (markdown, HTML, JSON). Can extract clean, LLM-ready content from any website, handling dynamic content and anti-bot mechanisms.';
    static readonly parameters = z.object({
        url: z.string().url().describe('The URL to scrape. Must be a valid HTTP or HTTPS URL.'),
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

    constructor(
        private handleImpl?: (input: z.infer<typeof ScrapeUrlTool.parameters>, editorEngine: EditorEngine) => Promise<string>
    ) {
        super();
    }

    async handle(input: z.infer<typeof ScrapeUrlTool.parameters>, editorEngine: EditorEngine): Promise<string> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('ScrapeUrlTool.handle must be implemented by providing handleImpl in constructor');
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