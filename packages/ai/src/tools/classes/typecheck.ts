import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class TypecheckTool extends ClientTool {
    static readonly name = 'typecheck';
    static readonly description = 'Run TypeScript type checking';
    static readonly parameters = z.object({
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.MagnifyingGlass;

    constructor(
        private handleImpl?: (input: z.infer<typeof TypecheckTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof TypecheckTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('TypecheckTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof TypecheckTool.parameters>): string {
        return 'Checking types';
    }
}