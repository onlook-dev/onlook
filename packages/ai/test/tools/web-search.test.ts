import { describe, it, expect } from 'bun:test';
import {
    SEARCH_WEB_TOOL_NAME,
    SEARCH_WEB_TOOL_PARAMETERS,
    searchWebTool,
} from '../../src/tools/web';
import { askToolSet, buildToolSet } from '../../src/tools/tools';
import { SEARCH_WEB_CATEGORIES } from '../../src/tools/web';

describe('Web Search Tool', () => {
    it('should have the correct tool name and parameters', () => {
        expect(SEARCH_WEB_TOOL_NAME).toBe('search_web');
        expect(SEARCH_WEB_TOOL_PARAMETERS).toBeDefined();
        expect(searchWebTool).toBeDefined();
    });

    it('should be included in both buildToolSet and askToolSet', () => {
        expect(buildToolSet[SEARCH_WEB_TOOL_NAME]).toBeDefined();
        expect(askToolSet[SEARCH_WEB_TOOL_NAME]).toBeDefined();
        expect(buildToolSet[SEARCH_WEB_TOOL_NAME]).toBe(searchWebTool);
        expect(askToolSet[SEARCH_WEB_TOOL_NAME]).toBe(searchWebTool);
    });

    describe('parameter validation', () => {
        it('should validate minimal required input', () => {
            const minimalValid = {
                query: 'test search query',
            };

            const parsed = SEARCH_WEB_TOOL_PARAMETERS.parse(minimalValid);
            expect(parsed.query).toBe('test search query');
            expect(parsed.numResults).toBe(10);
            expect(parsed.type).toBe('auto');
            expect(parsed.includeText).toBe(true);
        });

        it('should validate all optional parameters', () => {
            const fullValid = {
                query: 'comprehensive search',
                numResults: 5,
                type: 'neural' as const,
                includeText: false,
                category: 'news' as (typeof SEARCH_WEB_CATEGORIES)[number],
                includeDomains: ['example.com'],
                excludeDomains: ['spam.com'],
            };

            const parsed = SEARCH_WEB_TOOL_PARAMETERS.parse(fullValid);
            expect(parsed.query).toBe('comprehensive search');
            expect(parsed.numResults).toBe(5);
            expect(parsed.type).toBe('neural');
            expect(parsed.includeText).toBe(false);
            expect(parsed.category).toBe('news');
            expect(parsed.includeDomains).toEqual(['example.com']);
            expect(parsed.excludeDomains).toEqual(['spam.com']);
        });

        it('should enforce numResults constraints', () => {
            const tooLow = {
                query: 'test',
                numResults: 0,
            };

            const tooHigh = {
                query: 'test',
                numResults: 25,
            };

            expect(() => SEARCH_WEB_TOOL_PARAMETERS.parse(tooLow)).toThrow();
            expect(() => SEARCH_WEB_TOOL_PARAMETERS.parse(tooHigh)).toThrow();
        });

        it('should validate search types', () => {
            const validTypes = ['neural', 'keyword', 'auto'];

            validTypes.forEach((type) => {
                const input = {
                    query: 'test',
                    type: type as 'neural' | 'keyword' | 'auto',
                };

                const parsed = SEARCH_WEB_TOOL_PARAMETERS.parse(input);
                expect(parsed.type).toBe(type as any);
            });

            const invalidType = {
                query: 'test',
                type: 'invalid',
            };

            expect(() => SEARCH_WEB_TOOL_PARAMETERS.parse(invalidType)).toThrow();
        });

        it('should validate category options', () => {
            const validCategories = [...SEARCH_WEB_CATEGORIES];

            validCategories.forEach((category) => {
                const input = {
                    query: 'test',
                    category: category as (typeof SEARCH_WEB_CATEGORIES)[number],
                };

                const parsed = SEARCH_WEB_TOOL_PARAMETERS.parse(input);
                expect(parsed.category).toBe(category as any);
            });
        });

        it('should require query parameter', () => {
            const missing = {};

            expect(() => SEARCH_WEB_TOOL_PARAMETERS.parse(missing)).toThrow();
        });
    });

    describe('tool definition', () => {
        it('should have appropriate description', () => {
            expect(searchWebTool.description).toContain('Search the web');
            expect(searchWebTool.description).toContain('Exa');
            expect(searchWebTool.description).toContain('AI-powered');
            expect(searchWebTool.description).toContain('current information');
        });

        it('should use the correct parameters schema', () => {
            expect(searchWebTool.parameters).toBe(SEARCH_WEB_TOOL_PARAMETERS);
        });
    });

    describe('edge cases', () => {
        it('should handle empty arrays for domain filters', () => {
            const input = {
                query: 'test',
                includeDomains: [],
                excludeDomains: [],
            };

            const parsed = SEARCH_WEB_TOOL_PARAMETERS.parse(input);
            expect(parsed.includeDomains).toEqual([]);
            expect(parsed.excludeDomains).toEqual([]);
        });

        it('should handle long query strings', () => {
            const longQuery = 'a'.repeat(1000);
            const input = {
                query: longQuery,
            };

            const parsed = SEARCH_WEB_TOOL_PARAMETERS.parse(input);
            expect(parsed.query).toBe(longQuery);
        });

        it('should handle special characters in query', () => {
            const specialQuery = 'search with "quotes" and symbols @#$%';
            const input = {
                query: specialQuery,
            };

            const parsed = SEARCH_WEB_TOOL_PARAMETERS.parse(input);
            expect(parsed.query).toBe(specialQuery);
        });
    });
});
