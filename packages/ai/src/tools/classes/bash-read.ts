import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class BashReadTool extends ClientTool {
    static readonly name = 'bash_read';
    static readonly description = 'Execute safe read-only bash commands';
    static readonly parameters = z.object({
        command: z.string().describe('The bash command to execute for reading'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.EyeOpen;

    constructor(
        private handleImpl?: (input: z.infer<typeof BashReadTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof BashReadTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('BashReadTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof BashReadTool.parameters>): string {
        if (input?.command) {
            return 'Reading with ' + (input.command.split(' ')[0] || '');
        }
        return 'Reading with bash';
    }
}