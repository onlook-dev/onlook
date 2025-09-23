import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class GrepTool extends ClientTool {
    static readonly name = 'grep';
    static readonly description = 'Search for patterns in files using grep';
    static readonly parameters = z.object({
        pattern: z.string().describe('Pattern to search for'),
        path: z.string().optional().describe('File or directory to search in'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.MagnifyingGlass;

    constructor(
        private handleImpl?: (input: z.infer<typeof GrepTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof GrepTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('GrepTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof GrepTool.parameters>): string {
        if (input?.pattern) {
            const truncatedPattern = input.pattern.length > 30 
                ? input.pattern.substring(0, 30) + '...' 
                : input.pattern;
            return 'Searching for ' + truncatedPattern;
        }
        return 'Searching';
    }
}