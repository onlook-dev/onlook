import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class CheckErrorsTool extends ClientTool {
    static readonly name = 'check_errors';
    static readonly description = 'Check for errors in the project';
    static readonly parameters = z.object({
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.MagnifyingGlass;

    constructor(
        private handleImpl?: (input: z.infer<typeof CheckErrorsTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof CheckErrorsTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('CheckErrorsTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof CheckErrorsTool.parameters>): string {
        return 'Checking for errors';
    }
}