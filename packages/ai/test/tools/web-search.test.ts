import { describe, it, expect } from 'bun:test';
import {
    WEB_SEARCH_TOOL_NAME,
    WEB_SEARCH_TOOL_PARAMETERS,
    webSearchTool,
} from '../../src/tools/web';
import { ASK_TOOL_SET, BUILD_TOOL_SET } from '../../src/tools/toolset';

describe('Web Search Tool', () => {
    it('should have the correct tool name and parameters', () => {
        expect(WEB_SEARCH_TOOL_NAME).toBe('web_search');
        expect(WEB_SEARCH_TOOL_PARAMETERS).toBeDefined();
        expect(webSearchTool).toBeDefined();
    });

    it('should be included in both buildToolSet and askToolSet', () => {
        expect(BUILD_TOOL_SET[WEB_SEARCH_TOOL_NAME]).toBeDefined();
        expect(ASK_TOOL_SET[WEB_SEARCH_TOOL_NAME]).toBeDefined();
        expect(BUILD_TOOL_SET[WEB_SEARCH_TOOL_NAME]).toBe(webSearchTool);
        expect(ASK_TOOL_SET[WEB_SEARCH_TOOL_NAME]).toBe(webSearchTool);
    });

    describe('parameter validation', () => {
        it('should validate minimal required input', () => {
            const minimalValid = {
                query: 'test search query',
            };

            const parsed = WEB_SEARCH_TOOL_PARAMETERS.parse(minimalValid);
            expect(parsed.query).toBe('test search query');
        });

        it('should validate all optional parameters', () => {
            const fullValid = {
                query: 'comprehensive search',
                allowed_domains: ['example.com'],
                blocked_domains: ['spam.com'],
            };

            const parsed = WEB_SEARCH_TOOL_PARAMETERS.parse(fullValid);
            expect(parsed.query).toBe('comprehensive search');
            expect(parsed.allowed_domains).toEqual(['example.com']);
            expect(parsed.blocked_domains).toEqual(['spam.com']);
        });

        it('should require query parameter', () => {
            const missing = {};

            expect(() => WEB_SEARCH_TOOL_PARAMETERS.parse(missing)).toThrow();
        });

        it('should require query to be at least 2 characters', () => {
            const tooShort = {
                query: 'a',
            };

            expect(() => WEB_SEARCH_TOOL_PARAMETERS.parse(tooShort)).toThrow();
        });
    });

    describe('tool definition', () => {
        it('should have appropriate description', () => {
            expect(webSearchTool.description).toContain('Search the web');
            expect(webSearchTool.description).toContain('up-to-date information');
        });

        it('should use the correct input schema', () => {
            expect(webSearchTool.inputSchema).toBe(WEB_SEARCH_TOOL_PARAMETERS);
        });
    });

    describe('edge cases', () => {
        it('should handle empty arrays for domain filters', () => {
            const input = {
                query: 'test',
                allowed_domains: [],
                blocked_domains: [],
            };

            const parsed = WEB_SEARCH_TOOL_PARAMETERS.parse(input);
            expect(parsed.allowed_domains).toEqual([]);
            expect(parsed.blocked_domains).toEqual([]);
        });

        it('should handle long query strings', () => {
            const longQuery = 'a'.repeat(1000);
            const input = {
                query: longQuery,
            };

            const parsed = WEB_SEARCH_TOOL_PARAMETERS.parse(input);
            expect(parsed.query).toBe(longQuery);
        });

        it('should handle special characters in query', () => {
            const specialQuery = 'search with "quotes" and symbols @#$%';
            const input = {
                query: specialQuery,
            };

            const parsed = WEB_SEARCH_TOOL_PARAMETERS.parse(input);
            expect(parsed.query).toBe(specialQuery);
        });
    });
});
