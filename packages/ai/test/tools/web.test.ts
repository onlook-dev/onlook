import { describe, it, expect } from 'bun:test';
import {
    SCRAPE_URL_TOOL_NAME,
    SCRAPE_URL_TOOL_PARAMETERS,
    scrapeUrlTool,
} from '../../src/tools/web';
import { askToolSet, buildToolSet } from '../../src/tools/tools';

describe('Firecrawl Web Scraping Tool', () => {
    it('should have the correct tool name and parameters', () => {
        expect(SCRAPE_URL_TOOL_NAME).toBe('scrape_url');
        expect(SCRAPE_URL_TOOL_PARAMETERS).toBeDefined();
        expect(scrapeUrlTool).toBeDefined();
    });

    it('should be included in both buildToolSet and askToolSet', () => {
        expect(buildToolSet[SCRAPE_URL_TOOL_NAME]).toBeDefined();
        expect(askToolSet[SCRAPE_URL_TOOL_NAME]).toBeDefined();
        expect(buildToolSet[SCRAPE_URL_TOOL_NAME]).toBe(scrapeUrlTool);
        expect(askToolSet[SCRAPE_URL_TOOL_NAME]).toBe(scrapeUrlTool);
    });

    it('should have the correct parameter schema', () => {
        const params = SCRAPE_URL_TOOL_PARAMETERS;

        // Check required fields
        expect(params.shape.url).toBeDefined();
        expect(params.shape.formats).toBeDefined();
        expect(params.shape.onlyMainContent).toBeDefined();

        // Check optional fields
        expect(params.shape.includeTags).toBeDefined();
        expect(params.shape.excludeTags).toBeDefined();
        expect(params.shape.waitFor).toBeDefined();
    });

    it('should validate URL parameter correctly', () => {
        const validParams = {
            url: 'https://example.com',
            formats: ['markdown'],
            onlyMainContent: true,
        };

        const invalidParams = {
            url: 'not-a-url',
            formats: ['markdown'],
            onlyMainContent: true,
        };

        // Should parse valid params without throwing
        expect(() => SCRAPE_URL_TOOL_PARAMETERS.parse(validParams)).not.toThrow();

        // Should throw for invalid URL
        expect(() => SCRAPE_URL_TOOL_PARAMETERS.parse(invalidParams)).toThrow();
    });

    it('should have proper defaults for optional parameters', () => {
        const minimalParams = {
            url: 'https://example.com',
        };

        const parsed = SCRAPE_URL_TOOL_PARAMETERS.parse(minimalParams);

        expect(parsed.formats).toEqual(['markdown']);
        expect(parsed.onlyMainContent).toBe(true);
    });
});
