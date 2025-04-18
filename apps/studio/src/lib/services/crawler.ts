import FirecrawlApp from '@mendable/firecrawl-js';

export interface CrawlOptions {
    limit?: number;
    scrapeOptions?: {
        formats?: (
            | 'markdown'
            | 'html'
            | 'rawHtml'
            | 'content'
            | 'links'
            | 'screenshot'
            | 'screenshot@fullPage'
            | 'extract'
            | 'json'
            | 'changeTracking'
        )[];
    };
}

export interface CrawlerResponse {
    success: boolean;
    error?: string;
    data: Array<{
        html?: string;
        markdown?: string;
    }>;
}

export interface CrawledContent {
    markdown?: string;
    html?: string;
}

export function validateCrawlerResponse(response: unknown): response is CrawlerResponse {
    if (!response || typeof response !== 'object') {
        return false;
    }

    if (!('success' in response) || typeof response.success !== 'boolean') {
        return false;
    }

    if (!('data' in response) || !Array.isArray(response.data)) {
        return false;
    }

    if (response.data.length === 0) {
        return false;
    }

    const firstItem = response.data[0];
    return (
        typeof firstItem === 'object' &&
        firstItem !== null &&
        ('html' in firstItem || 'markdown' in firstItem) &&
        (firstItem.html === undefined || typeof firstItem.html === 'string') &&
        (firstItem.markdown === undefined || typeof firstItem.markdown === 'string')
    );
}

export class CrawlerService {
    private static instance: CrawlerService;

    private app: FirecrawlApp;

    private constructor() {
        const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;
        if (!apiKey) {
            throw new Error(
                'VITE_FIRECRAWL_API_KEY is not defined. Please provide a valid API key.',
            );
        }
        this.app = new FirecrawlApp({ apiKey });
    }

    static getInstance(): CrawlerService {
        if (!this.instance) {
            this.instance = new CrawlerService();
        }
        return this.instance;
    }

    async crawlUrl(
        url: string,
        options: CrawlOptions = {
            limit: 100,
            scrapeOptions: {
                formats: ['markdown', 'html'],
            },
        },
    ) {
        try {
            const response = await this.app.crawlUrl(url, options);

            if (!response.success) {
                throw new Error(`Failed to crawl: ${response.error}`);
            }
            return response;
        } catch (error) {
            console.error('Error during crawling:', error);
            throw error;
        }
    }
}
