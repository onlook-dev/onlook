import { tool } from 'ai';
import { z } from 'zod';

export const SCRAPE_URL_TOOL_NAME = 'scrape_url';
export const SCRAPE_URL_TOOL_PARAMETERS = z.object({
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

export const scrapeUrlTool = tool({
    description:
        'Scrape a URL and extract its content in various formats (markdown, HTML, JSON). Can extract clean, LLM-ready content from any website, handling dynamic content and anti-bot mechanisms.',
    parameters: SCRAPE_URL_TOOL_PARAMETERS,
});
