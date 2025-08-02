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

export const SEARCH_WEB_TOOL_NAME = 'search_web';
export const SEARCH_WEB_CATEGORIES = [
    'company',
    'research',
    'news',
    'github',
    'pdf',
    'personal_site',
] as const;
export type SearchWebCategory = (typeof SEARCH_WEB_CATEGORIES)[number];

export const SEARCH_WEB_TOOL_PARAMETERS = z.object({
    query: z
        .string()
        .describe('The search query to find relevant web content. Be specific and descriptive.'),
    numResults: z
        .number()
        .min(1)
        .max(20)
        .default(10)
        .describe('Number of search results to return. Defaults to 10, maximum 20.'),
    type: z
        .enum(['neural', 'keyword', 'auto'])
        .default('auto')
        .describe(
            'Search type: neural (semantic), keyword (exact), or auto (best match). Defaults to auto.',
        ),
    includeText: z
        .boolean()
        .default(true)
        .describe('Whether to include the text content of the pages. Defaults to true.'),
    category: z
        .enum([...SEARCH_WEB_CATEGORIES])
        .optional()
        .describe('Optional category to filter search results to specific types of content.'),
    includeDomains: z
        .array(z.string())
        .optional()
        .describe('Optional list of domains to include in search results.'),
    excludeDomains: z
        .array(z.string())
        .optional()
        .describe('Optional list of domains to exclude from search results.'),
});

export const searchWebTool = tool({
    description:
        "Search the web for information using Exa's AI-powered search engine. Returns relevant results with content, sources, and metadata. Perfect for finding current information, research, or specific topics.",
    parameters: SEARCH_WEB_TOOL_PARAMETERS,
});
