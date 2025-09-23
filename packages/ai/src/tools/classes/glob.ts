import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class GlobTool extends ClientTool {
    static readonly name = 'glob';
    static readonly description = 'Search for files using glob patterns';
    static readonly parameters = z.object({
        pattern: z.string().describe('Glob pattern to match files'),
        path: z.string().optional().describe('Directory to search in'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.MagnifyingGlass;

    constructor(
        private handleImpl?: (input: z.infer<typeof GlobTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof GlobTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('GlobTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof GlobTool.parameters>): string {
        if (input?.pattern) {
            const truncatedPattern = input.pattern.length > 30 
                ? input.pattern.substring(0, 30) + '...' 
                : input.pattern;
            return 'Searching for ' + truncatedPattern;
        }
        return 'Searching';
    }
}