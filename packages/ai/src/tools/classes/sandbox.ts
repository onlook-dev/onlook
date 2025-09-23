import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class SandboxTool extends ClientTool {
    static readonly name = 'sandbox';
    static readonly description = 'Execute commands in a sandboxed environment';
    static readonly parameters = z.object({
        command: z.string().describe('Command to execute in sandbox'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.Cube;

    constructor(
        private handleImpl?: (input: z.infer<typeof SandboxTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof SandboxTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('SandboxTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof SandboxTool.parameters>): string {
        if (input?.command) {
            return 'Sandbox: ' + input.command;
        }
        return 'Sandbox';
    }
}