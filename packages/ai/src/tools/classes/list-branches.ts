import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class ListBranchesTool extends ClientTool {
    static readonly name = 'list_branches';
    static readonly description = 'List all available branches in the project';
    static readonly parameters = z.object({});
    static readonly icon = Icons.Branch;

    constructor(
        private handleImpl?: (input: z.infer<typeof ListBranchesTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof ListBranchesTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('ListBranchesTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof ListBranchesTool.parameters>): string {
        return 'Listing branches';
    }
}