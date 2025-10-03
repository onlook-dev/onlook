import type { WebSearchResult } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class WebSearchTool extends ClientTool {
    static readonly toolName = 'web_search';
    static readonly description = 'Search the web for up-to-date information';
    static readonly parameters = z.object({
        query: z.string().min(2).describe('Search query'),
        allowed_domains: z.array(z.string()).optional().describe('Include only these domains'),
        blocked_domains: z.array(z.string()).optional().describe('Exclude these domains'),
    });
    static readonly icon = Icons.MagnifyingGlass;

    async handle(
        args: z.infer<typeof WebSearchTool.parameters>,
        editorEngine: EditorEngine,
    ): Promise<WebSearchResult> {
        try {
            const res = await editorEngine.api.webSearch({
                query: args.query,
                allowed_domains: args.allowed_domains,
                blocked_domains: args.blocked_domains,
            });
            return res
        } catch (error) {
            console.error('Error searching web:', error);
            return {
                result: [],
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    static getLabel(input?: z.infer<typeof WebSearchTool.parameters>): string {
        if (input?.query) {
            const truncatedQuery = input.query.length > 30
                ? input.query.substring(0, 30) + '...'
                : input.query;
            return `Searching "${truncatedQuery}"`;
        }
        return 'Searching web';
    }
}