import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';
import { ClientTool, type EditorEngine } from '../models/client';

export class TerminalCommandTool extends ClientTool {
    static readonly name = 'terminal_command';
    static readonly description = 'Run any generic Linux Bash command in the terminal';
    static readonly parameters = z.object({
        command: z.string().describe('The command to run'),
        branchId: z.string().optional().describe('The branch ID to operate on'),
    });
    static readonly icon = Icons.Terminal;

    constructor(
        private handleImpl?: (input: z.infer<typeof TerminalCommandTool.parameters>, editorEngine: EditorEngine) => Promise<any>
    ) {
        super();
    }

    async handle(input: z.infer<typeof TerminalCommandTool.parameters>, editorEngine: EditorEngine): Promise<any> {
        if (this.handleImpl) {
            return this.handleImpl(input, editorEngine);
        }
        throw new Error('TerminalCommandTool.handle must be implemented by providing handleImpl in constructor');
    }

    getLabel(input?: z.infer<typeof TerminalCommandTool.parameters>): string {
        return 'Terminal';
    }
}