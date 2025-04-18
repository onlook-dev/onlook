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

export class CrawlerService {
    private static intance: CrawlerService;

    private app: FirecrawlApp;

    private constructor() {
        this.app = new FirecrawlApp({ apiKey: process.env.VITE_FIRECRAWL_API_KEY });
    }

    static getInstance(): CrawlerService {
        if (!this.intance) {
            this.intance = new CrawlerService();
        }
        return this.intance;
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
