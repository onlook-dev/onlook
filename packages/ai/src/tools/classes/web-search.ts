import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class WebSearchTool extends ClientTool {
    static readonly name = 'web_search';
    static readonly description = 'Search the web for up-to-date information';
    static readonly parameters = z.object({
        query: z.string().min(2).describe('Search query'),
        allowed_domains: z.array(z.string()).optional().describe('Include only these domains'),
        blocked_domains: z.array(z.string()).optional().describe('Exclude these domains'),
    });
    static readonly icon = Icons.MagnifyingGlass;

    constructor(
        private handleImpl?: (input: z.infer<typeof WebSearchTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof WebSearchTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('WebSearchTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof WebSearchTool.parameters>): string {
        if (input?.query) {
            const truncatedQuery = input.query.length > 30
                ? input.query.substring(0, 30) + '...'
                : input.query;
            return `Searching "${truncatedQuery}"`;
        }
        return 'Searching web';
    }
}