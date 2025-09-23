import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class BashEditTool extends ClientTool {
    static readonly name = 'bash_edit';
    static readonly description = 'Execute bash commands for file editing and system operations';
    static readonly parameters = z.object({
        command: z.string().describe('Bash command to execute for editing'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.Terminal;

    constructor(
        private handleImpl?: (input: z.infer<typeof BashEditTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof BashEditTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('BashEditTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof BashEditTool.parameters>): string {
        if (input?.command) {
            return 'Running command ' + (input.command.split(' ')[0] || '');
        }
        return 'Running command';
    }
}